# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-debian

RUN apt-get update && apt-get install --no-install-recommends -y \
    python3 \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Needed at build time for `prisma generate`
ENV DATABASE_URL=file:/app/db.db

# Copy package and lock files
COPY package.json ./
COPY bun.lock ./
# COPY .env .env

# Install project dependencies
RUN bun install --production

# Copy source code
COPY . .

# Generate Prisma Client
RUN bunx prisma generate --schema=models/schema.prisma

# Run the bot
CMD ["bun", "run", "start"]