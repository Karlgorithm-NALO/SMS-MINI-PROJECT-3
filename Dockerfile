FROM node:22-bookworm-slim

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies required for build: tailwind, typescript)
RUN npm ci

# Copy application source code (excluding node_modules, .next, .env via .dockerignore)
COPY . .

# Build Next.js application
RUN npm run build

# Ensure persistent data directory exists for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
