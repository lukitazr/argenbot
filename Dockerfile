# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14-debian

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