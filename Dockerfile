FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/.storage/checkpoints && chown -R node:node /app/.storage
USER node
ENV HOST=0.0.0.0 PORT=4173
EXPOSE 4173
VOLUME ["/app/.storage"]
CMD ["node", "server.mjs"]
