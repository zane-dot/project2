FROM node:20-alpine AS deps
WORKDIR /app
# better-sqlite3 needs build tools on alpine
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DB_FILE=/data/jobtrack.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /data
EXPOSE 3001
CMD ["node", "index.js"]
