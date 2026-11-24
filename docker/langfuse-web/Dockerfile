# Langfuse web server.
#
# Built from the official image rather than from this repository's source. The
# upstream Dockerfile (web/Dockerfile) targets Red Hat UBI9 with a custom Node
# RPM so that node:crypto routes through RHEL's FIPS-validated OpenSSL; that
# path installs packages with dnf against a subscription, which fails in an
# unregistered container. Rebuilding the source here also has to reproduce the
# project's whole workspace build order (Prisma generation, workspace package
# compilation, test-file exclusion) that upstream CI already solves.
#
# Pinning the released image keeps the deployment on the same artifact the
# running instance uses; this file names it explicitly so every host builds the
# same tag instead of depending on whatever `docker compose pull` resolves.
FROM ghcr.io/langfuse/langfuse:4
