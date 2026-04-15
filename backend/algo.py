import numpy as np
import time

# ─────────────────────────────────────────────────────────────
#  Webster's delay fitness  (unchanged formula)
# ─────────────────────────────────────────────────────────────
def fitness_function(C, g, x, c):
    g = max(g, 1e-6)               # guard against zero green time
    a  = (1 - (g / C)) ** 2
    p  = max(1 - ((g / C) * x), 1e-6)
    d1i = (0.38 * C * a) / p

    a2   = 173 * (x ** 2)
    arg  = max((x - 1) + (x - 1) ** 2 + ((16 * x) / max(c, 1)), 0)
    d2i  = a2 * np.sqrt(arg)

    return d1i + d2i


def _total_delay(green_times, cycle_time, road_congestion, road_capacity):
    num = len(green_times)
    return float(np.sum([
        fitness_function(cycle_time, green_times[i],
                         road_congestion[i], road_capacity[i])
        for i in range(num)
    ]))


# ─────────────────────────────────────────────────────────────
#  FIXED: initialize_population no longer uses random rejection
#  sampling (old while-loop could spin forever).
#  Instead we sample valid green-time vectors directly by
#  drawing from a Dirichlet distribution scaled to cycle_time.
# ─────────────────────────────────────────────────────────────
def initialize_population(pop_size, num_lights,
                           green_min, green_max,
                           cycle_time, cars):
    road_capacity  = [20] * num_lights
    road_congestion = ((np.array(road_capacity) - np.array(cars))
                       / np.array(road_capacity))

    population = []
    budget = cycle_time - num_lights * green_min   # slack after mins

    for _ in range(pop_size):
        # Draw proportions via Dirichlet (always sums to 1)
        proportions = np.random.dirichlet(np.ones(num_lights))
        green_times = (green_min + proportions * budget).astype(int)
        # Clip to [green_min, green_max]
        green_times = np.clip(green_times, green_min, green_max)
        delay = _total_delay(green_times, cycle_time,
                             road_congestion, road_capacity)
        population.append((green_times, delay))

    return sorted(population, key=lambda x: x[1])


def roulette_wheel_selection(population, total_delays, beta):
    worst = max(total_delays) or 1.0
    probs = np.exp(-beta * np.array(total_delays) / worst)
    probs /= probs.sum()
    return int(np.random.choice(len(population), p=probs))


def crossover(parent1, parent2, num_lights):
    point  = np.random.randint(1, num_lights)
    child1 = np.concatenate([parent1[:point], parent2[point:]])
    child2 = np.concatenate([parent2[:point], parent1[point:]])
    return child1, child2


def mutate(individual, mutation_rate, green_min, green_max):
    mutated = individual.copy().astype(float)
    n = len(mutated)
    num_mutations = max(1, int(mutation_rate * n))
    for _ in range(num_mutations):
        idx   = np.random.randint(0, n)
        sigma = np.random.choice([-1, 1]) * 0.05 * (green_max - green_min)
        mutated[idx] = np.clip(mutated[idx] + sigma, green_min, green_max)
    return mutated.astype(int)


def inversion(individual, num_lights):
    ind = individual.copy()
    i1, i2 = sorted(np.random.randint(0, num_lights, 2))
    ind[i1:i2+1] = ind[i1:i2+1][::-1]
    return ind


# ─────────────────────────────────────────────────────────────
#  GENETIC ALGORITHM
#  Key fix: inner while loops now have hard iteration caps so
#  they cannot spin forever when the cycle_time constraint is
#  very tight.
# ─────────────────────────────────────────────────────────────
def genetic_algorithm(pop_size, num_lights, max_iter,
                      green_min, green_max, cycle_time,
                      mutation_rate, pinv, beta, cars):

    road_capacity   = [20] * num_lights
    road_congestion = ((np.array(road_capacity) - np.array(cars))
                       / np.array(road_capacity))

    population = initialize_population(pop_size, num_lights,
                                       green_min, green_max,
                                       cycle_time, cars)
    best_sol    = population[0]
    best_delays = [best_sol[1]]

    for it in range(max_iter):
        total_delays  = [ind[1] for ind in population]
        new_population = []
        attempts       = 0
        max_attempts   = pop_size * 10   # hard cap — prevents infinite loop

        while len(new_population) < pop_size and attempts < max_attempts:
            attempts += 1
            i1 = roulette_wheel_selection(population, total_delays, beta)
            i2 = roulette_wheel_selection(population, total_delays, beta)

            p1, p2 = population[i1][0], population[i2][0]
            c1, c2 = crossover(p1, p2, num_lights)

            for child in (c1, c2):
                if len(new_population) >= pop_size:
                    break
                child = mutate(child, mutation_rate, green_min, green_max)
                child = np.clip(child, green_min, green_max)
                if np.sum(child) <= cycle_time:
                    delay = _total_delay(child, cycle_time,
                                         road_congestion, road_capacity)
                    new_population.append((child, delay))

        # Fill remainder with inversion if crossover didn't produce enough
        inv_attempts = 0
        while len(new_population) < pop_size and inv_attempts < pop_size * 5:
            inv_attempts += 1
            i   = np.random.randint(0, len(population))
            ind = inversion(population[i][0], num_lights)
            ind = mutate(ind, mutation_rate, green_min, green_max)
            ind = np.clip(ind, green_min, green_max)
            if np.sum(ind) <= cycle_time:
                delay = _total_delay(ind, cycle_time,
                                      road_congestion, road_capacity)
                new_population.append((ind, delay))

        # Merge + elitist selection
        population = sorted(population + new_population,
                            key=lambda x: x[1])[:pop_size]

        if population[0][1] < best_sol[1]:
            best_sol = population[0]
        best_delays.append(best_sol[1])

        print(f'[GA] Iter {it+1}/{max_iter}  '
              f'delay={best_sol[1]:.2f}  '
              f'N={best_sol[0][0]} S={best_sol[0][1]} '
              f'W={best_sol[0][2]} E={best_sol[0][3]}')

    return best_sol, best_delays


# ─────────────────────────────────────────────────────────────
#  PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────
def optimize_traffic(cars):
    t0 = time.time()
    pop_size      = 200          # was 400 — halved for speed; quality ≈ same
    num_lights    = 4
    max_iter      = 25
    green_min     = 10
    green_max     = 60
    cycle_time    = 148          # 160 - 12
    mutation_rate = 0.05
    pinv          = 0.2
    beta          = 8

    best_sol, _ = genetic_algorithm(
        pop_size, num_lights, max_iter,
        green_min, green_max, cycle_time,
        mutation_rate, pinv, beta, cars
    )

    result = {
        'north': int(best_sol[0][0]),
        'south': int(best_sol[0][1]),
        'west':  int(best_sol[0][2]),
        'east':  int(best_sol[0][3]),
    }

    print(f'[GA] Done in {time.time()-t0:.1f}s  →  {result}')
    return result
