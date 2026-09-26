# Production Dockerfile for IP-SAKTI Sahayak Full-Stack Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build Vite frontend and Express server bundle
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and package files
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create persistent storage directories for ChromaDB and PostgreSQL
RUN mkdir -p /app/data/chroma_db /app/data/postgres_db /app/data/uploads

EXPOSE 3000

CMD ["npm", "run", "start"]
