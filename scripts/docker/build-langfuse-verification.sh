#!/usr/bin/env bash
# Build the workspace verification image for this checkout.
#
# The image installs dependencies from the committed lockfile inside Docker, so
# the host's node_modules (and any broken symlinks in it) are irrelevant. Run
# this on a Linux builder of the target architecture.
#
#   scripts/docker/build-langfuse-verification.sh <image-repository> <git-sha>
#
# Environment:
#   TARGET_PLATFORM  defaults to the builder's architecture (linux/amd64 on
#                    x86_64, linux/arm64 on arm64)
#   PUSH=1           push the tag instead of loading it locally; the caller
#                    supplies registry credentials
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <image-repository> <git-sha>" >&2
  exit 2
fi

image_repository=$1
git_sha=$2
target_platform=${TARGET_PLATFORM:-linux/$(uname -m | sed 's/x86_64/amd64/; s/aarch64/arm64/')}
tag="${image_repository}:4.72.0-${git_sha}"
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

cd "$repo_root"

if [[ -n $(git status --porcelain --untracked-files=no 2>/dev/null) ]]; then
  echo "warning: the working tree has uncommitted tracked changes;" >&2
  echo "         the image is built from what is on disk, not from ${git_sha}." >&2
fi

build_args=(
  buildx build
  --platform "$target_platform"
  --file docker/langfuse-verification/Dockerfile
  --tag "$tag"
)
if [[ ${PUSH:-0} == 1 ]]; then
  build_args+=(--push)
else
  # Without --push buildx keeps the result only in its cache. --load puts it
  # into the local image store; it cannot load an image for another platform.
  build_args+=(--load)
fi

docker "${build_args[@]}" .

echo "built ${tag}" >&2
echo "next: docker run --rm ${tag} pnpm --filter web exec vitest --version" >&2
echo "next: docker run --rm ${tag} pnpm --filter web exec tsc --version" >&2
