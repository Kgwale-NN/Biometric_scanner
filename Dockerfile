# Multi-stage Dockerfile for a monorepo: build the Vite frontend then build/run the Python FastAPI backend

# ---------- Stage 1: Build frontend ----------
FROM node:20-alpine AS node-build
WORKDIR /workspace/frontend

# Install dependencies (copy only package files first for better caching)
COPY package*.json tsconfig*.json vite.config.ts ./
RUN npm ci

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build


# ---------- Stage 2: Build runtime image (Python) ----------
FROM python:3.11-slim AS runtime
WORKDIR /app

# System dependencies needed for opencv/dlib/face-recognition and general builds
RUN apt-get update \
	&& apt-get install -y --no-install-recommends build-essential cmake libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 git curl \
	&& rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY api ./api

# Copy built frontend assets into backend static folder
COPY --from=node-build /workspace/frontend/dist ./api/static

ENV PORT=3000
EXPOSE 3000

# Use gunicorn with uvicorn worker for production-grade serving
CMD ["gunicorn", "api.server:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:$PORT"]
