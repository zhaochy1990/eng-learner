# --- build stage ---
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- run stage ---
FROM node:20-alpine AS run
RUN apk add --no-cache python3 make g++
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY data/ecdict.db ./data/ecdict.db

EXPOSE 3001
CMD ["node", "dist/index.js"]
