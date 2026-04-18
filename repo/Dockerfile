# syntax=docker/dockerfile:1.6

# Shared deps stage — installs all dependencies once.
# We use the npm bundled with node:20-alpine (currently 10.x) rather than
# upgrading to npm@11 at build time: the upgrade requires a registry round
# trip that's fragile on constrained networks, and lockfileVersion 3 is
# fully supported by npm 7+, so npm 10 handles this project correctly.
#
# --mount=type=cache,target=/root/.npm persists npm's cache across builds
# so subsequent builds don't re-download tarballs. Aggressive retry +
# single-socket settings harden the install against flaky transit to
# registry.npmjs.org (builds observed timing out on xml-name-validator).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --prefer-offline \
      --fetch-retries=10 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=600000 \
      --fetch-timeout=600000 \
      --maxsockets=1

# Test stage — runnable with `docker compose run --rm test`.
FROM node:20-alpine AS test
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "test"]

# Build stage — produces the static bundle.
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime stage — serves the static bundle via nginx (SPA fallback to index.html).
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server {\n\
  listen 5000 default_server;\n\
  listen [::]:5000 default_server;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf \
  && rm -f /etc/nginx/conf.d/default.conf.bak
EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]
