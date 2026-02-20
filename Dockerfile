# Use a lightweight Node 20 base image
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm install

# Copy source
COPY src ./src
COPY tsconfig.json ./
COPY config.example.json ./
COPY .env.example ./

# Build TypeScript and remove dev deps
RUN npm run build && npm prune --omit=dev

CMD ["npm", "start"]
