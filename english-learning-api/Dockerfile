# --- build stage ---
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- dictionary download stage ---
FROM alpine:3.20 AS dict
RUN apk add --no-cache curl unzip
WORKDIR /data
RUN curl -L -o ecdict.zip https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-sqlite-28.zip \
    && unzip ecdict.zip \
    && mv stardict.db ecdict.db \
    && rm ecdict.zip

# --- run stage ---
FROM node:20-alpine AS run
RUN apk add --no-cache python3 make g++
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=dict /data/ecdict.db ./data/ecdict.db

EXPOSE 3001
CMD ["node", "dist/index.js"]
