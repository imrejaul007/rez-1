FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc* ./
# .npmrc has legacy-peer-deps=true to work around transitive peer-dep mismatches
RUN npm ci --legacy-peer-deps || npm ci
COPY tsconfig.json ./
COPY src ./src
# OpenAPI spec is loaded at runtime from ./docs/openapi.yaml
COPY docs ./docs
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini curl
COPY package*.json .npmrc* ./
RUN npm ci --omit=dev --legacy-peer-deps || npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Copy OpenAPI spec needed at runtime
COPY --from=builder /app/docs ./docs
USER node
EXPOSE 4002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:4002/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
