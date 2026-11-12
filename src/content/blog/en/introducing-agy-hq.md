---
title: "Introducing agy-hq: Turning Google Antigravity into a Multitasking Personal Assistant Agent"
seoTitle: "agy-hq: A Multitasking Personal Assistant Agent on Google Antigravity"
description: "Sharing agy-hq with the community: a local-first workspace and zero-dependency Go helper that makes Google Antigravity work like a responsive personal assistant across coding, notes, inbox triage, and daily admin—routing quick turns to Flash and deep background tasks to models like Gemini 4 Carbon."
ogImage: "/images/introducing-agy-hq-en.png"
ogImageAlt: "Introducing agy-hq: One responsive personal assistant Front Desk, 9 modular Markdown skills, a private local/ vault with 1-tap approvals, and tiered routing with 97.9% prefix-cache telemetry."
pubDate: 2026-11-11
tags: ["ai", "agent", "gemini", "antigravity", "golang", "productivity", "architecture", "engineering"]
draft: false
---

Most AI coding setups behave like a single-task contractor: open one repository, start one chat, and wait while the agent reads files, edits code, and runs tests.

A real personal assistant doesn't disappear for ten minutes just because you handed over one meaty assignment. Over a normal morning—moving between my laptop and my phone—my tasks rarely stay inside a single codebase or even inside software engineering. I want one home workspace where I can ask whether my 2pm slot is open, drop an incoming document into an inbox to summarize against my notes, and kick off bug fixes in two separate repositories—while the assistant in front of me stays immediately available for my next thought.

Today I'm sharing the workspace setup I built and use every day for that: **[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)**.

`agy-hq` (short for *headquarters*) runs on **Google Antigravity**—an agent-first IDE that includes background subagents, live Markdown artifact cards, local lifecycle hooks, and a mobile **Remote Control** web UI for talking to your desktop workspace from your phone. Rather than building a custom chat server or separate mobile app, `agy-hq` pairs a ready-to-run workspace template with a small, zero-dependency Go helper (`./bin/hq`) that makes Antigravity behave like a coordinated personal assistant: keeping one main chat responsive, isolating parallel tasks in separate directories, locking personal notes inside a git-ignored `local/` vault, and even auditing local logs (`./bin/hq obs`) to show why a 130-step background worker actually bills fewer fresh tokens than waking up an idle main chat twice. *(If you enjoy the backstory on why prompt-only rules struggled before adding hooks, those earlier notes are [here](/en/blog/agent-harness-microkernel/)—you don't need them, as everything below starts from scratch.)*

![UI and disk anatomy of agy-hq: Top shows the 3-pane Google Antigravity layout (Sidebar with pinned Front Desk and task threads, center chat with a 2-second reply and 1-tap SHA-256 approval card, right pinned hq_console.md card). Bottom shows the local zero-dependency Go helper and the two-layer split between tracked code and the git-ignored local/ vault.](/diagrams/agy-hq-architecture-en.svg)

*What `agy-hq` looks like in practice: you talk to one pinned `[HQ] Front Desk` assistant from laptop or phone alongside a zero-token live board (`hq_console.md`), while a local Go helper dispatches heavy work to the background and keeps personal files inside `local/`.*

## Try it in 60 seconds (`--demo`)

**Prerequisites:** Google Antigravity on macOS or Linux (or WSL2 on Windows), **Go 1.22+**, and **Git**.

Cloning someone else's personal-assistant template usually feels lifeless at first because your notes, inbox, and task board start empty. To make `agy-hq` tangible right away, `./scripts/bootstrap.sh --demo` compiles `./bin/hq` (~1 second using only the Go standard library) and populates `local/` with a synthetic `[Sample]` sandbox—a fictional `ACME` quarterly filing in `local/inbox/`, a sample thesis note with exit triggers, active tasks on the board, and a staged outbound command ready to approve or reject:

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

Open the `agy-hq` folder in Google Antigravity and send any message. The `SessionStart` hook initializes `[HQ] Front Desk` (pin it to the top of your sidebar), pins the live `hq_console.md` board on the right, and loads your compact startup memory.

## Tracing one 3-part prompt from your phone

To see how it feels like an assistant rather than a single-repo coding tab, trace what happens when you open Antigravity's Remote Control on your phone and send one mixed message to `[HQ] Front Desk`:

> *"Is 2pm free today? Also diff the ACME 10-Q in my inbox against my notes, and fix PR #279 in `~/src/web-app`."*

Without guardrails, an eager agent would start reading the filing, editing `~/src/web-app`, and running `npm test` directly inside your main chat—freezing your phone screen for five minutes before answering whether 2pm is open. Here is what `agy-hq` does instead:

1. **Answers the 2pm check in two seconds (`<= 3` reads per turn):** On `[HQ] Front Desk`, `./bin/hq hook pre-tool` allows up to three lightweight read-only lookups *per user turn*—so checking your calendar finishes immediately. If the Front Desk tries to edit source code, run a test suite, or make a fourth read, the hook blocks the call and tells it to dispatch background workers so your assistant stays free for your next message.
2. **Checks out an isolated `git worktree` in any local repo:** Your codebases don't need to sit inside `agy-hq`. Passing `--repo=~/src/web-app --task=web-fix-pr279` checks out an isolated Git worktree and branch under `local/worktrees/web-fix-pr279/`, where a background worker (or a dedicated `[Task:web]` sidebar thread for multi-turn design) edits code and runs tests without touching your main `~/src/web-app` checkout or colliding with another task on the same repo.
3. **Quarantines untrusted files against prompt injection:** Meanwhile, a second background worker opens `local/inbox/acme-q3-10q-sample.txt` via `./bin/hq quarantine`. Because external attachments and emails can hide prompt-injection instructions, `quarantine` wraps the text as untrusted data and marks that session ID as **tainted**—mechanically blocking file writes, outbound CLI commands, spawning clean child subagents to escape the taint, and calling external `mcp_*` plugin tools.
4. **Refreshes the live board in 0 tokens and asks 1-tap approval:** At the end of each turn, `./bin/hq hook stop` updates the pinned `hq_console.md` card in pure Go (`0` extra LLM tokens, zero markdown status tables spammed into chat). Whenever a worker wants to perform an irreversible external action—sending a message, emailing someone, or merging PR `#279`—it stages the exact command via `./bin/hq propose`, quotes the full unescaped payload in chat, and pops up Antigravity's native **Approve / Reject** card on your phone (or on an optional `127.0.0.1:4242` local web console guarded by a 256-bit CSRF token). Tapping **Approve** verifies at least 8 hex characters of the `SHA-256` hash (`sha256:e9519584`) before executing it.

## Modular Markdown skills—keep only what you use

A personal assistant covers different domains for different people, so seeing workflows like `filing-diff`, `ledger-ingest`, or `gchat` often raises a fair question from developers: *"Do I need SEC filings, plain-text accounting, or Google Chat set up—or have to edit Go code—just to use `agy-hq`?"*

**Not at all.** Every workflow in `.agents/plugins/agy-hq/skills/*/SKILL.md` is an independent, plain-Markdown runbook (`<= 150` lines) loaded only when relevant—not compiled Go logic and not a sequential pipeline:

![3x3 modular grid of the 9 independent built-in SKILL.md plugins (swe-pulse, morning-brief, sleep-consolidate, inbox-triage, gchat, filing-diff, thesis-check, ledger-ingest, tax-prep), showing each skill can be used or removed independently over a shared Go safety floor.](/diagrams/agy-hq-workflows-en.svg)

*Nine independent `SKILL.md` plug-ins over a shared Go safety floor. You don't need Go to edit or write skills—and you can ignore or delete any optional domain you don't use.*

- **Core engineering & bounded memory (`swe-pulse`, `morning-brief`, `sleep-consolidate`):** If you only want an engineering and daily-planning assistant, these three give you multi-repo `git worktree` orchestration and PR/CI tracking, a morning rollup of calendar items, open PRs, and pending approvals, plus self-cleaning memory. Startup memory (`local/MEMORY.md`) is capped at `<= 80` lines by Go so startup prompts stay lean, linking to `local/memory/topics/*.md` notes that `sleep-consolidate` cross-checks against raw tool outputs at night so unverified claims don't stick.
- **Intake & optional domain plug-ins (`inbox-triage`, `gchat`, `filing-diff`, `thesis-check`, `ledger-ingest`, `tax-prep`):** Drop-in Markdown skills for quarantined file triage, Google Chat spaces/drafts, section-by-section `10-K`/`10-Q` diffs, investment thesis checks, and local `Beancount`/`hledger` or tax workpapers. Skip them, delete them, or drop in your own `SKILL.md` in two minutes.

Across every skill, the **two-layer `local/` vault** keeps personal life out of Git history: tracked engine code and generic skills live in `agy-hq/`, while all personal notes, memory logs, worktrees, and private records live inside git-ignored `local/`—backed up to its own private `local/.git` repository and guarded by 6 pre-commit privacy checks.

## Matching models to jobs—and why new deep thinkers like Gemini 4 Carbon fit right in

Splitting a responsive Front Desk from background workers also solves a growing headache as frontier reasoning models—most recently **Gemini 4 Carbon**—lean into longer, 10-to-15-minute verification and self-checking loops. In a traditional single-window chat, letting a heavy reasoning model explore a race condition or security audit across 100+ steps locks up your assistant the entire time; conversely, leaving a frontier model attached to a casual chat burns scarce quota every time you check your schedule.

Because `agy-hq` delegates heavy work out of the main thread, `./bin/hq` automatically right-sizes models by task complexity: **`quick`** (`gemini-3.8-flash-low`) for status checks and triage, **`standard`** (`gemini-3.8-flash-high`) for everyday coding and document extraction, and **`deep`** (`gemini-4-carbon-high`, or any explicit `--model` override you prefer) for architecture design, subtle concurrency bugs, security audits, and thesis stress-testing. Your assistant stays instant up front while long-horizon models get uninterrupted room—and deterministic Go guardrails—to do their best work in isolated background worktrees.

## Does delegating to subagents blow up your token budget? (`./bin/hq obs`)

Whenever I describe delegating coding and research out of the main thread into background subagents, the first practical question people ask is: **"Doesn't spawning subagents burn way more tokens?"**

To measure instead of guessing, `agy-hq` includes `./bin/hq obs`, which parses Antigravity's local `transcript.jsonl` step logs—fresh uncached `input_tokens`, prefix-cached `cache_read_tokens`, and `output_tokens`—in pure Go at zero token cost. Auditing **68 real conversations (4,894 model steps and 505.8 million gross tokens)** revealed the exact opposite of what I originally expected:

![Empirical chart from ./bin/hq obs across 68 conversations: 130-step and 151-step continuous coding subagents hit 97.4% and 97.9% prefix cache (burning only 396k and 430k uncached input tokens), while 2 idle Front Desk wakeup steps at 207k context burned 414k. The 160k compaction watermark drops cold wakeups from 252k to 27k (-89.2%).](/diagrams/agy-hq-token-obs-en.svg)

*Measured across 505.8M gross tokens: continuous background subagents stay warm inside the ~5-minute prefix-cache window, whereas an uncompacted main chat waking up after idle gaps pays full uncached prompt cost.*

- **Workspace-wide, `92.1%` of all prompt tokens hit prefix cache** (`462.5M` cached reads vs. `39.8M` uncached fresh input).
- **Continuous coding subagents are remarkably cache-efficient (`97.4%–97.9%` hit):** Because a background worker steps every 3 to 8 seconds, almost every turn lands inside the ~5-minute prefix-cache TTL. A 130-step coding subagent (`15.2M` gross tokens) billed only **`396k` uncached input tokens**; a 151-step subagent (`20.6M` gross tokens) billed **`430k`**.
- **Idle gaps on a bloated main chat are the real budget sink (`0%` cache hit):** Because `[HQ] Front Desk` stays open across days while human messages and scheduled jobs arrive 10 minutes to hours apart, its prefix cache expires between turns. Once the Front Desk drifted to `207k` context tokens, **just 2 wakeup steps** (after 11- and 29-minute idle gaps) billed **`414k` uncached input tokens—more fresh input in two coordinator turns than a 130-step coding subagent!**

To eliminate that "cold-wakeup tax," `agy-hq` tracks live context size and nudges `/compact` (or a clean shift handover) once `[HQ] Front Desk` crosses **`160k` tokens**—cutting cold wakeups from `252k` down to `27k` tokens (**`89.2%` less per wakeup**) while `local/MEMORY.md` preserves continuity.

## Good to know & grab what's useful

Two practical notes if you take `agy-hq` for a spin:

1. **The 3-lookup cap on the Front Desk is deliberately strict.** Occasionally, a simple question happens to need a fourth file read; the hook will force `[HQ] Front Desk` to hand off to a quick background subagent rather than risk letting a slow investigation block your phone chat. Every cap, routing tier, and skill lives in plain Go, YAML, and Markdown if you prefer looser defaults.
2. **Pulling updates won't clobber your private vault.** Running `./bin/hq upgrade` snapshots your private `local/.git`, fast-forwards `main`, rebuilds `./bin/hq` in ~1 second, runs non-destructive config migrations, and checks workspace health with `./bin/hq doctor`—backed by 21 isolated sandbox end-to-end tests (~1.8s).

Even if you don't need a full personal headquarters workspace, feel free to grab individual pieces: the zero-dependency Go `PreToolUse` / `Stop` hook skeleton, `./bin/hq obs` to inspect prefix-cache hit rates across your own Antigravity logs, or the two-layer `local/` vault layout.

Everything is live at **[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)** (Apache 2.0). If you try `--demo`, adapt it into your own personal assistant setup, or hit rough edges, I'd love to hear from you in Discussions or Issues!

<details>
<summary>Want the exact CLI overview, routing tiers, and telemetry numbers?</summary>

Prepared with AI assistance. Figures correspond to [github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq) as of November 11, 2026, with chart data recorded in [summary.json](/experiments/introducing-agy-hq/summary.json).

- **Host & zero-dependency Go helper (`./bin/hq`):** Built with the Go 1.22+ standard library (`0` external dependencies in `go.mod`). Plugs into `.agents/hooks.json` (`SessionStart`, `PreToolUse`, `Stop`). Everyday commands include `./bin/hq status`, `./bin/hq doctor`, `./bin/hq obs [--days=N] [--json]`, `./bin/hq spawn --repo=<path> --task=<slug>`, `./bin/hq subagent`, `./bin/hq worktree add|list|prune`, `./bin/hq propose` / `approve` / `reject`, `./bin/hq webui` (`127.0.0.1:4242`), and `./bin/hq upgrade`.
- **Smart model & thinking-depth routing:** Automatic task classification routes `quick` tasks to `gemini-3.8-flash-low`, `standard` coding/extraction tasks to `gemini-3.8-flash-high`, and `deep` architecture, security audit, concurrency debugging, and thesis-falsification tasks to `gemini-4-carbon-high` (with explicit `--model` / `--depth` flags and natural-language overrides).
- **Front Desk & worktree isolation:** `local/memory/front_desk.json` tracks the active Front Desk conversation lease. On that thread, `PreToolUse` allows up to `3` read-only inspection calls per turn and denies inline `edit_file`, `write_file` (outside `hq_console.md`), and test suites (`go test`, `npm test`, `pytest`). Coding tasks isolate branches under `local/worktrees/<repo>-<task>/`. `Stop` refreshes `hq_console.md` and `local/memory/journal/` in pure Go (`0` extra LLM tokens).
- **Nine modular skills (`<= 150` lines each):** `swe-pulse`, `morning-brief`, `sleep-consolidate`, `inbox-triage`, `gchat`, `filing-diff`, `thesis-check`, `ledger-ingest`, and `tax-prep`. Startup memory (`local/MEMORY.md`) is mechanically capped at `<= 80` lines.
- **Quarantine, approval & privacy gates:** Tainted sessions (`local/memory/tainted/<conv>.json`) block file writes, outbound CLI commands, child `invoke_subagent` / `hq spawn` escapes, and external `mcp_*` calls. Outbound proposals verify `>= 8`-char `SHA-256` prefixes; the optional `127.0.0.1:4242` WebUI enforces loopback `Host` + same-origin `Origin` / `Sec-Fetch-Site` + `application/json` + constant-time 256-bit `X-HQ-CSRF` checks. Pre-commit and pre-push checks (`./bin/hq ci pre-push`, `~2.5s`) verify `6/6` privacy rules (including `local/pii-denylist.txt` and `--history` patch scanning), `18/18` simulated hook security probes, and `21` isolated end-to-end sandbox workflows (`~1.8s`).
- **Token & prefix-cache audit (`./bin/hq obs`):** Across `68` Antigravity `transcript.jsonl` logs (`4,894` reasoning and compaction steps; `505,830,652` gross tokens = `39,816,608` uncached `input_tokens` + `462,514,486` `cache_read_tokens` + `3,499,558` `output_tokens`), overall prefix-cache hit ratio was `92.1%`. Continuous coding subagents hit `97.4%` (`130` steps, `395,917` uncached) and `97.9%` (`151` steps, `430,040` uncached), while `[HQ] Front Desk` (`110` turns, `500` steps) incurred `49` cold wakeups (`9,505,555` uncached tokens, `23.9%` of workspace uncached spend). Context watermarks warn at `160,000` tokens (`critical` at `200,000`), cutting cold wakeups from `252,166` to `27,244` tokens (`-89.2%`).

</details>
