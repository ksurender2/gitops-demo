# =======================================================
# Stage 1: Build Dependencies
# =======================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests for efficient Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# =======================================================
# Stage 2: Minimal Production Runtime
# =======================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production node environment
ENV NODE_ENV=production \
    PORT=3000

# Copy installed dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy application source code & static dashboard assets
COPY app.js ./
COPY public ./public

# Use security best practice: run container as non-root user 'node'
USER node

# Expose default application port
EXPOSE 3000

# Native Docker container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the Node.js application
CMD ["node", "app.js"]
