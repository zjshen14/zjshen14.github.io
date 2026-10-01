#!/usr/bin/env bash
set -euo pipefail
MODEL_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MODEL_CONTEXT="${MODEL_CONTEXT:-131072}"
MODEL_PORT="${MODEL_PORT:-8080}"
MODEL_RUNTIME="$MODEL_ROOT/runtime/b11146/llama-b11146"
MODEL_CUDA="$MODEL_ROOT/runtime/b11146/cudart-llama-b11146-bin-ubuntu-cuda-12.8-x64"
export LD_LIBRARY_PATH="$MODEL_RUNTIME:$MODEL_CUDA${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
mkdir -p "$MODEL_ROOT/logs"
echo "$$" > "$MODEL_ROOT/logs/server.pid"
exec "$MODEL_RUNTIME/llama-server" \
  --model "$MODEL_ROOT/models/Qwen3.8-27B-Q4_K_M.gguf" \
  --alias qwen3.8-27b \
  --host 127.0.0.1 --port "$MODEL_PORT" \
  --cors-origins localhost \
  --ctx-size "$MODEL_CONTEXT" --parallel 1 \
  --n-gpu-layers all --fit off \
  --flash-attn on --cache-type-k q8_0 --cache-type-v q8_0 \
  --batch-size 512 --ubatch-size 256 \
  --ctx-checkpoints 4 --cache-ram 2048 \
  --threads 8 --threads-batch 8 \
  --jinja --reasoning-format deepseek --reasoning-preserve \
  --temp 1.0 --top-p 0.95 --top-k 20 --min-p 0 --repeat-penalty 1 \
  --no-context-shift --no-mmproj --metrics \
  "$@"
