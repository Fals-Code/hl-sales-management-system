FROM node:22-bookworm

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user
WORKDIR /home/user/app

COPY --chown=user:user package.json package-lock.json ./
RUN npm ci

COPY --chown=user:user prisma ./prisma
RUN npm run db:generate

COPY --chown=user:user frontend/package.json ./frontend/package.json
RUN npm --prefix frontend install --no-audit --no-fund

COPY --chown=user:user . .

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
