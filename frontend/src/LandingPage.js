import React, { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

/* ════════════════════════════════════
   ANIMATED CITY CANVAS
════════════════════════════════════ */
function CityCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── BUILDINGS ── */
    const createBuildings = () => {
      const buildings = [];
      const numBuildings = 18;
      for (let i = 0; i < numBuildings; i++) {
        const w = 40 + Math.random() * 60;
        const h = 80 + Math.random() * 200;
        buildings.push({
          x: (i / numBuildings) * W + Math.random() * 30,
          w,
          h,
          color: `hsl(${210 + Math.random() * 30}, 20%, ${8 + Math.random() * 8}%)`,
          accent: Math.random() > 0.5,
          windows: [],
          layer: Math.random() > 0.5 ? 0 : 1,
        });
        // windows
        const cols = Math.floor(w / 14);
        const rows = Math.floor(h / 18);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            buildings[buildings.length - 1].windows.push({
              on: Math.random() > 0.35,
              flicker: Math.random() > 0.9,
              timer: Math.random() * 200,
              col: c, row: r,
            });
          }
        }
      }
      return buildings;
    };

    /* ── CARS ── */
    const createCar = (lane, dir, W, H) => {
      const isH = lane < 2; // horizontal lanes
      const roadY1 = H * 0.62; // top horizontal road
      // lane positions
      const lanePositions = [roadY1 + 8, roadY1 + 26, W * 0.38, W * 0.55];
      const speed = 1.5 + Math.random() * 2.5;
      const colors = ['#ff3d5a', '#00e5ff', '#ffab00', '#00e676', '#a78bfa', '#fb923c', '#e2e8f0'];
      const carColor = colors[Math.floor(Math.random() * colors.length)];

      if (isH) {
        const goRight = lane === 0;
        return {
          isH: true, lane, dir: goRight ? 1 : -1,
          x: goRight ? -60 : W + 60,
          y: lanePositions[lane],
          w: 36 + Math.random() * 14, h: 16,
          speed, color: carColor, glow: carColor,
          tailLight: goRight ? '#ff3d5a' : '#ff3d5a',
          headLight: goRight ? '#fffde7' : '#fffde7',
        };
      } else {
        const goDown = lane === 2;
        return {
          isH: false, lane, dir: goDown ? 1 : -1,
          x: lanePositions[lane],
          y: goDown ? -60 : H + 60,
          w: 16, h: 36 + Math.random() * 14,
          speed, color: carColor, glow: carColor,
          tailLight: '#ff3d5a',
          headLight: '#fffde7',
        };
      }
    };

    /* ── TRAFFIC LIGHT STATE ── */
    // Traffic light phases are driven by lightPhase / lightTimer below

    /* ── PARTICLES ── */
    const particles = [];
    const addParticle = () => {
      particles.push({
        x: Math.random() * W, y: H * 0.3 + Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        life: 1, size: 1 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#00e676' : '#00e5ff',
      });
    };

    let buildings = createBuildings();
    let cars = [];
    let frame = 0;
    let lightPhase = 0; // 0=red 1=yellow 2=green
    let lightTimer = 0;
    const LIGHT_DURATIONS = [200, 60, 200]; // frames

    stateRef.current = { buildings, cars };

    // spawn initial cars
    for (let i = 0; i < 8; i++) {
      const lane = Math.floor(Math.random() * 4);
      cars.push(createCar(lane, 0, W, H));
    }

    const draw = () => {
      frame++;
      W = canvas.width;
      H = canvas.height;

      const roadY = H * 0.62;
      const roadX1 = W * 0.38;
      const roadX2 = W * 0.55;

      /* ── BACKGROUND SKY ── */
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#020408');
      sky.addColorStop(0.5, '#050c18');
      sky.addColorStop(1, '#0a1520');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* ── STARS ── */
      ctx.save();
      for (let s = 0; s < 80; s++) {
        const sx = ((s * 137.5) % W);
        const sy = ((s * 97.3) % (H * 0.5));
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(frame * 0.01 + s));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      /* ── BUILDINGS BACK LAYER ── */
      buildings.filter(b => b.layer === 0).forEach(b => {
        const bx = b.x % W;
        const by = roadY - b.h;
        ctx.fillStyle = b.color;
        ctx.fillRect(bx, by, b.w, b.h);

        // Rooftop accent
        if (b.accent) {
          ctx.fillStyle = 'rgba(0,230,118,0.15)';
          ctx.fillRect(bx, by, b.w, 3);
          // antenna
          ctx.strokeStyle = 'rgba(0,230,118,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + b.w / 2, by);
          ctx.lineTo(bx + b.w / 2, by - 20);
          ctx.stroke();
          // blinking light
          const blink = Math.sin(frame * 0.05 + b.x) > 0;
          ctx.fillStyle = blink ? '#ff3d5a' : 'transparent';
          ctx.beginPath();
          ctx.arc(bx + b.w / 2, by - 22, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Windows
        b.windows.forEach(w => {
          w.timer++;
          if (w.flicker && w.timer % 120 === 0) w.on = !w.on;
          if (w.on) {
            const wx = bx + 4 + w.col * 14;
            const wy = by + 10 + w.row * 18;
            if (wx + 8 < bx + b.w && wy + 10 < by + b.h) {
              const wGlow = ctx.createRadialGradient(wx + 4, wy + 5, 0, wx + 4, wy + 5, 10);
              wGlow.addColorStop(0, 'rgba(255,245,180,0.9)');
              wGlow.addColorStop(1, 'rgba(255,200,100,0)');
              ctx.fillStyle = wGlow;
              ctx.fillRect(wx - 2, wy - 2, 12, 14);
              ctx.fillStyle = 'rgba(255,240,160,0.85)';
              ctx.fillRect(wx, wy, 8, 10);
            }
          }
        });
      });

      /* ── CITY GLOW (horizon) ── */
      const glow = ctx.createLinearGradient(0, roadY - 60, 0, roadY);
      glow.addColorStop(0, 'transparent');
      glow.addColorStop(1, 'rgba(0,100,50,0.08)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, roadY - 60, W, 60);

      /* ── ROADS ── */
      // Horizontal road
      const roadH = 50;
      ctx.fillStyle = '#0e1520';
      ctx.fillRect(0, roadY, W, roadH);

      // Road edge lines
      ctx.strokeStyle = 'rgba(255,200,50,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([24, 16]);
      ctx.beginPath();
      ctx.moveTo(0, roadY + roadH / 2);
      ctx.lineTo(W, roadY + roadH / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Road borders
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, roadY); ctx.lineTo(W, roadY);
      ctx.moveTo(0, roadY + roadH); ctx.lineTo(W, roadY + roadH);
      ctx.stroke();

      // Vertical roads
      [roadX1, roadX2].forEach((rx, ri) => {
        const rw = 50;
        ctx.fillStyle = '#0e1520';
        ctx.fillRect(rx, 0, rw, H);

        // Center dashes
        ctx.strokeStyle = 'rgba(255,200,50,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([20, 14]);
        ctx.beginPath();
        ctx.moveTo(rx + rw / 2, 0);
        ctx.lineTo(rx + rw / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx, 0); ctx.lineTo(rx, H);
        ctx.moveTo(rx + rw, 0); ctx.lineTo(rx + rw, H);
        ctx.stroke();
      });

      /* ── INTERSECTION MARKINGS ── */
      [roadX1, roadX2].forEach(rx => {
        // Zebra crossing
        for (let z = 0; z < 5; z++) {
          ctx.fillStyle = `rgba(255,255,255,${0.04 + z * 0.01})`;
          ctx.fillRect(rx + 2, roadY + z * 10, 46, 8);
        }
      });

      /* ── TRAFFIC LIGHTS UPDATE ── */
      lightTimer++;
      if (lightTimer >= LIGHT_DURATIONS[lightPhase]) {
        lightTimer = 0;
        lightPhase = (lightPhase + 1) % 3;
      }
      const LIGHT_COLORS = ['#ff3d5a', '#ffab00', '#00e676'];

      // Draw traffic lights at intersections
      [roadX1, roadX2].forEach((rx) => {
        const tlX = rx - 18;
        const tlY = roadY - 55;

        // Post
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tlX + 8, tlY + 65);
        ctx.lineTo(tlX + 8, roadY);
        ctx.stroke();

        // Housing
        ctx.fillStyle = '#1e293b';
        roundRect(ctx, tlX, tlY, 16, 50, 4);
        ctx.fill();

        // Lights — use LIGHT_COLORS so the const is consumed
        LIGHT_COLORS.forEach((c, li) => {
          const isActive = li === lightPhase;
          ctx.beginPath();
          ctx.arc(tlX + 8, tlY + 10 + li * 15, 5, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? c : c + '33';
          ctx.fill();
          if (isActive) {
            ctx.shadowBlur = 14;
            ctx.shadowColor = c;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      });

      /* ── BUILDINGS FRONT LAYER ── */
      buildings.filter(b => b.layer === 1).forEach(b => {
        const bx = b.x % W;
        const by = roadY - b.h + 10;
        ctx.fillStyle = b.color;
        ctx.fillRect(bx, by, b.w, b.h);
        if (b.accent) {
          ctx.fillStyle = 'rgba(0,229,255,0.12)';
          ctx.fillRect(bx, by, b.w, 3);
        }
        b.windows.forEach(w => {
          if (w.on) {
            const wx = bx + 4 + w.col * 14;
            const wy = by + 10 + w.row * 18;
            if (wx + 8 < bx + b.w && wy + 10 < by + b.h) {
              ctx.fillStyle = 'rgba(255,240,160,0.7)';
              ctx.fillRect(wx, wy, 8, 10);
            }
          }
        });
      });

      /* ── ROAD GLOW ── */
      const roadGlow = ctx.createLinearGradient(0, roadY, 0, roadY + roadH);
      roadGlow.addColorStop(0, 'rgba(0,229,255,0.04)');
      roadGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = roadGlow;
      ctx.fillRect(0, roadY, W, roadH);

      /* ── CARS ── */
      // Spawn new cars occasionally
      if (frame % 90 === 0 && cars.length < 14) {
        const lane = Math.floor(Math.random() * 4);
        cars.push(createCar(lane, 0, W, H));
      }

      // Check light for vertical cars
      const lightStop = lightPhase === 0 || lightPhase === 1; // red or yellow = stop

      cars = cars.filter(car => {
        // Move
        if (car.isH) {
          car.x += car.dir * car.speed;
        } else {
          // vertical cars stop at red
          const atIntersection =
            car.y + car.h > roadY - 5 && car.y < roadY + 55;
          if (!(lightStop && atIntersection)) {
            car.y += car.dir * car.speed;
          }
        }

        // Remove if out of bounds
        if (car.isH) {
          if (car.dir === 1 && car.x > W + 80) return false;
          if (car.dir === -1 && car.x < -80) return false;
        } else {
          if (car.dir === 1 && car.y > H + 80) return false;
          if (car.dir === -1 && car.y < -80) return false;
        }

        // Draw car
        drawCar(ctx, car, frame);
        return true;
      });

      /* ── PARTICLES ── */
      if (frame % 8 === 0) addParticle();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.006;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.4;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      /* ── SCAN LINE OVERLAY ── */
      ctx.fillStyle = 'rgba(0,0,0,0.018)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="city-canvas" />;
}

/* ── Rounded Rect Helper ── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── Draw single car ── */
function drawCar(ctx, car, frame) {
  ctx.save();
  if (car.isH) {
    // Horizontal car
    const { x, y, w, h, color, dir } = car;
    // Body glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = color + '88';

    // Car body
    roundRect(ctx, x, y - h / 2, w, h, 4);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, color + 'cc');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Windows
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    ctx.fillRect(x + (dir === 1 ? w * 0.3 : w * 0.2), y - h / 2 + 2, w * 0.4, h - 4);

    // Headlights
    const hlX = dir === 1 ? x + w - 3 : x + 1;
    ctx.fillStyle = '#fffde7';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#fffde7';
    ctx.fillRect(hlX, y - h / 2 + 2, 3, 4);
    ctx.fillRect(hlX, y + 2, 3, 4);
    ctx.shadowBlur = 0;

    // Taillights
    const tlX = dir === 1 ? x : x + w - 3;
    ctx.fillStyle = '#ff3d5a';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff3d5a';
    ctx.fillRect(tlX, y - h / 2 + 2, 3, 4);
    ctx.fillRect(tlX, y + 2, 3, 4);
    ctx.shadowBlur = 0;

    // Headlight beam
    if (dir === 1) {
      const beam = ctx.createLinearGradient(x + w, y, x + w + 50, y);
      beam.addColorStop(0, 'rgba(255,253,200,0.12)');
      beam.addColorStop(1, 'transparent');
      ctx.fillStyle = beam;
      ctx.fillRect(x + w, y - 12, 55, 24);
    } else {
      const beam = ctx.createLinearGradient(x, y, x - 50, y);
      beam.addColorStop(0, 'rgba(255,253,200,0.12)');
      beam.addColorStop(1, 'transparent');
      ctx.fillStyle = beam;
      ctx.fillRect(x - 55, y - 12, 55, 24);
    }
  } else {
    // Vertical car
    const { x, y, w, h, color, dir } = car;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color + '88';

    roundRect(ctx, x - w / 2, y, w, h, 4);
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, color + 'cc');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Windows
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    ctx.fillRect(x - w / 2 + 2, y + (dir === 1 ? h * 0.25 : h * 0.1), w - 4, h * 0.4);

    // Lights
    const hlY = dir === 1 ? y + h - 3 : y;
    ctx.fillStyle = '#fffde7';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#fffde7';
    ctx.fillRect(x - w / 2 + 1, hlY, 4, 3);
    ctx.fillRect(x + w / 2 - 5, hlY, 4, 3);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

/* ════════════════════════════════════
   STATS TICKER
════════════════════════════════════ */
const STATS = [
  { val: '99.2%', lbl: 'Detection Accuracy', color: '#00e676' },
  { val: '<50ms',  lbl: 'Inference Time',      color: '#00e5ff' },
  { val: '400',   lbl: 'GA Population',        color: '#ffab00' },
  { val: '25x',   lbl: 'Faster Optimization',  color: '#7c4dff' },
  { val: 'YOLOv4',lbl: 'Neural Network',       color: '#00e676' },
  { val: 'Live',  lbl: 'Real-Time Feed',       color: '#ff3d5a' },
];

/* ════════════════════════════════════
   FEATURES
════════════════════════════════════ */
const FEATURES = [
  { icon: '🧬', title: 'Genetic Algorithm',  color: '#00e676', desc: 'Webster\'s delay formula with 400-individual population evolved over 25 iterations' },
  { icon: '🎯', title: 'YOLOv4 Detection',   color: '#00e5ff', desc: 'Real-time vehicle detection from 4 directional camera feeds simultaneously' },
  { icon: '⚡', title: 'Adaptive Timing',    color: '#ffab00', desc: 'Dynamic green-light durations optimized at every intersection cycle in milliseconds' },
  { icon: '📊', title: 'Visual Analytics',   color: '#7c4dff', desc: 'Live bar charts and downloadable PDF reports for traffic signal optimization results' },
];

/* ════════════════════════════════════
   LANDING PAGE
════════════════════════════════════ */
export default function LandingPage({ onEnter }) {
  const [entered, setEntered] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleEnter = () => {
    setEntered(true);
    setTimeout(onEnter, 800);
  };

  return (
    <div className={`landing-root ${entered ? 'landing-exit' : ''}`}>
      <CityCanvas />

      {/* Multi-layer overlay */}
      <div className="landing-overlay" />

      {/* ── TOP NAV ── */}
      <header className="landing-header">
        <div className="lh-logo">
          <span className="lh-icon">🚦</span>
          <span className="lh-brand">FlowAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="lh-badge" style={{ borderColor: 'rgba(0,229,255,0.3)', color: '#00e5ff', background: 'rgba(0,229,255,0.06)' }}>

          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <main className="landing-hero">
        <div className="hero-tag">AI-Powered Traffic Management System</div>

        <h1 className="hero-title">
          <span className="ht-line1">Intelligent</span>
          <span className="ht-line2">Traffic Control</span>
          <span className="ht-line3">at Urban Scale</span>
        </h1>

        <p className="hero-sub">
          Leverage <strong style={{ color: '#00e676', fontWeight: 700 }}>genetic algorithms</strong> and
          real-time computer vision to compute optimal signal timings,
          reduce congestion, and transform urban mobility in milliseconds.
        </p>

        {/* CTA Actions */}
        <div className="hero-actions">
          <button
            className="btn-enter"
            id="enter-dashboard-btn"
            onClick={handleEnter}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label="Launch the FlowAI Dashboard"
          >
            <span className="btn-enter-text">Launch Dashboard</span>
            <span className="btn-enter-arrow">{hovered ? '⚡' : '→'}</span>
          </button>

          <div className="hero-live-badge">
            <span className="live-dot" />
            Live AI Processing
          </div>
        </div>

        {/* Stats strip */}
        <div className="stats-row">
          {STATS.map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-val" style={{ color: s.color, textShadow: `0 0 18px ${s.color}66` }}>
                {s.val}
              </div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ── FEATURES STRIP ── */}
      <div className="features-strip">
        {FEATURES.map((f, i) => (
          <div
            className="feat-card"
            key={i}
            style={{ animationDelay: `${1.1 + i * 0.12}s` }}
          >
            <div className="feat-icon">{f.icon}</div>
            <div className="feat-title" style={{ color: f.color }}>{f.title}</div>
            <div className="feat-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Scroll cue */}
      <div className="scroll-cue">
        <div className="sc-line" />
      </div>
    </div>
  );
}
