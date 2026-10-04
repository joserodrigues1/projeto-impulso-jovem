FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate prisma client
RUN npx prisma generate

# Copy the rest of the code
COPY . .

# Build the NestJS application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3333

# Start the application
CMD ["npm", "run", "start:prod"]
