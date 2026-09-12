#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
schema="$root/sherlok-nextjs/lib/generated/investigation-openapi.v1.json"
types="$root/sherlok-nextjs/lib/generated/investigation-api.v1.ts"

pnpm dlx openapi-typescript@7.13.0 "$schema" -o "$types"
