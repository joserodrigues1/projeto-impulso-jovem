FROM node:20-alpine AS builder

WORKDIR /app

# Ferramentas de compilação para eventuais dependências com node-gyp. O hash de senha usa
# hash-wasm (argon2id em WebAssembly), sem binário nativo — não adicione pacotes nativos.
RUN apk add --no-cache python3 make g++

# Dependências primeiro (aproveita o cache). `npm ci` exige o package-lock.json atualizado.
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Gera o Prisma Client
RUN npx prisma generate

# Copia o restante do código
COPY . .

# Compila a aplicação NestJS
RUN npm run build

# Imagem final
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3333

# Sobe a API (o deploy roda `npx prisma db push` depois, dentro do container)
CMD ["npm", "run", "start:prod"]
