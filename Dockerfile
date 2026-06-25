# Hospital Management System - Production Dockerfile

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and patches (patches must be present before pnpm install
# because pnpm.patchedDependencies references patches/wouter@3.7.1.patch)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install all dependencies (including devDependencies needed for the build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (vite build -> dist/public, esbuild -> dist/index.js)
RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files and patches (patches required for pnpm install --prod too)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
# dist/index.js  = bundled server
# dist/public/    = built client (Vite output)
COPY --from=builder /app/dist ./dist

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Railway sets PORT dynamically; healthcheck must respect it
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://127.0.0.1:' + port + '/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

# Expose default port (Railway overrides with PORT env var)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
