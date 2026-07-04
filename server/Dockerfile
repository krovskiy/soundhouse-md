# ---- build frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- backend deps ----
FROM node:22-alpine AS backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# ---- final runtime ----
FROM node:22-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=backend /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=frontend /app/dist ./dist

RUN mkdir -p /app/media/img /app/media/audio && chown -R app:app /app/media

USER app
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "index.js"]
