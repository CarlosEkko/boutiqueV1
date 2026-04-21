Fireblocks secret keys directory.

Place your Fireblocks API secret PEM file here as:
  fireblocks.key

Example:
  /app/backend/secrets/fireblocks.key

The file is bind-mounted read-only into the backend container at /app/secrets/
and referenced via FIREBLOCKS_SECRET_KEY_PATH env var (default: /app/secrets/fireblocks.key).

IMPORTANT:
- This directory MUST exist before `docker compose up`, otherwise Docker will
  create it as part of the bind-mount (this is fine, the dir must exist anyway).
- Do NOT commit the actual .key file to git. See /app/backend/secrets/.gitignore.
