FROM node:20-alpine

RUN npm install -g pnpm@10.6.0

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY apps/server/ apps/server/

# Create stub package.json files for workspace apps not needed in this image
# so pnpm can resolve the workspace without them
RUN mkdir -p apps/web apps/native apps/legg-web && \
    echo '{"name":"web","version":"0.0.1","private":true}' > apps/web/package.json && \
    echo '{"name":"native","version":"0.0.1","private":true}' > apps/native/package.json && \
    echo '{"name":"legg-web","version":"0.0.1","private":true}' > apps/legg-web/package.json

RUN pnpm install --no-frozen-lockfile

EXPOSE 3001

WORKDIR /app/apps/server

CMD ["node_modules/.bin/tsx", "src/index.ts"]
