import cv2 as cv
import time
from collections import deque
import numpy as np
from scipy.signal import find_peaks

def detect_cars(video_file):
    # Set thresholds
    Conf_threshold = 0.4
    NMS_threshold = 0.4

    # Define colors for different classes
    COLORS = [(0, 255, 0), (0, 0, 255), (255, 0, 0), 
              (255, 255, 0), (255, 0, 255), (0, 255, 255)]

    # Load class names from file
    class_name = []
    with open('classes.txt', 'r') as f:
        class_name = [cname.strip() for cname in f.readlines()]

    # Load the network
    net = cv.dnn.readNet('yolov4-tiny.weights', 'yolov4-tiny.cfg')

    # Auto-detect GPU/CUDA — fall back to CPU if CUDA is not available
    try:
        net.setPreferableBackend(cv.dnn.DNN_BACKEND_CUDA)
        net.setPreferableTarget(cv.dnn.DNN_TARGET_CUDA)
        # Quick test to validate CUDA works on this system
        test_blob = cv.dnn.blobFromImage(
            np.zeros((416, 416, 3), dtype=np.uint8), 1/255, (416, 416)
        )
        net.setInput(test_blob)
        net.forward()
        print('[YOLOv4] Using CUDA GPU backend.')
    except Exception:
        net.setPreferableBackend(cv.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv.dnn.DNN_TARGET_CPU)
        print('[YOLOv4] CUDA not available — using CPU backend.')

    # Initialize the detection model
    model = cv.dnn_DetectionModel(net)
    model.setInputParams(size=(416, 416), scale=1/255, swapRB=True)

    # Open the video file
    cap = cv.VideoCapture(video_file)
    starting_time = time.time()
    frame_counter = 0

    # Running headless as a Flask API — no display window needed

    # To keep track of car counts and timestamps
    car_counts = deque()  # Store (timestamp, car_count) tuples

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_counter += 1

        # Perform detection
        classes, scores, boxes = model.detect(frame, Conf_threshold, NMS_threshold)

        # Count the number of cars detected
        car_count = 0
        for (classid, score, box) in zip(classes, scores, boxes):
            if class_name[classid] == "car":  # assuming 'car' is the class name for cars in your classes.txt
                car_count += 1
                color = COLORS[int(classid) % len(COLORS)]
                label = f"{class_name[classid]} : {score:.2f}"
                cv.rectangle(frame, box, color, 2)
                cv.putText(frame, label, (box[0], box[1]-10), 
                           cv.FONT_HERSHEY_COMPLEX, 0.5, color, 2)

        # Record the car count with the current timestamp
        current_time = time.time()
        car_counts.append((current_time, car_count))
        
        # Remove counts that are older than 30 seconds
        while car_counts and car_counts[0][0] < current_time - 30:
            car_counts.popleft()

        # Extract the car counts from the deque
        car_count_values = [count for _, count in car_counts]

        # Find peaks in the car count values
        peaks, _ = find_peaks(car_count_values)

        # Calculate the mean of the peak values
        if len(peaks) > 0:
            mean_peak_value = np.mean([car_count_values[i] for i in peaks])
        else:
            mean_peak_value = 0

        # Calculate and display FPS
        ending_time = time.time()
        fps = frame_counter / (ending_time - starting_time)
        cv.putText(frame, f'FPS: {fps:.2f}', (20, 50), 
                   cv.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 0), 2)
        
        # Display the mean peak value on the frame
        cv.putText(frame, f'Mean Peak Cars : {mean_peak_value:.2f}', (20, 80), 
                   cv.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 255), 2)

        # Headless mode — no GUI display in Flask backend

    # Release the video capture
    cap.release()

    # Return the mean of the peak values
    return mean_peak_value

# Usage example:
#mean_peak_value = detect_cars('output.avi')
#print(f'Mean Peak Number of Cars Detected: {mean_peak_value}')