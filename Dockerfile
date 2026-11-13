FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install libc6-compat for Alpine Linux compatibility
RUN apk add --no-cache libc6-compat

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build Next.js application
RUN npm run build

# Ensure persistent data directory exists
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
