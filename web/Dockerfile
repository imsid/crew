FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# the BFF origin the browser should call is a build argument, not a runtime
# variable. The default matches the docker-compose port mapping.
ARG NEXT_PUBLIC_CREW_API_BASE_URL=http://127.0.0.1:8003
ENV NEXT_PUBLIC_CREW_API_BASE_URL=$NEXT_PUBLIC_CREW_API_BASE_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
