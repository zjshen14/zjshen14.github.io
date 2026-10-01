Local Qwen3.8-27B + OpenCode experiment
======================================
Hardware: RTX 3090 24GB, Ryzen 7 5800X, 64GB RAM, Ubuntu.
Runtime: llama.cpp b11146, CUDA 12.8; Q4_K_M weights; q8_0 K/V;
131072-token capacity, one slot, flash attention, batch 512/microbatch 256.
Coding agent: OpenCode 2.0.20, medium thinking, 8192-token output allowance.

After extracting reproduction-kit.zip into a new directory:
  bash setup.sh
  ./run-server.sh
Requires an NVIDIA driver, bash, curl, tar, sha256sum and about 17.6GB of
downloads plus extracted runtime space. The script verifies original pinned
downloads before extraction. This portable downloader was syntax-checked;
we did not repeat the full model download while preparing the blog.
The server listens only on 127.0.0.1:8080 and has no authentication.
Stop the foreground server with Ctrl+C.
For 64K instead: MODEL_CONTEXT=65536 ./run-server.sh
The original measurements all used 128K server capacity.

opencode.json is the EXACT tested 2.0.20 provider structure. Use it in a
project or merge the provider into an existing configuration. The online
OpenCode guide currently shows different provider fields; match your version.
No global config or system service is installed by these scripts.
For Web access use another port (e.g. 4096) and set a strong server password.

Throughput reproduction (Python 3 standard library, idle model server):
  python3 benchmark_throughput.py --report-dir reports/new-run
The output directory must not already exist. This is the original timing
script with GPU-name metadata changed to identify the actual card and
absolute timestamps, endpoint metadata and response fingerprints omitted.
No generated text is executed. Model loading and multi-user batching are
outside scope. Temperature 0/seed 1234; main tests disable thinking.
Fresh requests disable prefix reuse and generate 512 tokens. Continuations
generate 256 tokens and reuse all but 27-28 new input tokens.
2K inputs have three fresh samples; larger inputs have one each.
Generation uses server decode timing. First-token time uses the HTTP client.
GPU samples include desktop use and are taken every two seconds.

Data:
  throughput-results.json -- API timing records and GPU samples
  throughput-summary.json -- original timing summary
  coding-summary.json -- first attempts and separate thinking-off diagnostic
  buildplan-termination.json -- response-budget exhaustion evidence
  download-manifest.json -- pinned URLs, byte sizes, SHA-256 checksums
Experiment dates, absolute timestamps, timezones, personal filesystem paths,
session identifiers and unnecessary response fingerprints were removed.
Archive entry timestamps are fixed and do not reflect the experiment or
packaging time. Scores, durations, test counts and review probes remain.

Coding checks were prepared before each attempt, outside the agent workspace.
Four first attempts: 31/40 independent test methods, three fully green
candidate repositories, two completed edit/test/handoff workflows in eight
minutes. One unchanged build-planner check already passed at baseline.
The thinking-off retry is diagnostic only and does not replace the original.
Cache/ledger timings were recovered from timestamps and are approximate.
Infrastructure-only aborted launches were excluded from scores.
Post-run probes are not added retroactively to predefined scores.
Small custom Python tasks, one sample each; no general success rate, model
ranking, multi-seed reliability or long-context coding claim is established.
Complete coding fixtures, agent event logs and candidate patches are not
included. This kit reproduces deployment/timing and exposes coding summaries;
it is not a complete reproduction package for the coding evaluation.

Sources:
https://huggingface.co/Qwen/Qwen3.8-27B
https://ollama.com/library/qwen3.8:27b-q4_K_M
https://github.com/ggml-org/llama.cpp/releases/tag/b11146
https://github.com/ggml-org/llama.cpp/blob/b11146/tools/server/README.md
https://opencode.ai/docs/providers/
