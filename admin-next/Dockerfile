FROM node:20-bookworm-slim AS base

FROM base AS deps
WORKDIR /app/admin-next
COPY admin-next/package*.json ./
RUN npm install

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/admin-next/node_modules /app/admin-next/node_modules
COPY admin-next /app/admin-next

WORKDIR /app/admin-next
RUN npm run build

FROM base AS runner
WORKDIR /app/admin-next
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/admin-next /app/admin-next

EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
