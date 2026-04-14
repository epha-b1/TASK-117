# Shared deps stage — installs all dependencies once.
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g npm@11.12.1
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Test stage — runnable with `docker compose run --rm test`.
FROM node:20-alpine AS test
WORKDIR /app
RUN npm install -g npm@11.12.1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "test"]

# Build stage — produces the static bundle.
FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g npm@11.12.1
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
