# pumpkinlab.tomeij.net: the game's static files served by nginx as a non-root user on :8080 (Traefik routes to it).
# Only the current version goes in: versies/, start.command and the docs stay out of the image.
FROM nginxinc/nginx-unprivileged:1.30.5-alpine@sha256:56b8272e43a0525f67aed68d1e0794a712d10e3e45a563e118e9a77c817e6f86

LABEL org.opencontainers.image.source=https://github.com/roytomeij/pumpkinlab
LABEL org.opencontainers.image.description="PumpkinLab browser game (pumpkinlab.tomeij.net)"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/

EXPOSE 8080
