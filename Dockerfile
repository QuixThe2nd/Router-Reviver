FROM oven/bun:1 as base
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/QuixThe2nd/Router-Reviver.git .
RUN bun install
CMD ["bun", "src/index.ts"]