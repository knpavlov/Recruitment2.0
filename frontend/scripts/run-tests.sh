#!/usr/bin/env bash
set -euo pipefail
rm -rf dist-tests
npx tsc -p tsconfig.test.json
printf '{"type":"commonjs"}' > dist-tests/package.json
node --test dist-tests/modules/caseCriteria/__tests__/*.test.js
