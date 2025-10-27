# ---------- 1. Build Frontend ----------
# Uses a Node.js image to build your frontend application
FROM node:20-alpine AS frontend
WORKDIR /app/client

# Copy package.json and install dependencies
# This caches dependencies, speeding up builds if package.json doesn't change
COPY package*.json tsconfig*.json vite.config.ts components.json ./
RUN npm ci

# Copy the rest of the frontend source code and build for production
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ---------- 2. Build Backend ----------
# Uses a Python image to set up your backend application
FROM python:3.11-slim AS backend
WORKDIR /app/server

# Install system dependencies required for dlib (face_recognition) and OpenCV
# This step can take some time due to compiling these libraries.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libopenblas-dev liblapack-dev libx11-dev \
    libgtk-3-dev libboost-python-dev libatlas-base-dev libjpeg-dev \
    zlib1g-dev libpng-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them
# This will include google-cloud-firestore and google-cloud-storage once you add them
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source code into the working directory
COPY api/ .

# Copy Haar cascade XML file for OpenCV.
# Ensure 'haarcascade_frontalface_default.xml' is in your 'api/' directory.
# This makes it reliably available for OpenCV within the container.
RUN mkdir -p /usr/share/opencv4/haarcascades
COPY api/haarcascade_frontalface_default.xml /usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml

# ---------- 3. Final Runtime ----------
# This stage is optimized for running the application.
# It starts from the backend build stage, so all Python packages are present.
FROM backend
WORKDIR /app

# Install Gunicorn, which will serve your FastAPI application
RUN pip install --no-cache-dir gunicorn

# Copy the built frontend static files from the 'frontend' stage
# These files will be served directly by FastAPI's StaticFiles in your app.py
COPY --from=frontend /app/client/dist /app/server/static

# Set Python path to include your backend application directory
ENV PYTHONPATH=/app/server

# Remove the VOLUME declaration.
# Cloud Run containers are ephemeral; persistent data must be stored externally
# in services like Cloud Firestore and Cloud Storage.
# VOLUME /app/data # <-- REMOVED

# Expose the port. Cloud Run typically listens on 8080 by default.
EXPOSE 8080

# Command to run your FastAPI application using Gunicorn.
# Cloud Run injects the 'PORT' environment variable, which your app must listen on.
# 'server:app' assumes your FastAPI app instance 'app' is in 'server.py'
# within the directory specified by PYTHONPATH (/app/server).
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "server:app", "--bind", "0.0.0.0:$PORT"]
