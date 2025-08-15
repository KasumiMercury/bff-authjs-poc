FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

ENV PORT 3000

# Start development server with hot reload
CMD ["pnpm", "dev"]