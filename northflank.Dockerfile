FROM node:22-bookworm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npm run db:generate
COPY frontend/package.json ./frontend/package.json
RUN npm --prefix frontend install --no-audit --no-fund
COPY . .
ARG VITE_USE_API=true
ARG VITE_API_BASE_URL=/
ENV VITE_USE_API=$VITE_USE_API
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm --prefix frontend run build
ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "scripts/start-production.sh"]
