# syntax=docker/dockerfile:1

# ---- Build stage ----
# Full Node image to install all dependencies and compile TypeScript to JS.
FROM node:22-bookworm AS build

WORKDIR /build

# Install dependencies first (cached layer, keyed on the lockfiles).
# `npm ci` installs exactly what package-lock.json specifies (reproducible).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and compile (tsc -> dist/).
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
# Slim Node image: only the compiled JS and production dependencies are needed.
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies (express), skipping dev tooling
# (typescript, jest, ts-node, etc.).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the compiled application from the build stage.
COPY --from=build /build/dist ./dist

# Run as the non-root `node` user that ships with the Node image.
USER node

# The server listens on port 5000 (hardcoded in index.ts).
EXPOSE 5000

CMD ["node", "dist/index.js"]
