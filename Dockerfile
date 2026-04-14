FROM caddy:2.8-alpine

WORKDIR /app

COPY . /app
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
