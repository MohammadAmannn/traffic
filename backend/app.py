from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from yolov4 import detect_cars, _load_model
from algo import optimize_traffic

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = 'uploads'
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Pre-warm the YOLO model at startup so the first request
#    doesn't pay the model-load penalty (~5-15 s).
print('[app] Pre-loading YOLO model...')
_load_model()
print('[app] Ready.')


@app.route('/upload', methods=['POST'])
def upload_files():
    t_req = time.time()
    files = request.files.getlist('videos')

    if len(files) != 4:
        return jsonify({'error': 'Please upload exactly 4 videos'}), 400

    # ── 1. Save all files first ───────────────────────────────
    video_paths = []
    for i, file in enumerate(files):
        path = os.path.join(UPLOAD_DIR, f'video_{i}.mp4')
        file.save(path)
        video_paths.append(path)
    print(f'[app] Saved 4 videos in {time.time()-t_req:.1f}s')

    # ── 2. Run YOLO on all 4 videos IN PARALLEL ───────────────
    #    ThreadPoolExecutor works well here because OpenCV's DNN
    #    inference releases the GIL for the C++ portion, letting
    #    multiple threads actually run simultaneously on CPU.
    #    With frame_skip=3 and 320×320 input this is ~4× faster
    #    than sequential processing.
    t_yolo = time.time()
    num_cars_list = [None] * 4

    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {
            ex.submit(detect_cars, path): i
            for i, path in enumerate(video_paths)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                num_cars_list[idx] = future.result()
            except Exception as e:
                print(f'[app] Error on video {idx}: {e}')
                num_cars_list[idx] = 0

    print(f'[app] YOLO done in {time.time()-t_yolo:.1f}s  counts={num_cars_list}')

    # ── 3. Genetic-algorithm optimisation ────────────────────
    t_ga = time.time()
    result = optimize_traffic(num_cars_list)
    print(f'[app] GA done in  {time.time()-t_ga:.1f}s')
    print(f'[app] Total request time: {time.time()-t_req:.1f}s')

    return jsonify(result)


if __name__ == '__main__':
    # Use threaded=True so Flask can handle the parallel YOLO workers
    app.run(debug=False, threaded=True, port=5000)
