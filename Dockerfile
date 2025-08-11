# Étape de build
FROM node:18-alpine AS builder
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app/ ./

# Étape finale
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 5000
CMD ["node", "server.js"]