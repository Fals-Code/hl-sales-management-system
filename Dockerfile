FROM node:22-bookworm

USER node
ENV HOME=/home/node
WORKDIR /home/node/app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node prisma ./prisma
RUN npm run db:generate

COPY --chown=node:node frontend/package.json ./frontend/package.json
RUN npm --prefix frontend install --no-audit --no-fund

COPY --chown=node:node . .

ARG VITE_USE_API=true
ARG VITE_API_BASE_URL=/
ENV VITE_USE_API=$VITE_USE_API
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm --prefix frontend run build

ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
ENV PORT=7860

EXPOSE 7860

CMD ["sh", "scripts/start-production.sh"]
