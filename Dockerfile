# ---------- 1. Build Frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/client

# Install dependencies
COPY package*.json tsconfig*.json vite.config.ts components.json ./
RUN npm ci --omit=dev

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ---------- 2. Build Backend ----------
FROM python:3.11-slim AS backend
WORKDIR /app/server

# Install system deps for dlib + OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libopenblas-dev liblapack-dev libx11-dev \
    libgtk-3-dev libboost-python-dev libatlas-base-dev libjpeg-dev \
    zlib1g-dev libpng-dev && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ .

# Copy Haar cascade
RUN mkdir -p /usr/share/opencv4/haarcascades && \
    cp $(python -c "import cv2, pathlib; print(pathlib.Path(cv2._file_).parent/'data'/'haarcascade_frontalface_default.xml')") \
       /usr/share/opencv4/haarcascades/

# ---------- 3. Final Runtime ----------
FROM python:3.11-slim
WORKDIR /app

RUN pip install --no-cache-dir gunicorn && \
    apt-get update && apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

COPY --from=backend /app/server /app/server
COPY --from=backend /usr/share/opencv4/haarcascades /usr/share/opencv4/haarcascades
COPY --from=frontend /app/client/dist /app/server/static
COPY nginx.conf /etc/nginx/sites-enabled/default

ENV PYTHONPATH=/app/server
VOLUME /app/data
EXPOSE 80

CMD ["sh", "-c", "gunicorn -w 4 -k uvicorn.workers.UvicornWorker server.server:app --bind 0.0.0.0:8000 & nginx -g 'daemon off;'"]
