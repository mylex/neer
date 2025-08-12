# Shared package Dockerfile for building shared utilities
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the shared package
RUN npm run build

# Create a minimal image with built artifacts
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built shared package
COPY --from=builder /app/dist ./dist

# This image is primarily used as a base for other services
CMD ["echo", "Shared package built successfully"]