---
title: "分享 agy-hq：为 Gemini 4 Carbon 打造的多任务 Google Antigravity 个人工作区"
seoTitle: "agy-hq：在 Google Antigravity 中释放 Gemini 4 Carbon 并行战力的多任务工作区"
description: "向社区分享我每天自用的 Google Antigravity 个人工作区 agy-hq：用零外部依赖的 Go 小助手将 2 秒响应的 Flash 前台与并行跑代码的 Gemini 4 Carbon 后台分支、一键外发审批和零开销缓存透视连成一体。"
ogImage: "/images/introducing-agy-hq-zh.png"
ogImageAlt: "分享 agy-hq：前台秒回与 Flash + Gemini 4 Carbon 智能分流、9 项模块化插件与 local/ 一键审批、以及 97.9% 缓存命中率实测透视。"
pubDate: 2026-11-11
tags: ["ai", "agent", "gemini", "antigravity", "golang", "productivity", "architecture", "engineering"]
draft: false
---

这两天上手在 **Google Antigravity** 里体验 **Gemini 4 Carbon** 的朋友，大概率都会同时产生两个非常强烈的感受。

第一，它在长程复杂任务上的能力确实上了一个大台阶：开启深度思考（`high` thinking depth）并放手让它跑自验证循环时，Carbon 能顺着一条隐蔽的并发竞态一路追查到底、做完整的安全边界审计、起草多阶段架构方案，连续执行上百步工具调用依然条理清晰。但第二，**底层模型越能独立深挖，传统“单窗口聊天”的交互瓶颈就越扎眼**：当一个 `gemini-4-carbon-high` 任务在主窗口里深思熟虑、写复现测试、反复自检 15 分钟时，你的聊天框就彻底被占死了；反过来，如果你把这么重的旗舰模型一直挂在日常长会话里只为了查一句下午两点的日程或分拣一条普通消息，又会把宝贵的 Carbon 配额白白烧在琐碎调度上。

而在我真实的日常节奏里——经常一会儿在电脑前、一会儿在路上掏出手机——我希望同一个总控工作区能把这两头同时兼顾好：**前台随时提问两秒钟就有回音，后台同时让好几个 Gemini 4 Carbon 与 Flash 任务在不同仓库和研究笔记里火力全开。**

今天想把我自己每天重度使用的这套工作区分享给社区：**[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)**。

`agy-hq`（取自 *headquarters* 总控台）原生运行在 **Google Antigravity** 之上——这套 AI 研发平台自带后台子代理、实时 Markdown 看板卡片、本地生命周期钩子，以及能在手机浏览器里远程操控桌面工作区的 **Remote Control** 界面。`agy-hq` 没有重造聊天服务端或手机 App，而是用一套开箱即用的目录模板配上一个仅用 Go 标准库编写、零外部依赖的本地小助手（`./bin/hq`）：日常轻量问答走 Flash、硬核难题自动派发给 **Gemini 4 Carbon**，每个编码任务独占一个 `git worktree` 分支，私人数据稳稳锁在被忽略的 `local/` 私密库里，还自带零开销缓存透视工具（`./bin/hq obs`）——实测揭开了为什么后台连跑 130 步的专项子代理，计费的新增输入 Token 反而比闲置主对话唤醒两步还要省。（如果你对早期“为什么单靠提示词管不住并发工作流”的背景感兴趣，可以看[前一篇设计笔记](/zh/blog/agent-harness-microkernel/)；完全不需要先读那篇，下文全部从零讲起。）

![界面与目录解剖图：上方展示 Google Antigravity 内的三栏真实界面（左侧边栏置顶主对话与并行任务、中间主对话秒回气泡与原生一键审批卡、右侧零 Token 自动刷新的置顶看板）；下方展示本地零依赖 Go 钩子引擎与 agy-hq/ 同 local/ 私密库的双层目录结构。](/diagrams/agy-hq-architecture-zh.svg)

*`agy-hq` 的真实运行形态：你在电脑或手机上统一对着置顶的 `[HQ] Front Desk` 说话，右侧看板（`hq_console.md`）由 Go 钩子零 Token 自动刷新，后台按复杂度分流 `Carbon-high` 独立分支与 `Flash` 任务。*

## 一分钟沙箱上手（`--demo`）

**运行环境要求：** macOS 或 Linux（Windows 可通过 WSL2）上的 Google Antigravity、**Go 1.22+** 以及 **Git**。

克隆别人的个人 Agent 模板时，最常见的劝退点是“空仓冷启动”：笔记、收件箱和看板全是空的，根本试不出完整体验。为此，`./scripts/bootstrap.sh --demo` 会在约 1 秒内用纯 Go 标准库编译出 `./bin/hq`，并在本地 `local/` 下生成一套可直接把玩的 `[Sample]` 合成沙箱——包含放在 `local/inbox/` 供测试隔离读取的虚构公司 `ACME` 季报、带明确止损条件的研究笔记、看板上的活跃任务，以及一条已经锁定命令哈希、随时可体验批准或拒绝的外发提案：

```bash
git clone https://github.com/zjshen14/agy-hq.git && cd agy-hq
./scripts/bootstrap.sh --demo   # 不加 --demo 则初始化干净的空白 local/ 私密库
./bin/hq status
```

跑完 `./bin/hq status`，终端会立刻显示本地私密库状态与待确认的演示提案：

```text
Vault:            /path/to/agy-hq/local
Pending Actions:  1
Active Worktrees: 0
  - [prop-demo-acme-q3-alert] [Sample] Publish ACME Q3 10-Q digest: "Gross margin 64.2% (+140 bps YoY); watching 14-week substrate lead time" (demo_echo) sha256:e951958440e4
```

接着在 Google Antigravity 中打开 `agy-hq` 目录随便发句招呼，`SessionStart` 钩子就会自动认领 `[HQ] Front Desk`（建议顺手在左侧边栏置顶）、在右侧固定实时看板卡片，并加载精简启动记忆。

## 从手机发出一条“三合一指令”时，背后发生了什么？

与其罗列抽象规则，不如直接跟着上面解剖图里的那条手机消息走一遍——假设你在路上打开手机 Remote Control，对着 `[HQ] Front Desk` 发出一句话：

> *“今天下午两点有空吗？顺便对比一下收件箱里的 ACME 季报和我的笔记，再把 `~/src/web-app` 里 PR #279 那个偶发竞态 Bug 彻底查清楚修掉。”*

在 `agy-hq` 里，这条混合指令完全不会卡死你的手机窗口，而是按四步干净拆解：

1. **两点钟的日程两秒内直接答复（主对话每轮限 `3` 次只读查看）：** 在 `[HQ] Front Desk` 会话里，`./bin/hq hook pre-tool` 允许**每次用户提问**最多做 3 次轻量只读查询，查日历两秒钟当场回复。一旦主对话试图直接改源码、跑测试套件，或者发起第 4 次读取，钩子会立刻拦下并让它转交后台执行——确保你的手机主入口永远空出来接下一句话。
2. **跨仓库自动拉出独立 `git worktree` 交给 Carbon 深挖：** 你的业务仓库不需要搬进 `agy-hq`。传入 `--repo=~/src/web-app --task=web-fix-pr279` 后，小助手会在 `local/worktrees/web-fix-pr279/` 下自动检出独立分支目录，把这类棘手的并发排障交给 `gemini-4-carbon-high` 在里面安心复现、跑测试 15 分钟——既不动你原本的 `~/src/web-app` 目录，也不会跟同时修改该仓库的另一个后台任务互相覆盖。
3. **外部附件自动走“污点隔离”防提示词注入：** 与此同时，第二个后台任务通过 `./bin/hq quarantine` 打开 `local/inbox/acme-q3-10q-sample.txt`。因为外部文档或邮件里可能夹带诱导模型越权的隐藏提示词，`quarantine` 会将文本标记为不可信数据，并给当前会话 ID 打上**污点标记（Tainted）**——在底层硬性封禁写文件、执行外发命令、拉起干净子代理“借壳逃逸”，以及调用外部 `mcp_*` 插件工具。
4. **零 Token 自动刷看板 + 手机端原生一键哈希确认：** 每轮对话结束时，`./bin/hq hook stop` 直接用纯 Go 解析本地轨迹并刷新右侧置顶的 `hq_console.md` 看板（`0` 额外模型 Token，不在聊天流里刷进度表格）。当后台任务需要执行不可逆外部动作（发摘要消息、发邮件、合并 PR `#279`）时，必须先通过 `./bin/hq propose` 锁定完整命令，在对话中原样展示正文，并在手机端弹出 Antigravity 原生的 **批准 / 拒绝** 单选卡（也可在带 256 位 CSRF 保护的本地 `127.0.0.1:4242` 网页端操作）。点下批准后，`./bin/hq approve` 严格核对至少 8 位 `SHA-256` 命令哈希前缀（如 `sha256:e9519584`）无误才放行。

## 为什么配齐 Gemini 4 Carbon 后，`agy-hq` 的威力会成倍放大？

如果说早期的模型更像“对话里的快速补全助手”，那么 **Gemini 4 Carbon** 更像一位真正需要独立思考时间、测试闭环与多文件视野的资深工程师。把 Carbon 放进 `agy-hq` 的调度框架里，正好在三个维度上形成互补放大：

- **三档复杂度自动分流（日常用 `Flash` 提速，硬仗派 `Carbon-high` 攻坚）：** 拿 Carbon 去整理日常收件箱太浪费配额，拿轻量模型去啃深水区并发 Bug 又容易返工。`./bin/hq spawn` 与 `./bin/hq subagent` 内置了自动三级分流——收件箱分拣、状态汇总走 **`quick`**（`gemini-3.8-flash-low`）；常规功能开发、单测与财报字段提取走 **`standard`**（`gemini-3.8-flash-high`）；一旦涉及架构设计、竞态根因排查、安全与隐私审计或投资逻辑证伪，自动升级至 **`deep`**（`gemini-4-carbon-high`）。你也可以随时在提问里直接点名（例如*“用 Carbon 审计一下这段鉴权逻辑”*）或传 `--model=carbon --depth=high` 精准调用。
- **放手让 Carbon 跑完 100+ 步自验证闭环，而手机主台零等待：** Carbon 最惊艳的地方在于它愿意花时间自己写复现用例、跑测试验证并推翻错误假设（也可配合 Antigravity 的多智能体并行模式）。由于每个重任务都被限制在各自独立的 `local/worktrees/<repo>-<task>/` 分支内，你可以同时让两个仓库各自跑着 15 分钟的深度 Carbon 任务，而手机上的 `[HQ] Front Desk` 依然两秒响应，等后台跑通后再收一份干净的结论摘要。
- **用确定性的代码护栏，兜住更强自主模型的安全边界：** 模型的自主探索与代码改造能力越强，安全边界就越不能只靠系统提示词里的“请勿乱动”。因为分支隔离、外部文件污点封禁和外发动作的 `SHA-256` 一键审批全部由模型外部的 Go 代码硬性把关，你可以放心地把跨仓库重构或深度安全排查交给 `gemini-4-carbon-high` 在后台自主推进，所有真正对外的动作最终都握在你的指尖确认上。

## 九项纯 Markdown 模块化技能：只留你用得上的

看到目录里有 `filing-diff`（财报对比）、`ledger-ingest`（复式记账）或 `gchat`，不少只做软件开发的同学可能会问：*“我不看美股季报也不用纯文本记账，难道还得先配一堆外部工具或者改 Go 代码才能用吗？”*

**完全不需要。** `.agents/plugins/agy-hq/skills/*/SKILL.md` 下的每一个技能，都只是互不耦合、不超过 `150` 行的纯 Markdown 说明文档，聊到相关任务才按需加载——既没写死在 Go 代码里，也不是串联流水线：

![模块化技能矩阵图：3x3 网格展示 9 个互不耦合的内置 SKILL.md 插件（swe-pulse、morning-brief、sleep-consolidate、inbox-triage、gchat、filing-diff、thesis-check、ledger-ingest、tax-prep），无需串联执行，可按需保留或删除，底层统一继承 Go 安全与测试护栏。](/diagrams/agy-hq-workflows-zh.svg)

*9 个彼此独立的 `SKILL.md` 插件共享同一层 Go 安全底座。修改或新增技能无需懂 Go，用不上的领域直接忽略或删掉文件夹即可。*

- **核心研发与自清洁记忆（`swe-pulse`、`morning-brief`、`sleep-consolidate`）：** 如果你只关注写代码，这三个核心技能已经覆盖了跨仓独立 `git worktree` 与 PR/CI 巡检、早间待看 PR 与待批提案汇总，以及不膨胀的长期记忆。启动记忆索引 `local/MEMORY.md` 由 Go 强制限制在 `<= 80` 行以内，细节指向按需读取的 `local/memory/topics/*.md`；每天深夜由 `sleep-consolidate` 对照当天真实的原始工具输出核实后再更新笔记，防止未验证的幻觉污染记忆库。
- **消息分拣与可选领域插件（`inbox-triage`、`gchat`、`filing-diff`、`thesis-check`、`ledger-ingest`、`tax-prep`）：** 涵盖收件箱污点分拣、Google Chat 空间查看与一键发信、连续两期 `10-K`/`10-Q` 逐节语义对比、投资逻辑反证核验（这类深度挑刺也是 `gemini-4-carbon-high` 的强项），以及本地 `Beancount`/`hledger` 记账与税务清单。用不上的直接跳过，或者花两分钟写一个自己的 `SKILL.md` 放进去即可。

无论启用哪几个技能，**双层目录隔离**始终把私人数据挡在 Git 历史之外：通用引擎与技能留在 `agy-hq/`，所有个人笔记、记忆日志、任务分支与私密账本严格留在被 Git 忽略的 `local/` 内——由独立的私有 `local/.git` 备份，并由 6 项提交前隐私检查自动把关。

## 好钢用在刀刃上：5.06 亿 Token 真实缓存账单揭秘（`./bin/hq obs`）

用上 **Gemini 4 Carbon** 这样的旗舰推理模型后，怎么把配额花在刀刃上变得更加关键。每次聊起“把写代码和深度排查全都派给后台子代理”，大家几乎都会问：**“动不动拉起子代理，Token 配额不会翻倍烧穿吗？”**

为了拿真实数据说话，`agy-hq` 内置了零模型开销的 `./bin/hq obs`，直接用 Go 解析本地 `transcript.jsonl` 里的每一步指标——未缓存新增输入（`input_tokens`）、前缀缓存读取（`cache_read_tokens`）与输出（`output_tokens`）。统计了我日常积累的 **68 段真实会话（4,894 个推理步、累计吞吐 5.06 亿总 Token）** 后，结论恰恰颠覆了直觉：

![实测对比图：通过 ./bin/hq obs 解析 68 段真实会话，连续跑 130 步和 151 步的后台子代理缓存命中率达 97.4% 和 97.9%，仅消耗 396k 和 430k 未缓存输入 Token；而 207k 上下文的闲置主对话仅唤醒 2 步就消耗 414k。通过内置 160k 水位提醒压缩，单次冷唤醒从 252k 降至 27k（减少 89.2%）。](/diagrams/agy-hq-token-obs-zh.svg)

*基于 5.06 亿总 Token 的真实日志实测：高频连续干活的后台子代理稳稳吃满 ~5 分钟前缀缓存，反而是长期不关、隔一阵唤醒一次的大上下文主对话更费配额。*

- **全局 `92.1%` 的输入都命中了前缀缓存**（4.63 亿 Token 走缓存读取，真正计费的未缓存新增输入仅 3,982 万）。
- **连跑 130–151 步的后台子代理极其省配额（缓存命中率 `97.4%–97.9%`）：** 无论是编码还是跑 Carbon 自验证循环，后台子代理每两步之间只隔 3 到 8 秒，全程稳稳落在约 5 分钟的前缀缓存热窗口内。实测一个连跑 **130 步**的子代理（总吞吐 1,524 万 Token），全程只花了 **`396k` 未缓存输入 Token**；连跑 **151 步**的子代理（总吞吐 2,059 万 Token）也只花了 **`430k`**。
- **真正吞噬配额的是“带着大上下文闲置唤醒”的主对话（命中率 `0%`）：** 置顶的 `[HQ] Front Desk` 往往连开好几天，人的提问或定时任务隔十几分钟甚至几小时才来一次，前缀缓存早已过期归零。当主对话涨到 `207k` 上下文时，**仅仅闲置唤醒 2 步**（间隔 11 分钟与 29 分钟），就烧掉了 **`414k` 未缓存输入 Token**——两步闲聊调度的未缓存消耗，比后台连跑 130 步写代码还要贵！可以想象如果把旗舰模型长期挂在臃肿的主对话上随手问小事，每次冷启动得多交多少冤枉配额。

为此，`agy-hq` 内置了上下文水位守护：一旦 `[HQ] Front Desk` 超过 **`160k` Token** 就会主动提醒执行 `/compact` 压缩（或交班换新会话），把单次冷唤醒输入从 `252k` 直接压回 `27k`（**单次立省 `89.2%`**），把省下来的旗舰配额真正留给后台的硬核攻坚。

## 上手须知与按需取用

如果你准备克隆下来配合 Gemini 4 Carbon 试试，有两处细节值得提前知道：

1. **“前台每轮最多 3 次查询”是刻意偏严格的默认护栏。** 偶尔碰到刚好要读第 4 个文件才能答完的简单问题时，钩子也会强制让 `[HQ] Front Desk` 转交轻量后台子代理去查——用偶尔多几秒的转交，换取手机主界面在任何时候都不会卡死。所有阈值、模型分流策略与技能文件都是纯文本 Go / YAML / Markdown，随时能按你的习惯调宽。
2. **跟进上游更新不会冲掉你的私人数据。** 运行 `./bin/hq upgrade` 会先为你的 `local/.git` 私密库打快照，再拉取最新分支、约 1 秒重编零依赖的 `./bin/hq`、执行无损配置迁移并用 `./bin/hq doctor` 自检；仓库自带约 1.8 秒跑完的 21 项隔离沙箱端到端测试兜底。

哪怕你暂时不需要完整的工作区模板，也很欢迎拆走其中顺手的模块：比如零依赖的 Go `PreToolUse` / `Stop` 钩子骨架、`Flash` + `Gemini 4 Carbon` 自动三级分流器、用来透视本机 Antigravity 缓存命中率的 `./bin/hq obs`，或是 `local/` 双层私密目录设计。

完整代码与文档都已放在 **[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)**（Apache 2.0 协议）。欢迎搭着 Gemini 4 Carbon 跑一遍 `--demo` 试试手感，如果你在折腾个人工作区的过程中有了新玩法或踩到了边缘问题，随时来 Discussions 或 Issues 一起交流！

<details>
<summary>想看常用 CLI 命令速览、Carbon 分流规则与实测细节？展开这里</summary>

本文在 AI 协助下整理，所有配置参数与实测数据对应 2026 年 11 月 11 日发布的 [github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)，图表原始数据保存在 [summary.json](/experiments/introducing-agy-hq/summary.json) 中。

- **宿主环境与零依赖 Go 助手（`./bin/hq`）：** 仅使用 Go 1.22+ 标准库构建（`go.mod` 零外部依赖），挂载于 `.agents/hooks.json`（`SessionStart`、`PreToolUse`、`Stop`）。常用命令包括：`./bin/hq status`、`./bin/hq doctor`、`./bin/hq obs [--days=N] [--json]`、`./bin/hq spawn --repo=<path> --task=<slug> [--model=carbon --depth=high]`、`./bin/hq subagent`、`./bin/hq worktree add|list|prune`、`./bin/hq propose` / `approve` / `reject`、`./bin/hq webui`（默认 `127.0.0.1:4242`）以及 `./bin/hq upgrade`。
- **模型与思考深度智能分流：** 自动按任务复杂度分流——轻量分拣与状态查询路由至 `quick`（`gemini-3.8-flash-low`），常规功能编码与信息提取路由至 `standard`（`gemini-3.8-flash-high`），架构设计、并发根因排查、安全审计与投资逻辑证伪自动路由至 `deep`（`gemini-4-carbon-high`），并支持 `--model=flash|carbon|... --depth=low|medium|high` 参数或自然语言显式覆盖。
- **主对话防卡死与 Worktree 隔离：** `local/memory/front_desk.json` 记录置顶主对话租约；在该会话中，`PreToolUse` 每轮放行最多 `3` 次只读查看，直接否决源码编辑（`edit_file`、`hq_console.md` 之外的 `write_file`）及测试套件（`go test`、`npm test`、`pytest`）。并行编码任务自动隔离在 `local/worktrees/<repo>-<task>/`。`Stop` 钩子以纯 Go 更新侧边栏看板与回合日志（`0` 额外模型 Token）。
- **9 项模块化技能（每项 `<= 150` 行）：** `swe-pulse`、`morning-brief`、`sleep-consolidate`、`inbox-triage`、`gchat`、`filing-diff`、`thesis-check`、`ledger-ingest` 与 `tax-prep`。启动记忆索引 `local/MEMORY.md` 由 Go 强制限制在 `<= 80` 行以内。
- **污点隔离、外发审批与隐私门禁：** 读取外部不可信文件的污点会话（`local/memory/tainted/<conv>.json`）封禁直接写文件、外发命令行、子代理借壳（`invoke_subagent` / `hq spawn`）及外部 `mcp_*` 插件调用。外发审批强制核验至少 `8` 位十六进制 `SHA-256` 哈希前缀；可选本地 `127.0.0.1:4242` 面板启用回环 `Host`、同源 `Origin` / `Sec-Fetch-Site`、`application/json` 及常量时间比对的 256 位随机 `X-HQ-CSRF` 令牌。推送前门禁（`./bin/hq ci pre-push`，约 `2.5 秒`）自动校验 `6/6` 项隐私规则（支持 `local/pii-denylist.txt` 与 `--history` 历史补丁扫描）、`18/18` 次钩子安全探测与 `21` 项隔离沙箱端到端工作流测试（约 `1.8 秒`）。
- **Token 与前缀缓存实测（`./bin/hq obs`）：** 解析本地 `68` 段 Antigravity `transcript.jsonl` 轨迹（`4,894` 个推理与压缩步骤；总吞吐 `505,830,652` Token = 未缓存输入 `39,816,608` + 缓存读取 `462,514,486` + 输出 `3,499,558`），全局前缀缓存命中率 `92.1%`。连续编码子代理命中率达 `97.4%`（`130` 步，`395,917` 未缓存）与 `97.9%`（`151` 步，`430,040` 未缓存）；`[HQ] Front Desk`（`110` 轮、`500` 步）历经 `49` 次冷启动（累计 `9,505,555` 未缓存输入，占全工作区 `23.9%`）。内置 `160,000` 预警水位线（`200,000` 严重告警）可将压缩后的单次冷唤醒输入从 `252,166` 降至 `27,244` Token（`-89.2%`）。

</details>
