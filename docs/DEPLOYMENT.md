# Public HTTPS deployment

The repository includes a Node image and a Docker Compose configuration with Caddy HTTPS and a persistent checkpoint volume. These files are prepared for deployment; Docker and a public hosting account were unavailable during the desktop validation. They have **not** been deployed or tested with a real TLS certificate.

## Requirements

- A Linux host with Docker Compose, reachable on ports 80 and 443.
- A public hostname whose DNS A/AAAA records point to that host.
- The current repository, including the committed `vendor/` assets.

On the host, from the project directory:

```sh
export FLYNS_DOMAIN=your-public-hostname.example
docker compose config
docker compose up -d --build
docker compose ps
curl -f "https://$FLYNS_DOMAIN/api/health"
```

Replace the example hostname. Compose derives `PUBLIC_ORIGIN=https://...` from it; Caddy terminates HTTPS and proxies to Node. The app port is not exposed publicly. The Docker context excludes secrets, local snapshots, and test artifacts.

Checkpoints persist in the `checkpoints` volume. Ordinary container recreation preserves them. Do not use `docker compose down -v` on a deployment whose snapshots you need. Back up the volume before moving hosts; it is neither replicated nor decentralized.

## Acceptance before submission

1. Confirm `/api/health` reports the public HTTPS origin.
2. Publish a real checkpoint and fetch its HTTPS URI from a separate browser.
3. Restart the app container and fetch the identical bytes again.
4. In Sepolia mode, resolve the agent's ENS name from a clean browser, fetch the canonical checkpoint, and verify restoration. Do not copy localStorage identity records between browsers.
5. Record the URL and actual transaction/readback evidence in `SUBMISSION.md`.

The current upload API is public, with a 128 KiB object limit, 20 uploads/minute/IP, and a 32 MiB store quota. Put authenticated uploads and suitable storage capacity in place before broad public use. The reverse proxy groups clients under its IP for the existing rate limiter; the app does not trust arbitrary forwarding headers.

Configuration references: [Caddy Docker Compose](https://caddyserver.com/docs/running#docker-compose) and [Docker Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).
