Qwen3.8-27B MTP: paired coding-quality and generation-throughput records

WHAT THIS CONTAINS
controlled-summary.json reports 4 small Python repair tasks x 2 paired seeds
x 2 modes = 16 attempts. The model file, fixtures, working directory, prompts,
tools, permissions, sampling, and budgets were fixed within each pair.
All 8 complete first-request comparisons, initial fixture comparisons, and
server-command comparisons passed. Only spec-type differed: none / draft-mtp.
Later prompts diverged with the agent's actions. No alternative quantization
was tested; both modes used the same GGUF with its embedded MTP layer.

MAIN RESULTS
Generation throughput: off 36.0461 tokens/s; on 56.2134 tokens/s (1.56x).
Independent predefined test methods: off 35/80; on 26/80.
Completed and passing attempts: off 2/8; on 2/8.
Two successful paired cache tasks saved 20.1% and 39.9% of elapsed time.
The 9-check primary difference comes entirely from wallet seed 8675309:
off produced a 10/10 patch but timed out; on made no production-code patch
and remained at its initial 1/10. Neither met full delivery criteria.

PROTOCOL
RTX 3090 24GB; Qwen3.8-27B Q4_K_M; llama.cpp b11146 / CUDA 12.8;
OpenCode 2.0.20; 131072-token context capacity; q8_0 K/V;
medium thinking; temperature 1.0; top_p 0.95; top_k 20;
8192 output tokens per generation; 480 seconds per task;
seeds 4242 and 8675309; maximum draft length 3.
Fresh server before every attempt. Prefix-cache reuse disabled in both modes;
reported cached-prefix counts were zero. Target and draft backend sampling
disabled, with no synthetic acceptance. Second seed reverses mode order.
Largest actual prompt: 20057 tokens, not a full 128K coding evaluation.

DEFINITIONS
Generation throughput = sum of accepted target output tokens / sum of server
generation time for completed timing records, including reasoning and tool
calls. Prompt processing and rejected drafts are excluded. Interrupted
requests without a final timing record are excluded.
Task elapsed time includes prompt processing, tools and agent-run tests;
it excludes server startup and independent grading after the attempt.
Completed and passing requires no timeout, successful process exit,
unchanged protected files, passing public/added tests, and all 10 independent
test methods passing. It is not proof that every possible defect is covered.

EXTRA REVIEW
Post-grading probes did not feed back to the agent or change primary scores.
Cache seed 8675309: a finite positive integer TTL (10**400), with an injected
strictly increasing integer clock, passed off and failed on. Added float
finiteness validation overflowed. This is an extreme API boundary.
Ledger large exact amounts, exact header names, and read-time I/O errors
failed both modes at both seeds.
Wallet destination integer overflow passed off and failed on at seed 8675309;
it failed both modes at seed 4242.

LIMITATIONS
Four small tasks and two seeds per task are an exploratory screen, not proof
of statistical non-inferiority or a general MTP quality loss. Tests within a
task are correlated, not 80 independent trials. Most failed attempts used
up the response budget in reasoning without producing a patch; baseline
1/10 scores must not be described as partial repairs.
Later prompts and generated texts differ, so aggregate throughput is a
descriptive agent-run comparison rather than an identical-text benchmark.
Fresh servers and no prefix caching limit applicability to warm conversations.
Desktop/background GPU activity was not fully controlled. No root cause of
the paired quality difference has been isolated.
The earlier exploratory runs and the previous deployment post are separate
studies; their scores are not pooled into these records.

PRIVACY AND REPRODUCTION SCOPE
No experiment dates, wall-clock timestamps, timezones, locations, personal
paths, session identifiers, raw prompts/conversations, or account details
are included. Relative durations, versions, seeds, measurements, and scores
are retained. A local service-restoration status field was removed.
This is a results attachment, not a complete reproduction kit: task fixtures,
candidate code, request transcripts and the full harness are not distributed.
The original independent checks were kept outside the agent workspace.
