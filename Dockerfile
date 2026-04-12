FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

ENV MCP_TRANSPORT=http
ENV MCP_PORT=3100
ENV TOKEN_DIR=/data/tokens
EXPOSE 3100
VOLUME ["/data/tokens"]

CMD ["node", "dist/src/index.js"]
