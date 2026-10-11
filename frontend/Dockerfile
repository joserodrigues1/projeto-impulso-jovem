FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Pass build arg to env
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_API_URL=$API_INTERNAL_URL

# Build the Next.js app
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Only copy what's needed for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Envolve o server.js do standalone para repassar o IP real do usuário à API (ver o arquivo)
COPY --from=builder /app/servidor-producao.js ./

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "servidor-producao.js"]
