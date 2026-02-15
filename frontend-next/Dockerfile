FROM node:20-bookworm-slim AS base

FROM base AS deps
WORKDIR /app/frontend-next
COPY frontend-next/package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/frontend-next/node_modules /app/frontend-next/node_modules
COPY frontend-next /app/frontend-next
COPY metalcards_site-main /app/metalcards_site-main

WORKDIR /app/frontend-next
RUN npm run build

FROM base AS runner
WORKDIR /app/frontend-next
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/frontend-next /app/frontend-next

RUN mkdir -p /app/metalcards_site-main

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
