FROM mcr.microsoft.com/playwright:v1.49.1-noble AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM mcr.microsoft.com/playwright:v1.49.1-noble AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM mcr.microsoft.com/playwright:v1.49.1-noble AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
