FROM rust:1.89-bookworm AS core-builder

WORKDIR /repo/agent-core
COPY agent-core/Cargo.toml agent-core/Cargo.lock ./
COPY agent-core/src ./src
RUN cargo build --release

FROM node:24-bookworm-slim AS ts-builder

WORKDIR /repo/agent-ts
COPY agent-ts/package.json agent-ts/package-lock.json ./
RUN npm ci
COPY agent-ts/tsconfig.json ./
COPY agent-ts/src ./src
RUN npm run build

FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    AGENT_API_HOST=0.0.0.0 \
    AGENT_API_PORT=8001 \
    AGENT_CORE_PATH=/app/agent-core

WORKDIR /app
COPY --from=core-builder /repo/agent-core/target/release/agent-core /app/agent-core
COPY --from=ts-builder /repo/agent-ts/dist /app/dist
COPY agent-ts/package.json /app/package.json

EXPOSE 8001

CMD ["node", "dist/main.js"]
