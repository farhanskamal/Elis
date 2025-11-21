# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
# Install dependencies and OpenSSL for Prisma
RUN apk add --no-cache openssl
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client and Build
RUN npm run db:generate
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
# Install production dependencies and OpenSSL
RUN apk add --no-cache openssl postgresql-client
RUN npm ci --only=production
RUN npm install -g tsx

# Create backups directory
RUN mkdir -p /app/backups

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose port
EXPOSE 3001

# Start command (migrate and start)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
