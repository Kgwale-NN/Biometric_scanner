# ---------- 1. Build Frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/client

# Install dependencies (include devDependencies required for the Vite build)
COPY package*.json tsconfig*.json vite.config.ts components.json ./
RUN npm ci

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

# Copy Haar cascade (use the bundled file in the repo to avoid fragile python lookups)
RUN mkdir -p /usr/share/opencv4/haarcascades
COPY api/haarcascade_frontalface_default.xml /usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml

# ---------- 3. Final Runtime ----------
# Use the backend stage as the runtime base so installed Python packages are present
FROM backend
WORKDIR /app

# Install runtime requirements (gunicorn) and nginx for serving static + proxy
RUN pip install --no-cache-dir gunicorn && \
    apt-get update && apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

# Copy the built frontend into the backend static folder
COPY --from=frontend /app/client/dist /app/server/static
COPY nginx.conf /etc/nginx/sites-enabled/default

ENV PYTHONPATH=/app/server
VOLUME /app/data
EXPOSE 80

CMD ["sh", "-c", "gunicorn -w 4 -k uvicorn.workers.UvicornWorker server.server:app --bind 0.0.0.0:8000 & nginx -g 'daemon off;'"]
