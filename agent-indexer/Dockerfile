FROM rust:1.89-bookworm AS builder

WORKDIR /repo/agent-indexer
COPY agent-indexer/Cargo.toml agent-indexer/Cargo.lock* ./
COPY agent-indexer/src ./src
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /repo/agent-indexer/target/release/agent-indexer /usr/local/bin/agent-indexer
WORKDIR /app
ENTRYPOINT ["/usr/local/bin/agent-indexer"]

