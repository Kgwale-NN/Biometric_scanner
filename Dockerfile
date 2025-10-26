# Multi-stage Dockerfile for building and serving a Vite React app

# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json tsconfig*.json ./
RUN npm ci
RUN npm install -D vite @vitejs/plugin-react-swc

# Copy source and config files
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Production image - use a small static server
FROM node:20-alpine AS prod
WORKDIR /app

# Install a tiny static file server globally
RUN npm install -g serve@14.1.2

# Copy built assets from build stage
COPY --from=build /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

# Use the PORT environment variable provided by Railway at runtime
CMD ["sh", "-c", "serve -s dist -l $PORT"]
