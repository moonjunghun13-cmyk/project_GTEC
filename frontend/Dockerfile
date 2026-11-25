FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

ARG VITE_TOSS_WIDGET_CLIENT_KEY=""
ENV VITE_AUTH_MODE=api \
    VITE_DATA_MODE=api \
    VITE_API_BASE_URL=/ \
    VITE_TOSS_WIDGET_CLIENT_KEY=${VITE_TOSS_WIDGET_CLIENT_KEY}

RUN npm run build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html