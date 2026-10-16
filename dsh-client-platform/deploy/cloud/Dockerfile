FROM node:24.18.0-bookworm-slim

ENV NODE_ENV=production \
    DSH_CLOUD_HOST=0.0.0.0 \
    DSH_CLOUD_PORT=8791 \
    DSH_CLOUD_DATABASE=/data/cloud.sqlite3 \
    DSH_CLOUD_ARTIFACT_ROOT=/data/artifacts \
    DSH_CLOUD_INTENT_KEY_FILE=/data/intent-ed25519.pem

WORKDIR /app
COPY package.json ./package.json
COPY apps/cloud-api ./apps/cloud-api
COPY apps/cloud-web ./apps/cloud-web
COPY packages/contracts ./packages/contracts
COPY deploy/cloud/proxy-auth.js ./deploy/cloud/proxy-auth.js
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 8791
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8791/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/cloud-api/src/server.js"]
