---
title: "Introducing agy-hq: A Multitasking Antigravity Workspace Built for Gemini 4 Carbon"
seoTitle: "agy-hq: Unleashing Gemini 4 Carbon in a Multitasking Google Antigravity Workspace"
description: "Sharing agy-hq with the community: a ready-to-run Google Antigravity workspace and zero-dependency Go helper that pairs a 2-second Flash Front Desk with parallel Gemini 4 Carbon worktree specialists, 1-tap phone approvals, and zero-token cache observability."
ogImage: "/images/introducing-agy-hq-en.png"
ogImageAlt: "Introducing agy-hq: Fast Front Desk + deep Gemini 4 Carbon worktrees, 9 modular Markdown skills with local/ vault and 1-tap approvals, and 97.9% prefix-cache telemetry."
pubDate: 2026-11-11
tags: ["ai", "agent", "gemini", "antigravity", "golang", "productivity", "architecture", "engineering"]
draft: false
---

Anyone trying **Gemini 4 Carbon** inside **Google Antigravity** right now runs into two truths almost immediately.

First, the jump in long-horizon capability is real: given `high` thinking depth and room to run verification loops, Carbon can hunt down gnarly concurrency bugs, audit security boundaries, draft multi-phase architecture designs, and self-correct across 100+ tool steps without losing the plot. Second, **the stronger and more autonomous the model gets, the more a single-window chat becomes your bottleneck.** When a deep `gemini-4-carbon-high` run spends 10 to 20 minutes thinking, editing, and running test harnesses inside your main chat window, your screen is locked up—and if you leave Carbon attached to a long-lived chat just to check your afternoon calendar or triage an inbox note, you burn scarce frontier quota on routine coordination.

In daily life—often switching between my laptop and my phone—I want one home workspace that gets the best of both worlds: instant two-second answers up front, while multiple **Gemini 4 Carbon** and **Flash** workers run concurrently across different repositories and research notes in the background.

Today I'm sharing the setup I built and use every day for that: **[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)**.

`agy-hq` (short for *headquarters*) runs natively on **Google Antigravity**—an agent-first development platform that ships with background subagents, live Markdown artifact cards, local lifecycle hooks, and a mobile **Remote Control** web UI for steering your desktop workspace from your phone. Rather than building a custom chat server or separate mobile app, `agy-hq` pairs a ready-to-run workspace layout with a small, zero-dependency Go helper (`./bin/hq`) that routes routine work to Flash and deep problems to **Gemini 4 Carbon**, isolates every coding task in its own `git worktree`, locks personal data inside a git-ignored `local/` vault, and includes a zero-token cache auditor (`./bin/hq obs`) showing why a 130-step background specialist actually bills fewer fresh tokens than waking up an idle main chat twice. *(If you enjoy earlier design notes on why prompt-only rules struggled before adding hooks, they're [here](/en/blog/agent-harness-microkernel/)—you don't need them, as everything below starts from scratch.)*

![UI and disk anatomy of agy-hq: Top shows the 3-pane Google Antigravity layout (Sidebar with pinned Front Desk and task threads, center chat with a 2-second reply and 1-tap SHA-256 approval card, right pinned hq_console.md card). Bottom shows the local zero-dependency Go helper and the two-layer split between tracked code and the git-ignored local/ vault.](/diagrams/agy-hq-architecture-en.svg)

*What `agy-hq` looks like in practice: one pinned `[HQ] Front Desk` stays responsive from laptop or phone alongside a zero-token live board (`hq_console.md`), while `./bin/hq` routes deep work to `Carbon-high` worktrees and fast work to `Flash`.*

## Try it in 60 seconds (`--demo`)

**Prerequisites:** Google Antigravity on macOS or Linux (or WSL2 on Windows), **Go 1.22+**, and **Git**.

Cloning someone else's personal-agent template usually feels lifeless at first because your notes, inbox, and task board start empty. To make `agy-hq` tangible right away, `./scripts/bootstrap.sh --demo` compiles `./bin/hq` (~1 second using only the Go standard library) and populates `local/` with a synthetic `[Sample]` sandbox—a fictional `ACME` quarterly filing in `local/inbox/`, a sample thesis note with exit triggers, active tasks on the board, and a staged outbound command ready to approve or reject:

```bash
git clone https://github.com/zjshen14/agy-hq.git && cd agy-hq
./scripts/bootstrap.sh --demo   # omit --demo for a clean empty local/ vault
./bin/hq status
```

Running `./bin/hq status` immediately displays your local vault and the sample approval queued up with its `SHA-256` lock:

```text
Vault:            /path/to/agy-hq/local
Pending Actions:  1
Active Worktrees: 0
  - [prop-demo-acme-q3-alert] [Sample] Publish ACME Q3 10-Q digest: "Gross margin 64.2% (+140 bps YoY); watching 14-week substrate lead time" (demo_echo) sha256:e951958440e4
```

Open the `agy-hq` folder in Google Antigravity and send any message. The `SessionStart` hook initializes `[HQ] Front Desk` (pin it to the top of your sidebar), pins the live `hq_console.md` board on the right, and loads your compact startup context.

## Tracing one 3-part prompt from your phone

Instead of listing abstract hook rules, let's trace what happens when you open Antigravity's Remote Control on your phone and send one mixed prompt to `[HQ] Front Desk`:

> *"Is 2pm free today? Also diff the ACME 10-Q in my inbox against my notes, and track down the race condition behind PR #279 in `~/src/web-app`."*

Here is how `agy-hq` handles all three parts without locking up your phone chat:

1. **Answers the 2pm check in two seconds (`<= 3` reads per turn):** On `[HQ] Front Desk`, `./bin/hq hook pre-tool` allows up to three lightweight read-only lookups *per user turn*—so checking your calendar finishes immediately. If the Front Desk tries to edit source code, run a test suite, or make a fourth read, the hook blocks the call and tells it to dispatch background workers so your main thread stays free for your next thought.
2. **Spawns an isolated `git worktree` for deep root-cause work:** Your repositories don't need to sit inside `agy-hq`. Passing `--repo=~/src/web-app --task=web-fix-pr279` checks out an isolated Git worktree and branch under `local/worktrees/web-fix-pr279/`, where a `gemini-4-carbon-high` worker can spend 15 minutes reproducing the race condition and running tests without touching your main `~/src/web-app` checkout or colliding with another task on the same repo.
3. **Quarantines untrusted files against prompt injection:** In parallel, a second background worker opens `local/inbox/acme-q3-10q-sample.txt` via `./bin/hq quarantine`. Because external files and emails can hide prompt-injection instructions, `quarantine` wraps the text as untrusted data and marks that session ID as **tainted**—mechanically blocking file writes, outbound CLI commands, spawning clean child subagents to escape the taint, and calling external `mcp_*` plugin tools.
4. **Refreshes the live board in 0 tokens and asks 1-tap approval:** At the end of each turn, `./bin/hq hook stop` updates the pinned `hq_console.md` card in pure Go (`0` extra LLM tokens, zero markdown status tables spammed into chat). Whenever a worker needs an irreversible external action—sending a digest message, emailing someone, or merging PR `#279`—it stages the exact command via `./bin/hq propose`, quotes the full unescaped payload in chat, and renders Antigravity's native **Approve / Reject** card on your phone (or on an optional `127.0.0.1:4242` local web console protected by a 256-bit CSRF token). Tapping **Approve** verifies at least 8 hex characters of the `SHA-256` hash (`sha256:e9519584`) before executing it.

## Why Gemini 4 Carbon makes `agy-hq` dramatically more powerful

Earlier models mostly acted like fast autocomplete in a chat loop; **Gemini 4 Carbon** behaves like an autonomous staff engineer that actually benefits from uninterrupted thinking time, test-loop verification, and multi-file context. `agy-hq` is built to turn that capability jump into daily leverage across three dimensions:

- **Automatic 3-tier routing (`Flash` reflexes + `Carbon-high` depth):** Running Carbon on every inbox summary wastes quota; running a lightweight model on a subtle race condition wastes your afternoon. Out of the box, `./bin/hq spawn` and `./bin/hq subagent` classify tasks into three tiers—**`quick`** (`gemini-3.8-flash-low`) for triage and status checks, **`standard`** (`gemini-3.8-flash-high`) for everyday feature coding and filing extraction, and **`deep`** (`gemini-4-carbon-high`) for architecture RFCs, concurrency root-cause hunts, security/privacy audits, and thesis falsification. Whenever you want Carbon explicitly, a natural-language hint (*"audit this auth boundary with Carbon"*) or `--model=carbon --depth=high` routes straight to `gemini-4-carbon-high`.
- **Uninterrupted 15-minute Carbon verification loops without freezing chat:** Carbon does its best work when it can explore hypotheses, write reproduction tests, and self-verify over 100 to 150 steps—or coordinate multi-agent work across branches. Isolating each deep task inside `local/worktrees/<repo>-<task>/` lets multiple Carbon sessions run concurrently at full depth while `[HQ] Front Desk` stays instant on your phone and delivers a clean executive takeaway when Carbon finishes.
- **Deterministic guardrails let you trust deeper autonomy:** The more capable an agent is at security analysis and multi-repo refactoring, the less you want safety depending on polite prompt wording. Because `./bin/hq` enforces worktree isolation, tainted-session quarantine, and `SHA-256`-locked 1-tap outbound approvals outside the model in Go, you can let `gemini-4-carbon-high` work unattended across repositories knowing every external side effect still waits for your thumb tap.

## Modular Markdown skills—keep only what you use

Seeing workflows like `filing-diff`, `ledger-ingest`, or `gchat` naturally raises a practical question for developers: *"Do I need SEC filings, plain-text accounting, or Google Chat set up—or have to edit Go code—just to use `agy-hq`?"*

**Not at all.** Every workflow in `.agents/plugins/agy-hq/skills/*/SKILL.md` is an independent, plain-Markdown runbook (`<= 150` lines) loaded only when relevant—not compiled Go logic and not a sequential pipeline:

![3x3 modular grid of the 9 independent built-in SKILL.md plugins (swe-pulse, morning-brief, sleep-consolidate, inbox-triage, gchat, filing-diff, thesis-check, ledger-ingest, tax-prep), showing each skill can be used or removed independently over a shared Go safety floor.](/diagrams/agy-hq-workflows-en.svg)

*Nine independent `SKILL.md` plug-ins over a shared Go safety floor. You don't need Go to edit or write skills—and you can ignore or delete any optional domain you don't use.*

- **Core engineering & bounded memory (`swe-pulse`, `morning-brief`, `sleep-consolidate`):** If you only care about software engineering, these three give you multi-repo `git worktree` orchestration and PR/CI tracking, a morning rollup of open PRs and pending approvals, and self-cleaning memory. Startup memory (`local/MEMORY.md`) is capped at `<= 80` lines by Go so startup prompts stay lean, linking to `local/memory/topics/*.md` notes that `sleep-consolidate` cross-checks against raw tool outputs at night so hallucinated claims don't stick.
- **Intake & optional domain plug-ins (`inbox-triage`, `gchat`, `filing-diff`, `thesis-check`, `ledger-ingest`, `tax-prep`):** Drop-in Markdown skills for quarantined file triage, Google Chat spaces/drafts, section-by-section `10-K`/`10-Q` diffs, investment thesis checks (where `gemini-4-carbon-high` shines at adversarial thesis stress-testing), and local `Beancount`/`hledger` or tax workpapers. Skip them, delete them, or drop in your own `SKILL.md` in two minutes.

Across every skill, the **two-layer `local/` vault** keeps personal data out of Git history: tracked engine code and generic skills live in `agy-hq/`, while all personal notes, memory logs, worktrees, and private records live inside git-ignored `local/`—backed up to its own private `local/.git` repository and guarded by 6 pre-commit privacy checks.

## Protecting frontier quota: what 505.8M tokens of cache logs revealed (`./bin/hq obs`)

With frontier models like **Gemini 4 Carbon**, quota efficiency matters even more. Whenever I describe dispatching coding and research into background subagents, people immediately ask: **"Doesn't spawning subagents burn way more tokens?"**

To measure instead of guessing, `agy-hq` includes `./bin/hq obs`, which parses Antigravity's local `transcript.jsonl` step logs—fresh uncached `input_tokens`, prefix-cached `cache_read_tokens`, and `output_tokens`—in pure Go at zero token cost. Auditing **68 real conversations (4,894 model steps and 505.8 million gross tokens)** turned up the exact opposite of conventional wisdom:

![Empirical chart from ./bin/hq obs across 68 conversations: 130-step and 151-step continuous coding subagents hit 97.4% and 97.9% prefix cache (burning only 396k and 430k uncached input tokens), while 2 idle Front Desk wakeup steps at 207k context burned 414k. The 160k compaction watermark drops cold wakeups from 252k to 27k (-89.2%).](/diagrams/agy-hq-token-obs-en.svg)

*Measured across 505.8M gross tokens: continuous background subagents stay warm inside the ~5-minute prefix-cache window, whereas an uncompacted main chat waking up after idle gaps pays full uncached prompt cost.*

- **Workspace-wide, `92.1%` of all prompt tokens hit prefix cache** (`462.5M` cached reads vs. `39.8M` uncached fresh input).
- **Continuous 130–151-step subagents are remarkably cache-efficient (`97.4%–97.9%` hit):** Because an autonomous coding or Carbon verification subagent steps every 3 to 8 seconds, almost every turn lands inside the ~5-minute prefix-cache TTL. A 130-step coding subagent (`15.2M` gross tokens) billed only **`396k` uncached input tokens**; a 151-step subagent (`20.6M` gross tokens) billed **`430k`**.
- **Idle gaps on a bloated main chat are the real quota killer (`0%` cache hit):** Because `[HQ] Front Desk` stays open across days while human messages and scheduled jobs arrive 10 minutes to hours apart, its prefix cache expires between turns. Once the Front Desk drifted to `207k` context tokens, **just 2 wakeup steps** (after 11- and 29-minute idle gaps) billed **`414k` uncached input tokens—more fresh input in two coordinator turns than a 130-step coding subagent!** Imagine paying that cold-cache tax on a frontier model every time you ask a 5-second question.

To eliminate that "cold-wakeup tax," `agy-hq` monitors live context size and nudges `/compact` (or a clean shift handover) once `[HQ] Front Desk` crosses **`160k` tokens**—cutting cold wakeups from `252k` down to `27k` tokens (**`89.2%` less per wakeup**) so your frontier quota goes into deep background reasoning instead of re-reading stale chat history.

## Good to know & grab what's useful

Two practical notes before you dive in:

1. **The 3-lookup cap on the Front Desk is deliberately strict.** Occasionally, a simple question happens to need a fourth file read; the hook will force `[HQ] Front Desk` to hand off to a quick background subagent rather than risk letting a slow investigation block your phone chat. Every cap, model-routing rule, and skill lives in plain Go, YAML, and Markdown if you prefer looser defaults.
2. **Pulling updates won't clobber your private vault.** Running `./bin/hq upgrade` snapshots your private `local/.git`, fast-forwards `main`, rebuilds `./bin/hq` in ~1 second, runs non-destructive config migrations, and checks workspace health with `./bin/hq doctor`—backed by 21 isolated sandbox end-to-end tests (~1.8s).

Even if you don't need the full headquarters template, feel free to borrow individual parts: the zero-dependency Go `PreToolUse` / `Stop` hook skeleton, the `Flash` + `Gemini 4 Carbon` tier router, `./bin/hq obs` to inspect prefix-cache hit rates across your own Antigravity logs, or the two-layer `local/` vault layout.

Everything is live at **[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)** (Apache 2.0). If you spin up `--demo` with Gemini 4 Carbon, build new `SKILL.md` workflows, or run into rough edges, I'd love to hear what you build in Discussions or Issues!

<details>
<summary>Want the exact CLI overview, model routing tiers, and telemetry numbers?</summary>

Prepared with AI assistance. Figures correspond to [github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq) as of November 11, 2026, with chart data recorded in [summary.json](/experiments/introducing-agy-hq/summary.json).

- **Host & zero-dependency Go helper (`./bin/hq`):** Built with the Go 1.22+ standard library (`0` external dependencies in `go.mod`). Plugs into `.agents/hooks.json` (`SessionStart`, `PreToolUse`, `Stop`). Everyday commands include `./bin/hq status`, `./bin/hq doctor`, `./bin/hq obs [--days=N] [--json]`, `./bin/hq spawn --repo=<path> --task=<slug> [--model=carbon --depth=high]`, `./bin/hq subagent`, `./bin/hq worktree add|list|prune`, `./bin/hq propose` / `approve` / `reject`, `./bin/hq webui` (`127.0.0.1:4242`), and `./bin/hq upgrade`.
- **Smart model & thinking-depth routing:** Automatic task classification routes `quick` tasks to `gemini-3.8-flash-low`, `standard` coding/extraction tasks to `gemini-3.8-flash-high`, and `deep` architecture, security audit, concurrency debugging, and thesis-falsification tasks to `gemini-4-carbon-high` (with explicit CLI flags `--model=flash|carbon|... --depth=low|medium|high` and natural-language prompt overrides).
- **Front Desk & worktree isolation:** `local/memory/front_desk.json` tracks the active Front Desk conversation lease. On that thread, `PreToolUse` allows up to `3` read-only inspection calls per turn and denies inline `edit_file`, `write_file` (outside `hq_console.md`), and test suites (`go test`, `npm test`, `pytest`). Coding tasks isolate branches under `local/worktrees/<repo>-<task>/`. `Stop` refreshes `hq_console.md` and `local/memory/journal/` in pure Go (`0` extra LLM tokens).
- **Nine modular skills (`<= 150` lines each):** `swe-pulse`, `morning-brief`, `sleep-consolidate`, `inbox-triage`, `gchat`, `filing-diff`, `thesis-check`, `ledger-ingest`, and `tax-prep`. Startup memory (`local/MEMORY.md`) is mechanically capped at `<= 80` lines.
- **Quarantine, approval & privacy gates:** Tainted sessions (`local/memory/tainted/<conv>.json`) block file writes, outbound CLI commands, child `invoke_subagent` / `hq spawn` escapes, and external `mcp_*` calls. Outbound proposals verify `>= 8`-char `SHA-256` prefixes; the optional `127.0.0.1:4242` WebUI enforces loopback `Host` + same-origin `Origin` / `Sec-Fetch-Site` + `application/json` + constant-time 256-bit `X-HQ-CSRF` checks. Pre-commit and pre-push checks (`./bin/hq ci pre-push`, `~2.5s`) verify `6/6` privacy rules (including `local/pii-denylist.txt` and `--history` patch scanning), `18/18` simulated hook security probes, and `21` isolated end-to-end sandbox workflows (`~1.8s`).
- **Token & prefix-cache audit (`./bin/hq obs`):** Across `68` Antigravity `transcript.jsonl` logs (`4,894` reasoning and compaction steps; `505,830,652` gross tokens = `39,816,608` uncached `input_tokens` + `462,514,486` `cache_read_tokens` + `3,499,558` `output_tokens`), overall prefix-cache hit ratio was `92.1%`. Continuous coding subagents hit `97.4%` (`130` steps, `395,917` uncached) and `97.9%` (`151` steps, `430,040` uncached), while `[HQ] Front Desk` (`110` turns, `500` steps) incurred `49` cold wakeups (`9,505,555` uncached tokens, `23.9%` of workspace uncached spend). Context watermarks warn at `160,000` tokens (`critical` at `200,000`), cutting cold wakeups from `252,166` to `27,244` tokens (`-89.2%`).

</details>
