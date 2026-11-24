# Workspace image for running Langfuse's own tests and type checks.
#
# This is deliberately separate from the production web image. The production
# image ships only the runtime and its dependencies; the tools this repository
# uses to verify a change (Vitest, TypeScript, the Prisma CLI and the rest of
# devDependencies) belong in a short-lived verification image instead.
#
# The host's node_modules never enters the build context. Dependencies are
# installed here from the committed lockfile, so the platform-specific optional
# packages are the ones pnpm selected for this image's architecture.
#
# Build from the repository root (see scripts/docker/build-langfuse-verification.sh):
#
#   docker buildx build \
#     --platform linux/amd64 \
#     --file docker/langfuse-verification/Dockerfile \
#     --tag <registry>/langfuse-verification:4.72.0-<git-sha> \
#     .
#
# Then verify the image in a fresh container, not on the host:
#
#   docker run --rm <image> pnpm --filter web exec vitest --version
#   docker run --rm <image> pnpm --filter web exec tsc --version

FROM node:24.22.1-bookworm

# The workspace file uses package-manager settings that older pnpm cannot
# parse, so the version must be the one this checkout declares — not a version
# copied from whatever Dockerfile happened to be at hand. turbo comes from the
# same manifest, and `db:generate`/build below run through it.
COPY package.json /tmp/package.json
RUN PNPM_VERSION=$(node -p "require('/tmp/package.json').devEngines.packageManager.version") \
 && TURBO_VERSION=$(node -p "String(require('/tmp/package.json').devDependencies.turbo).replace(/^[^0-9]*/, '')") \
 && npm install -g "pnpm@${PNPM_VERSION}" "turbo@${TURBO_VERSION}" \
 && pnpm --version && turbo --version

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV HUSKY=0
RUN pnpm config set store-dir /pnpm/store

WORKDIR /app

# Dependency installation reads only the manifests and lockfile, so an ordinary
# source edit does not invalidate this layer. The workspace uses pnpm's isolated
# layout: every package's install links point at the root virtual store, so all
# workspace manifests arrive together and the install layers are shared.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY .nvmrc ./
COPY scripts ./scripts
COPY web/package.json ./web/package.json
COPY worker/package.json ./worker/package.json
COPY ai-gateway/package.json ./ai-gateway/package.json
COPY ee/package.json ./ee/package.json
COPY packages/config-oxlint/package.json ./packages/config-oxlint/package.json
COPY packages/config-typescript/package.json ./packages/config-typescript/package.json
COPY packages/eslint-plugin/package.json ./packages/eslint-plugin/package.json
COPY packages/icons/package.json ./packages/icons/package.json
COPY packages/in-app-agent-sandbox-runtime/package.json \
     ./packages/in-app-agent-sandbox-runtime/package.json
COPY packages/langfuse-skills/package.json ./packages/langfuse-skills/package.json
COPY packages/native/package.json ./packages/native/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY patches ./patches
COPY skills-lock.json ./
COPY vitest.workspace.ts knip.jsonc .codespellrc ./
COPY .agents ./.agents
COPY .env.dev.example .env.test.example ./

# Scripts such as `typecheck` run through `dotenv -e ../.env`. CI prepares
# those files from the committed examples before running them; the examples
# carry no credentials, and any real test service settings are injected at run
# time rather than baked into the image.
RUN cp .env.dev.example .env \
 && cp .env.test.example .env.test

# The full workspace install is authoritative: frozen to the committed
# lockfile. A plain install keeps development and optional dependencies, which
# is what this image exists for: the platform-specific packages for this
# image's architecture are optionalDependencies. Never install only `web`: the
# workspace build needs its siblings too.
#
# The store is a BuildKit cache mount so a download that fails part-way is not
# thrown away: the next build resumes with every tarball already fetched. A
# cache mount never becomes part of the image, so the install copies packages
# instead of hard-linking them into the store; otherwise the image's
# node_modules would point at files the image does not contain.
RUN --mount=type=cache,id=langfuse-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile \
      --config.package-import-method=copy \
      --config.fetch-retries=10 \
      --config.fetch-retry-mintimeout=20000 \
      --config.fetch-retry-maxtimeout=180000

# Sources arrive after the install layer.
COPY web ./web
COPY worker ./worker
COPY ai-gateway ./ai-gateway
COPY ee ./ee
COPY packages ./packages

# Reuse the repository's own entry points rather than raw CLIs: `db:generate`
# goes through turbo, as scripts/codex/maintenance.sh does after an install,
# and the build follows turbo.json's dependency edges (the icons package's
# code generation runs there).
RUN pnpm run db:generate
RUN pnpm exec turbo run build --filter=web...

# Kept as a command container, not a service.
CMD ["bash"]

# Everything the build needs is listed above; the developer's real `.env` is
# never copied. When a task starts reading a new repository-root file, add it
# to the COPY list rather than copying the whole build context.
