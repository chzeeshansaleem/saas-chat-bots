FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/widget/package.json apps/widget/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY apps/widget ./apps/widget
COPY packages ./packages
RUN npm --workspace @multi-chatbot/widget run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/widget/dist /usr/share/nginx/html
COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
