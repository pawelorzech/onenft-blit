#!/usr/bin/env bash
# Post-deploy check. Usage: contracts/check.sh sepolia|mainnet
# Compares every data store's code with the fixture blob byte for byte, and the
# renderer's svg() for a late day with the TypeScript output. Same-size blobs in
# the wrong order would pass the constructor's length checks; this catches it.
set -euo pipefail
NET="${1:?sepolia|mainnet}"
case "$NET" in sepolia) RPC=https://sepolia.base.org;; mainnet) RPC=https://mainnet.base.org;; *) exit 1;; esac
cd "$(dirname "$0")/.."
D="$HOME/.config/onenft-blit/deploy-$NET.json"; F=contracts/test/fixtures/blit_data.json; ok=1
for k in originalsA originalsB meta siblings; do
  want="0x00$(jq -r ".$k" $F | cut -c3-)"; got=$(cast code "$(jq -r ".$k" "$D")" --rpc-url "$RPC")
  if [ "$want" = "$got" ]; then echo "$k: on-chain bytes == fixture"; else echo "$k: MISMATCH"; ok=0; fi
done
START=$(jq -r .startEpoch "$D"); R=$(jq -r .BlitRenderer "$D")
for day in 1 252 9900; do
  cast call "$R" "svg(uint256)(string)" $((START + day - 1)) --rpc-url "$RPC" > /tmp/check-blit.svg
  if bun -e 'import { renderDay } from "./src/blit.ts"; let s=(await Bun.file("/tmp/check-blit.svg").text()).trim(); if(s.startsWith("\"")) s=JSON.parse(s); const d=Number(process.argv[1]); process.exit(s===renderDay(d, BigInt(process.argv[2])+BigInt(d-1)).svg?0:1)' "$day" "$START"; then echo "day $day: svg == TypeScript"; else echo "day $day: MISMATCH"; ok=0; fi
done
[ $ok = 1 ] && echo "all good" || { echo "PROBLEM"; exit 1; }
