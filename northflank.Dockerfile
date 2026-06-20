FROM node:22-bookworm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npm run db:generate
COPY frontend/package.json ./frontend/package.json
RUN npm --prefix frontend install --no-audit --no-fund
COPY . .
RUN npm --prefix frontend run build
ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "scripts/start-production.sh"]
