#!/usr/bin/env bash
set -euo pipefail
KIT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$KIT_ROOT"
mkdir -p downloads models runtime/b11146
download_verified() {
  local url="$1" output="$2" digest="$3"
  if [[ ! -f "$output" ]]; then
    curl --fail --location --retry 3 "$url" -o "$output.part"
    mv "$output.part" "$output"
  fi
  printf '%s  %s\n' "$digest" "$output" | sha256sum --check --status
  echo "Verified $output"
}
download_verified 'https://github.com/ggml-org/llama.cpp/releases/download/b11146/llama-b11146-bin-ubuntu-cuda-12.8-x64.tar.gz' 'downloads/llama-b11146-bin-ubuntu-cuda-12.8-x64.tar.gz' 'c2ab9e19838513ff69d1af8d999ad717dd3c7ee4714ac04c7ed5ab9077c50e4e'
download_verified 'https://github.com/ggml-org/llama.cpp/releases/download/b11146/cudart-llama-b11146-bin-ubuntu-cuda-12.8-x64.tar.gz' 'downloads/cudart-llama-b11146-bin-ubuntu-cuda-12.8-x64.tar.gz' '1466daea60aad1144819e151b2bae19d54556cf1da6c129c4f55a5ded2637c25'
download_verified 'https://registry.ollama.ai/v2/library/qwen3.8/blobs/sha256:f5f1dd8920d417aac2718b0bda3403da274301efdd6760b4f0f4b864ff2ad57d' 'models/Qwen3.8-27B-Q4_K_M.gguf' 'f5f1dd8920d417aac2718b0bda3403da274301efdd6760b4f0f4b864ff2ad57d'
download_verified 'https://registry.ollama.ai/v2/library/qwen3.8/blobs/sha256:4c6a8e842ef0d8504549facfb03f1273a8d0022991519bc1888522cc1a5517d1' 'models/LICENSE-Qwen3.8.txt' '4c6a8e842ef0d8504549facfb03f1273a8d0022991519bc1888522cc1a5517d1'
download_verified 'https://registry.ollama.ai/v2/library/qwen3.8/blobs/sha256:448d29437397713495b408d51b4ccbc5ba95240a7583643efb2304921950b111' 'models/qwen3.8-parameters.json' '448d29437397713495b408d51b4ccbc5ba95240a7583643efb2304921950b111'
tar -xzf downloads/llama-b11146-bin-ubuntu-cuda-12.8-x64.tar.gz -C runtime/b11146
tar -xzf downloads/cudart-llama-b11146-bin-ubuntu-cuda-12.8-x64.tar.gz -C runtime/b11146
chmod +x run-server.sh
echo 'Downloads verified and runtime extracted. Start with ./run-server.sh'
