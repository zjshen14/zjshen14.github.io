---
title: "Turning Google Antigravity into a Multitasking Personal Agent"
seoTitle: "Turning Google Antigravity into a Multitasking Personal Agent"
description: "Google Antigravity is built for coding, but I wanted one workspace on my phone and laptop to juggle code, research, and daily admin at the same time. Here is why prompt rules were not enough, and how a small Go helper keeps tasks from colliding."
ogImage: "/images/agent-harness-microkernel-en.png"
ogImageAlt: "Turning Google Antigravity into a Multitasking Personal Agent: Front Desk capped at 3 quick lookups, parallel tasks isolated in git worktrees, and outbound actions gated by 1-tap phone confirmation."
pubDate: 2026-11-10
tags: ["ai", "agent", "antigravity", "architecture", "golang", "engineering", "productivity"]
draft: false
---

**Google Antigravity** is designed first as an AI software engineering environment. Usually, you open a repository, start a thread, and let the agent read files, edit code, and run tests until a feature works.

After using it every day, I wanted something broader: **a multitasking personal agent.**

Instead of opening separate tools and windows for every project, I wanted one always-on workspace—accessible from my laptop or from my phone through Antigravity's Remote Control interface—that could juggle software engineering across multiple repositories, investment research, inbox triage, and family schedule reminders at the same time.

My first attempt was purely through prompts. I created a headquarters workspace and wrote a list of house rules in `AGENTS.md`: *treat the main thread like a front desk; answer quick questions right away; delegate coding and long research to background subagents; keep personal notes organized; ask before sending any external message.*

In calm, two-turn tests, that worked. In real daily multitasking, it kept breaking down. Ask the main thread why a build failed while you are walking out the door, and the agent reads a file "just to check." Then it spots an error, edits the code, runs the test suite, and tries to fix the next compiler warning. Five minutes later, your phone screen is still scrolling through test logs—and when you want to ask a five-second question about today's calendar or check on another project, your main entry point is stuck.

The fix was a simple division of labor: **reuse Antigravity for its mobile UI and background subagents, and attach a small local Go helper to lifecycle hooks so parallel tasks cannot collide—because prompts are advice, while hooks are rules.** Antigravity can run a local program before every tool call, and if that program says no, the tool call does not happen.

![Multitasking architecture: the Front Desk chat routes work while a local Go hook fence allows up to 3 quick read lookups and vetoes inline code edits or test runs, steering heavy tasks into isolated background worktrees.](/diagrams/harness-frontdesk-en.svg)

*How the Front Desk stays responsive: the main chat coordinates requests, while a local Go hook vetoes heavy inline tool calls and steers long work into parallel background workers.*

## Why I attached a small Go helper instead of building a new agent app

When prompt instructions failed to keep the main thread responsive, I considered switching to a standalone personal-agent framework or building a custom chat server.

Both options meant throwing away what Antigravity already did well. Out of the box, Antigravity already gave me:

- **Mobile Remote Control** that works cleanly from a phone browser without building a custom frontend.
- **Background subagents and separate task threads** that can run in parallel and report back when they finish.
- **Live Markdown status cards** that sit pinned right beside the conversation.
- **Lifecycle hooks** that invoke a local command before a session starts, before any tool executes, and after each turn ends.

I didn't need a new agent runtime. I only needed a traffic controller that wouldn't forget the rules when a debugging session got intense.

So I kept Antigravity as the user interface and agent engine, and wrote a small, zero-dependency Go helper I call `hq` (short for headquarters) that plugs into Antigravity's lifecycle hooks. The language model still handles **judgment**—understanding what I'm asking for, writing code, and synthesizing research—while the helper enforces the **multitasking boundaries**.

## A front desk that never blocks

In a single-project coding session, waiting a few minutes while the agent edits files and runs tests is normal. In a multitasking personal agent, the main conversation is your **Front Desk**. If the receptionist walks into the back room to spend twenty minutes repairing a machine, nobody is left at the counter.

Telling the model *"please delegate heavy work to a subagent"* is polite advice. When a bug looks like a one-line fix, the model's instinct to be immediately helpful overrides that advice.

A small local state file records the conversation ID of my pinned Front Desk thread. Whenever a tool call happens on that thread—and only on that thread—the Go helper steps in to enforce four rules:

1. **No inline coding or test runs at the Front Desk:** Any attempt to edit source files or run a test suite (`go test`, `npm test`, `pytest`) directly in the main thread is vetoed before the tool runs.
2. **At most 3 quick lookups per turn:** The Front Desk can check up to three quick things inline—such as reading a calendar entry, checking task status, or looking up a short note. On the fourth lookup, the hook blocks the tool call and instructs the agent to hand the job to a background subagent or open a dedicated task thread in the sidebar.
3. **Every coding task gets its own `git worktree`:** When the Front Desk dispatches a coding job, the helper creates an isolated checkout in its own folder. I can have one subagent refactoring a tool, another drafting a blog post, and a third checking an investment note without their branches or uncommitted files ever colliding.
4. **Silent status updates:** Instead of dumping progress checklists and branch tables into the chat, the end-of-turn hook reads the session log and updates a pinned status card automatically—burning **zero extra model tokens** and keeping the conversation clean.

With those hooks in place, the main thread behaves like a real coordinator: I can kick off a long coding task, immediately ask about a Thursday math competition on the family calendar, and get an answer in seconds while the coding subagent works in the background.

## Keeping work, personal notes, and external actions from colliding

Once the same agent is handling code, research notes, emails, and personal admin in one workspace, three other collisions show up quickly.

![Three boundaries in prose order: 1. Organized memory with an 80-line startup index, on-demand topic notes, and a nightly verification pass; 2. Quarantined reads and a hash-locked 1-tap phone approval gate; 3. A two-layer folder split between private notes and the public repo.](/diagrams/harness-layers-en.svg)

*Three boundaries that keep a general-purpose personal workspace from turning into a tangled mess, separating what deterministic Go code enforces from what the model judges.*

### 1. Keeping memory organized across unrelated topics

In my earlier posts on [running a local Qwen coding agent](/en/blog/local-qwen-opencode-3090/) and [tuning agent output limits](/en/blog/qwen-agentic-tuning-3090/), each session was self-contained. A personal agent, however, needs memory across days and weeks.

If you let an agent append freely to a single `MEMORY.md` file after every task, it quickly turns into a junk drawer: coding notes mix with family reminders, outdated tasks linger forever, and—worst of all—if the agent *thinks* it fixed something that actually failed, it writes its own unverified claim into long-term memory.

To prevent that, the setup splits memory management between deterministic Go checks and a scheduled model review:

- **A short startup index (`<= 80` lines, enforced by Go):** At the start of a session, the agent only loads a compact map of current priorities and links to deeper topic pages. The Go helper checks that this startup index never exceeds 80 lines.
- **Topic pages read on demand:** Detailed notes on software architecture, investment theses, or family schedules live in separate topic files and are loaded only when a conversation actually needs them.
- **A silent nightly verification pass:** At the end of each turn, the Go helper logs the raw tool outputs and turn summary automatically without extra model calls. Late at night, a scheduled background pass uses the model to cross-check the day's summaries against those raw tool outputs before updating the long-term topic files—and rolls any important findings into the next morning's brief.

### 2. One-tap mobile approval before acting on the outside world

When an agent can read incoming emails or downloaded files *and* has tools to send messages or merge pull requests, a hidden instruction inside an untrusted document could try to trick it into taking an external action.

Relying on a prompt rule like *"always ask me before sending a message"* is fragile when untrusted text sits in the same context window. Instead, the helper separates reading from acting:

- **Quarantined reading as a first filter:** Incoming files and emails are opened through a wrapper command that strips obvious instruction-like boilerplate and wraps the text as untrusted data. Pattern stripping is only a best-effort first filter—nobody should pretend regexes alone solve prompt injection—which is why external actions cannot rely on it.
- **Hash-locked 1-tap phone approval as the real boundary:** The agent cannot directly execute irreversible outbound commands (like sending an email or Google Chat message, or merging a pull request). It must ask the Go helper to stage the exact command as a proposal locked to a cryptographic hash, then present a one-tap multiple-choice prompt on my phone. Only when I tap **Approve** does the Go helper verify that the command hash matches and run that exact command.

### 3. Separating reusable agent code from private notes

A personal agent is only useful if it has access to your real notes, schedules, and financial records—but if those files sit in the same Git repository as your agent scripts and skills, a single careless `git add .` can leak personal data into a public repository.

The workspace solves this with a strict **two-layer folder split**:

- The root repository holds only the reusable Go helper, generic workflow skills, and documentation.
- Everything personal—notes, financial spreadsheets, memory files, and active task checkouts—lives inside a `local/` folder that is ignored by the root repository and backed up to its own private Git repo. Before every commit and push, the Go helper runs five automatic privacy checks to verify that no `local/` files, workstation paths, personal emails, or API keys ever cross into the public tree.

## Who checks the guardrails when the agent edits its own workflows?

Because I also use this agent to propose and apply improvements to its own workflow skill files, a natural question arises: **what happens when an agent-assisted edit accidentally weakens a guardrail?**

I had built an end-to-end test suite that simulates 18 full multitasking workflows in isolated temporary sandboxes—testing front-desk lookup limits, privacy scans, memory updates, and phone approval gates. Early on, however, I didn't run that full suite automatically before every `git push` because each of the 18 tests compiled the Go helper from scratch, taking **`10.5 seconds`** in total. When several background agents were committing and pushing across separate worktrees, a ten-second pause on every push felt just slow enough to skip.

Sure enough, the very first time the agent applied an automatic refinement to one of its own workflow skill files, the edit broke a structural assumption in the test suite—and because the 10.5-second sandbox suite wasn't wired into `git push`, the broken change went straight onto the main branch.

![18 end-to-end sandbox workflow tests drop from 10.5s to 1.8s (82.9% less time, ~5.8x faster) by compiling the Go helper once, enabling a ~2.5s automated pre-push gate with 5 privacy checks, 18 hook probes, and 18 sandbox runs.](/diagrams/harness-ci-en.svg)

*Compiling the Go helper once per test run and sharing it across all 18 test sandboxes cut the workflow suite from 10.5s to 1.8s (~5.8× faster)—making it fast enough to run alongside privacy and hook checks in ~2.5s before every push.*

The fix was straightforward: compile the Go helper **once** at the start of the test run, then copy that binary into each test's isolated sandbox. That cut the 18-workflow sandbox suite from **`10.5s` to `1.8s`—82.9% less time (about 5.8× faster)**.

Once the sandbox suite ran in under two seconds, I wired it directly into the repository's pre-push hook alongside the fast unit checks. Now, before any human or subagent push goes through, a **~2.5-second gate** automatically verifies three things:

- **Five privacy checks** confirm zero personal files, local paths, or keys exist in the tracked repository.
- **Eighteen simulated boundary probes** try to break the Front Desk lookup limit, inline edit block, and approval gate to confirm the hook vetoes every violation.
- **Eighteen end-to-end workflow runs** pass in clean temporary sandboxes (`1.8s`).

## What still breaks

Adding a Go helper around Antigravity solved the daily traffic jams, but it is not magic. Three rough edges still show up in practice:

1. **The 3-lookup cap is a blunt instrument.** Sometimes a genuinely simple question on my phone happens to need a fourth file read. When the hook blocks the fourth read, the Front Desk has to spawn a background subagent for a question that was five seconds away from an answer, adding a handoff delay.
2. **Shell command matching is a cat-and-mouse game.** Blocking file-editing tools and standard test runners (`go test`, `npm test`, `pytest`) catches 95% of accidental inline work, but an eager model can still occasionally pack a slow operation into an creative shell pipeline until I add that pattern to the blocklist.
3. **Clean task isolation does not guarantee a good delegation prompt.** The hook can force the Front Desk to delegate a coding task to a background subagent, but if the Front Desk writes a vague two-sentence brief when spawning that subagent, the subagent will still solve the wrong problem—just neatly inside its own isolated `git worktree`.

## What this changes in daily use

Wrapping Google Antigravity in a small Go helper doesn't make the underlying AI model smarter. When a background subagent is debugging a tricky race condition or analyzing a financial filing, the quality of the result still depends on the model and how the task is framed—just as I saw in my [decision-model post-training experiments](/en/blog/decision-model-after-b2/).

What it changes is **whether one agent workspace can handle your whole day without getting in its own way**:

- You can start a deep coding task or research review and still use the main chat on your phone for quick questions and coordination.
- Work across different repositories, personal notes, and long-term topics stays organized instead of bleeding into one giant context window.
- External actions stay safely behind a one-tap confirmation on your phone, and private notes never accidentally slip into a public commit.

If you are customizing an AI coding agent to handle more of your daily workflow, a useful question to ask whenever you add a new rule to `AGENTS.md` is:

> **Is this a rough preference for how the model should write, or a boundary that keeps my tasks from colliding? If it is a boundary, can a small hook enforce it automatically?**

<details>
<summary>Want the exact measurements and technical setup details?</summary>

Prepared with AI assistance. This post describes my personal multitasking setup built on Google Antigravity as of November 2026. The [summary JSON](/experiments/agent-harness-microkernel/summary.json) records the exact figures used in the diagrams above.

- **Host & helper setup:** Runs on Google Antigravity (using its mobile Remote Control web interface, subagent spawning, live Markdown artifacts, and `hooks.json` lifecycle hooks) paired with a local Go helper binary (`./bin/hq`) built using only the Go standard library (`0` external dependencies in `go.mod`). Workflow instructions are organized into 9 progressive-disclosure `SKILL.md` files (kept to `<= 150` lines each, or `~628` frontmatter tokens in total, so they don't bloat startup context).
- **Front Desk lease & non-blocking hook:** The pinned Front Desk conversation ID is stored in `local/memory/front_desk.json`. Antigravity's `PreToolUse` hook invokes `./bin/hq hook pre-tool`. On the Front Desk thread, read/search inspection calls (`read_file`, `grep_search`, `find_by_name`, and read-only shell lookups) are capped at `3` per turn; the 4th lookup is denied with an instruction to delegate to a subagent or separate task thread. Direct file edits (`edit_file`, `write_file` outside `hq_console.md`) and test runners (`go test`, `npm test`, `pytest`) are denied on the Front Desk thread. Parallel coding tasks are isolated in `local/worktrees/<repo>-<task>/`.
- **Zero-token status board & turn logs:** Antigravity's `Stop` hook triggers `./bin/hq hook stop` at the end of each turn to parse the session's JSONL transcript directly in Go, updating the live `hq_console.md` status card and per-conversation turn journals (`local/memory/journal/`) with `0` extra LLM tokens.
- **Memory, approval hashes & privacy checks:** The startup memory index (`local/MEMORY.md`) is capped at `<= 80` lines, pointing to on-demand topic files (`local/memory/topics/*.md`) and timestamped facts (`local/memory/facts.jsonl`). Outbound actions are staged via `./bin/hq propose`, which locks the command string with a `SHA-256` digest verified by `./bin/hq approve <id> --sha256=<prefix>`. The pre-commit and pre-push privacy scanner checks 5 invariants (`5/5`): no `local/` or key files, no hardcoded workstation paths (`/home/<user>/`, `/Users/<user>/`), email allowlist compliance, no API/OAuth token patterns, and no personal identifiers from the local vault.
- **Test suite speedup (`10.5s → 1.8s`, `~5.8×` faster):** Sharing a single `sync.Once`-compiled `bin/hq` binary across all 18 isolated end-to-end workflow sandboxes reduced `go test ./internal/e2e` runtime from `10.5s` (when each test ran `go build` separately) to `1.8s` (`82.9%` less time, `~5.8×` speedup), allowing the full privacy checks (`5/5`), hook boundary probes (`18/18`), and end-to-end sandbox workflows (`18/18`) to run inside `.git/hooks/pre-push` in roughly `2.5s`.

</details>
