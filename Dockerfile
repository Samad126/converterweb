# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# The one fact that shapes this file
# ---------------------------------------------------------------------------
#
# `NEXT_PUBLIC_*` variables are INLINED AT BUILD TIME.
#
# `lib/api.ts` reads `process.env.NEXT_PUBLIC_CONVERTER_BASE_URL`, and the
# bundler replaces that expression with a string literal. So the URL the browser
# gets is the one that was in the environment when `next build` ran - not when
# the container started. It is therefore a BUILD ARG, and changing it means
# rebuilding the image. Passing it under `environment:` in the compose file
# instead would look like it worked and would not: the page would keep calling
# whatever was baked in, and since an empty base URL is a supported deployment
# (same-origin), the mistake would not error - the page would load, the format
# picker would stay empty, and the health note would say the service is down,
# which reads as the API being broken rather than the image being stale.
#
# The base image is bookworm, not alpine, deliberately. package-lock.json was
# generated on glibc, and `npm ci` from a glibc lockfile in a musl image can
# skip the optional platform-specific packages Next and Tailwind need
# (`@next/swc-linux-x64-musl`, `lightningcss-linux-x64-musl`). The build fails
# when that happens, but only sometimes and only in CI. It is also the same base
# as the API image, so there is one set of facts to remember about both.

# ---------------------------------------------------------------------------
# Build stage
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Dependencies on their own layer. The lockfile changes far less often than the
# source does, so this is usually a cache hit and `npm ci` - by far the slowest
# step here - is usually skipped.
#
# `npm ci`, never `npm install`: it installs the lockfile exactly and fails if
# package.json has drifted from it, so the image cannot quietly contain a
# dependency tree nobody has run the tests against.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Defaults to empty, which is the same-origin deployment this app is designed
# around. The compose file passes the real value.
ARG NEXT_PUBLIC_CONVERTER_BASE_URL=""
ENV NEXT_PUBLIC_CONVERTER_BASE_URL=$NEXT_PUBLIC_CONVERTER_BASE_URL

# `next build` also runs the type-check, so a type error fails the image rather
# than shipping.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime stage
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

# The only stage that needs npm is the one above. Nothing here installs
# anything, and npm is a large, frequently-CVE'd directory inside an image whose
# whole job is to serve one page.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

ENV NODE_ENV=production \
    PORT=3011 \
    NEXT_TELEMETRY_DISABLED=1

# HOSTNAME is set explicitly, and this is not cosmetic. Docker gives every
# container a HOSTNAME of its own id, and the standalone server binds to
# `process.env.HOSTNAME || '0.0.0.0'` - so without this line the server binds to
# the container id instead of all interfaces, and the published port depends on
# that name resolving the way Docker happened to write /etc/hosts.
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# The traced server, including the handful of node_modules it actually needs.
COPY --from=build /app/.next/standalone ./

# Static assets are NOT part of that trace - they are referenced by URL, not
# imported, so nothing links them - and they have to land at exactly the path
# the server looks for them at. Miss this and the page renders as unstyled HTML
# with no JavaScript, which looks like a CSS bug rather than a missing COPY.
COPY --from=build /app/.next/static ./.next/static

# There is no `public/` directory to copy. If one is ever added, it needs its
# own `COPY --from=build /app/public ./public` here - the same trap as above.

# Unprivileged. The image already ships a `node` user (uid 1000), so there is
# nothing to create; the service only ever reads its own bundle.
USER node

EXPOSE 3011

# The root page is the only route, so it is what there is to probe. Next serves
# it in well under a second, which is what the short start period is for.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3011)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form, so node is PID 1 and receives SIGTERM directly instead of it
# landing on a shell that does not forward it. Next handles that signal and
# stops accepting connections; `docker compose stop` is therefore clean rather
# than a 10-second wait for the kill.
CMD ["node", "server.js"]
