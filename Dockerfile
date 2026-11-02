# AEGENTIX Prosurance
FROM node:24-alpine AS web
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY server/ ./server/
COPY --from=web /app/client/dist ./client/dist
RUN mkdir -p /app/data
EXPOSE 8787
CMD ["sh", "-c", "npm run seed && npm start"]
