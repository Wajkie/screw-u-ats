# Build context: monorepo root
# docker build -f screener-api/Dockerfile -t screener-api .

FROM node:22-slim AS builder

WORKDIR /app

# Install screener-api dependencies
COPY screener-api/package.json screener-api/package-lock.json ./screener-api/
RUN cd screener-api && npm ci

# Copy TypeScript source — API + root MCP tools (cross-package import)
COPY src/ ./src/
COPY screener-api/src/ ./screener-api/src/
COPY screener-api/tsconfig.json ./screener-api/

# Compile
RUN cd screener-api && npm run build

# Prune dev deps before copying to runtime image
RUN cd screener-api && npm prune --omit=dev

# ---- runtime ----
FROM node:22-slim

WORKDIR /app/screener-api

COPY --from=builder /app/screener-api/dist ./dist
COPY --from=builder /app/screener-api/node_modules ./node_modules

# Role definition files — accessible as /app/knowledge/roles
COPY knowledge/ /app/knowledge/

ENV NODE_ENV=production
ENV ROLES_DIR=/app/knowledge/roles

EXPOSE 4001

CMD ["node", "dist/screener-api/src/index.js"]
