FROM oven/bun:1-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

USER bun

CMD ["bun", "src/index.ts"]
