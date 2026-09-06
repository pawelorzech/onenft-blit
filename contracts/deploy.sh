#!/usr/bin/env bash
# Deploys the four data stores, BlitRenderer and OneNFT. Usage: contracts/deploy.sh sepolia|mainnet
# Deployer uses the encrypted onenft-deployer Foundry keystore, author address from ~/.config/onenft/author.json.
set -euo pipefail
source "$(dirname "$0")/../scripts/operator-safe.sh"
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org; CHAIN=84532;;
  mainnet) RPC=https://mainnet.base.org; CHAIN=8453;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
cd "$(dirname "$0")"
[ -f test/fixtures/blit_data.json ] || (cd .. && bun run contracts/fixtures.ts)
AUTHOR=$(operator_json_address "$HOME/.config/onenft/author.json" address)
operator_signer deployer
DEPLOYER=$(operator_address "$(cast wallet address "${SIGNER_ARGS[@]}")")
BAL=$(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether)
echo "network $NET  deployer $DEPLOYER  balance $BAL ETH  author $AUTHOR"
START_EPOCH="${START_EPOCH:-$(( $(date -u +%s) / 86400 ))}"
[[ "$START_EPOCH" =~ ^[0-9]{1,12}$ ]] || { echo "Invalid START_EPOCH" >&2; exit 1; }
echo "START_EPOCH=$START_EPOCH"
LOG="$OPERATOR_TMP_DIR/onenft-blit-deploy-$NET.log"
START_EPOCH=$START_EPOCH AUTHOR=$AUTHOR forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast "${SIGNER_ARGS[@]}" \
  --verify --verifier sourcify 2>&1 | tee "$LOG"
get() { operator_log_address "$LOG" "$1"; }
NFT=$(get OneNFT); REN=$(get BlitRenderer); ORIGINALS_A=$(get originalsA); ORIGINALS_B=$(get originalsB); META=$(get meta); SIBLINGS=$(get siblings)
mkdir -p "$HOME/.config/onenft-blit"
jq -n --arg net "$NET" --argjson chain "$CHAIN" --arg nft "$NFT" --arg ren "$REN" --arg a "$ORIGINALS_A" --arg b "$ORIGINALS_B" --arg m "$META" --arg s "$SIBLINGS" \
  --argjson start "$START_EPOCH" --arg author "$AUTHOR" --arg deployer "$DEPLOYER" --arg at "$(date -u +%FT%TZ)" \
  '{network:$net,chainId:$chain,OneNFT:$nft,BlitRenderer:$ren,originalsA:$a,originalsB:$b,meta:$m,siblings:$s,startEpoch:$start,author:$author,deployer:$deployer,at:$at}' | operator_write_json "$HOME/.config/onenft-blit/deploy-$NET.json"
cat "$HOME/.config/onenft-blit/deploy-$NET.json"
