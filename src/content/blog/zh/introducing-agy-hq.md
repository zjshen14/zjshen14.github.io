---
title: "分享 agy-hq：把 Google Antigravity 用成多任务并行的个人助理 Agent"
seoTitle: "agy-hq：基于 Google Antigravity 的多任务个人助理 Agent 工作区"
description: "向社区分享我每天自用的 Google Antigravity 个人助理工作区 agy-hq：配合零外部依赖的 Go 小助手，在手机与电脑上并行打理多仓编码、笔记研究、收件箱分拣与日常事务，并自动按任务轻重分流 Flash 与 Gemini 4 Carbon 等模型。"
ogImage: "/images/introducing-agy-hq-zh.png"
ogImageAlt: "分享 agy-hq：真正像个人助理一样秒回的前台总控、9 项模块化插件技能、local/ 私密库与一键审批、以及轻重模型分流与 97.9% 缓存命中实测。"
pubDate: 2026-11-11
tags: ["ai", "agent", "gemini", "antigravity", "golang", "productivity", "architecture", "engineering"]
draft: false
---

大多数 AI 编程工具默认的工作方式，更像一个“单线程外包工”：打开一个代码仓库，发起一段对话，然后干等着它读文件、改代码、跑完测试。

但一个真正好用的**个人助理**，绝不会因为你交办了一件棘手差事，就原地失联十分钟。在真实的日常节奏里——我经常一会儿在电脑前、一会儿出门掏出手机——手头的事很少乖乖待在某一个代码仓里，甚至不全是写代码。我希望有一个随叫随到的个人助理工作区：既能两秒钟告诉我“下午两点有空吗”，又能把刚收到的报告丢进收件箱对照旧笔记提炼重点，同时还能让两个不同项目各自在后台修 Bug 跑测试——而眼前的这个对话入口永远清爽、随时能接住我的下一句话。

今天想把我自己每天重度使用的这套工作区分享给社区：**[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)**。

`agy-hq`（取自 *headquarters* 总控台）运行在 **Google Antigravity** 之上——这是一款内置了后台子代理、实时 Markdown 看板卡片、本地生命周期钩子，以及 **Remote Control 手机远程网页界面**的 Agent 优先开发平台。`agy-hq` 没有另起炉灶重造聊天服务端或手机 App，而是用一套开箱即用的工作区模板配上一个仅用 Go 标准库编写、零外部依赖的本地小助手（`./bin/hq`），让 Antigravity 真正像一位懂分寸的个人助理那样运转：前台秒回不卡壳、重活分流到各自独立的后台目录、所有私人笔记与账本稳稳锁在被 Git 忽略的 `local/` 私密库里，还顺带内置了零开销缓存审计工具（`./bin/hq obs`），从真实日志里算清了为什么后台连跑 130 步的子代理反而比闲置主对话唤醒两步更省配额。（如果你对早期“为什么单靠提示词管不住多任务并发”的设计背景感兴趣，可以看[前一篇笔记](/zh/blog/agent-harness-microkernel/)；完全不需要先读那篇，下文全部从零讲起。）

![界面与目录解剖图：上方展示 Google Antigravity 内的三栏真实界面（左侧边栏置顶主对话与并行任务、中间主对话秒回气泡与原生一键审批卡、右侧零 Token 自动刷新的置顶看板）；下方展示本地零依赖 Go 钩子引擎与 agy-hq/ 同 local/ 私密库的双层目录结构。](/diagrams/agy-hq-architecture-zh.svg)

*`agy-hq` 在屏幕与磁盘上的真实形态：你在电脑或手机上统一对着置顶的 `[HQ] Front Desk` 个人助理说话，右侧看板（`hq_console.md`）由本地 Go 钩子零 Token 自动刷新，底层将通用代码与 `local/` 私密库干净分离。*

## 一分钟沙箱上手（`--demo`）

**运行环境要求：** macOS 或 Linux（Windows 可通过 WSL2）上的 Google Antigravity、**Go 1.22+** 以及 **Git**。

克隆别人的个人助理模板时，最常见的劝退点就是“空仓冷启动”：笔记、收件箱和看板全是空的，根本试不出效果。为此，`./scripts/bootstrap.sh --demo` 会在约 1 秒内用纯 Go 标准库编译出 `./bin/hq`，并在本地 `local/` 下生成一套开箱可玩的 `[Sample]` 合成沙箱——包含放在 `local/inbox/` 供测试隔离读取的虚构公司 `ACME` 季报、带明确止损条件的研究笔记、看板上的活跃任务，以及一条已经锁定命令哈希、随时可点击测试的外发提案：

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

要感受它为什么像一位“多任务个人助理”而不是普通单仓编程窗口，直接跟着解剖图里的那条手机消息走一遍最直观——假设你在路上打开手机 Remote Control，对着 `[HQ] Front Desk` 发出一句话：

> *“今天下午两点有空吗？顺便对比一下收件箱里的 ACME 季报和我的笔记，再把 `~/src/web-app` 里的 PR #279 修一下。”*

如果换成普通单窗口模式，Agent 往往会当场开始读长篇季报、直接修改 `~/src/web-app` 源码并跑起 `npm test`，把你的手机聊天框生生卡死五分钟，最后才告诉你两点钟有没有空。而在 `agy-hq` 里，这条指令会按四步干净拆解：

1. **两点钟的日程两秒内直接答复（主对话每轮限 `3` 次只读查看）：** 在 `[HQ] Front Desk` 会话里，`./bin/hq hook pre-tool` 允许**每次用户提问**最多执行 3 次轻量只读查询，查日历两秒钟当场回复。一旦主对话试图直接改源码、跑测试套件，或者发起第 4 次读取，钩子会立刻拦下并让它派发后台任务——确保你的个人助理随时空出来接下一句话。
2. **跨仓库自动检出独立的 `git worktree`：** 你的业务代码仓库完全不需要搬进 `agy-hq` 目录。传入 `--repo=~/src/web-app --task=web-fix-pr279` 后，小助手会在 `local/worktrees/web-fix-pr279/` 下自动拉出独立的分支工作区，由后台子代理（遇到需要多轮深入讨论的设计，则用 `./bin/hq spawn` 在左侧边栏拉起独立的 `[Task:web]` 会话）在里面改代码、跑测试——既不动你原本的 `~/src/web-app` 目录，也不会跟另一个同时修该仓库其他 Bug 的任务撞车。
3. **外部附件自动走“污点隔离”防提示词注入：** 与此同时，第二个后台任务通过 `./bin/hq quarantine` 打开 `local/inbox/acme-q3-10q-sample.txt`。因为外部文档或邮件里可能藏着诱导模型越权的提示词，`quarantine` 会将内容包裹为不可信数据，并给当前会话 ID 打上**污点标记（Tainted）**——在底层硬性封禁写文件、执行外发命令、拉起干净子代理“借壳逃逸”，以及调用外部 `mcp_*` 插件工具。
4. **零 Token 自动刷看板 + 手机端原生一键哈希确认：** 每轮对话结束时，`./bin/hq hook stop` 直接用纯 Go 解析本地轨迹并刷新右侧置顶的 `hq_console.md` 看板（`0` 额外模型 Token，不在聊天流里刷屏贴进度表）。当后台任务需要执行不可逆外部动作（发消息、发邮件、合并 PR `#279`）时，必须先通过 `./bin/hq propose` 登记完整命令，在对话中原样展示正文，并在手机端弹出 Antigravity 原生的 **批准 / 拒绝** 单选确认卡（也可在带 256 位 CSRF 令牌保护的本地 `127.0.0.1:4242` 网页端操作）。点下批准后，`./bin/hq approve` 严格比对至少 8 位 `SHA-256` 命令哈希前缀（如 `sha256:e9519584`）无误才放行。

## 九项纯 Markdown 模块化技能：按你的日常自由取舍

每个人的个人助理需要打理的领域各不相同。看到目录里有 `filing-diff`（财报对比）、`ledger-ingest`（复式记账）或 `gchat`，不少只做软件开发的同学可能会问：*“我不看美股季报也不用纯文本记账，难道还得先配一堆外部工具或者改 Go 代码才能用吗？”*

**完全不需要。** `.agents/plugins/agy-hq/skills/*/SKILL.md` 下的每一个技能，都只是互不耦合、不超过 `150` 行的纯 Markdown 说明文档，聊到相关任务才按需读取——既没写死在 Go 代码里，也不是串联流水线：

![模块化技能矩阵图：3x3 网格展示 9 个互不耦合的内置 SKILL.md 插件（swe-pulse、morning-brief、sleep-consolidate、inbox-triage、gchat、filing-diff、thesis-check、ledger-ingest、tax-prep），无需串联执行，可按需保留或删除，底层统一继承 Go 安全与测试护栏。](/diagrams/agy-hq-workflows-zh.svg)

*9 个彼此独立的 `SKILL.md` 插件共享同一层 Go 安全底座。修改或新增技能无需懂 Go，用不上的领域直接忽略或删掉文件夹即可。*

- **核心研发与日常记忆（`swe-pulse`、`morning-brief`、`sleep-consolidate`）：** 如果你只需要一位研发与日常规划助理，这三个核心技能就已经包揽了跨仓独立 `git worktree` 与 PR/CI 巡检、每天早上的日程/PR/待批提案简报，以及不会越用越肿的长期记忆。启动记忆索引 `local/MEMORY.md` 由 Go 强制限制在 `<= 80` 行以内，细节指向按需读取的 `local/memory/topics/*.md`；每天深夜由 `sleep-consolidate` 对照当天真实的原始工具日志核实后再归档，避免未验证的幻觉污染记忆库。
- **消息分拣与可选领域插件（`inbox-triage`、`gchat`、`filing-diff`、`thesis-check`、`ledger-ingest`、`tax-prep`）：** 分别对应收件箱污点分拣、Google Chat 空间查看与一键发信、连续两期 `10-K`/`10-Q` 财报比对、投资逻辑核验，以及本地 `Beancount`/`hledger` 记账与税务清单。不用的直接跳过，或者花两分钟写一份自己的 `SKILL.md` 放进去就能生效。

无论启用哪几个技能，底层的**双层目录隔离**始终把私人生活挡在 Git 历史之外：通用引擎与技能留在 `agy-hq/`，所有个人笔记、记忆日志、任务分支与私密账本严格留在被 Git 忽略的 `local/` 内——由独立的私有 `local/.git` 备份，并由 6 项提交前隐私扫描自动把关。

## 按轻重缓急派模型：遇到 Gemini 4 Carbon 这类深思考模型尤其顺手

把“秒回的前台助理”和“埋头干活的后台专员”拆开，在面对最新一代长程推理模型（比如最近刚发布的 **Gemini 4 Carbon**）时还有一个非常实在的好处：这类旗舰模型往往会花 10 到 15 分钟做深度思考与上百步自验证闭环。如果直接放在传统单窗口里跑，你的助理在接下来一刻钟里就彻底没法理你了；反过来，如果把重型模型一直挂在日常主对话上用来查日程、看状态，又会白白浪费宝贵配额。

在 `agy-hq` 里，`./bin/hq` 会顺着任务的轻重缓急自动选模型：状态查询与收件箱分拣走 **`quick`**（`gemini-3.8-flash-low`），日常功能开发与文档提取走 **`standard`**（`gemini-3.8-flash-high`），只有遇到架构设计、隐蔽并发 Bug、安全审计或投资逻辑证伪这类硬骨头时，才自动派发 **`deep`**（`gemini-4-carbon-high`，也随时支持通过 `--model` 指定你偏好的其他模型）进入独立的后台分支深挖——前台助理依旧秒回，后台重剑也能在代码护栏内放手发挥。

## 频繁派发后台子代理，会把配额烧穿吗？（`./bin/hq obs`）

每次聊起“把写代码和查资料全部派给后台子代理”，大家最关心的实际问题几乎都是：**“动不动拉起子代理，Token 消耗不会翻倍吗？”**

为了拿真实账单说话，`agy-hq` 内置了零模型开销的 `./bin/hq obs`，直接用 Go 解析本地 `transcript.jsonl` 里的每一步指标——未缓存新增输入（`input_tokens`）、前缀缓存读取（`cache_read_tokens`）与输出（`output_tokens`）。统计了我日常积累的 **68 段真实会话（4,894 个推理步、累计吞吐 5.06 亿总 Token）** 后，结论跟直觉刚好相反：

![实测对比图：通过 ./bin/hq obs 解析 68 段真实会话，连续跑 130 步和 151 步的后台子代理缓存命中率达 97.4% 和 97.9%，仅消耗 396k 和 430k 未缓存输入 Token；而 207k 上下文的闲置主对话仅唤醒 2 步就消耗 414k。通过内置 160k 水位提醒压缩，单次冷唤醒从 252k 降至 27k（减少 89.2%）。](/diagrams/agy-hq-token-obs-zh.svg)

*基于 5.06 亿总 Token 的真实日志实测：高频连续干活的后台子代理稳稳吃满 ~5 分钟前缀缓存，反而是长期不关、隔一阵唤醒一次的大上下文主对话更费配额。*

- **全局 `92.1%` 的输入都命中了前缀缓存**（4.63 亿 Token 走缓存读取，真正计费的未缓存新增输入仅 3,982 万）。
- **连续干活的后台子代理极其省配额（缓存命中率 `97.4%–97.9%`）：** 后台子代理改代码、跑测试时，每两步之间只隔 3 到 8 秒，全程处在约 5 分钟的前缀缓存热窗口内。实测一个连跑 **130 步**的编码子代理（总吞吐 1,524 万 Token），全程只花了 **`396k` 未缓存输入 Token**；连跑 **151 步**的子代理（总吞吐 2,059 万 Token）也只花了 **`430k`**。
- **真正烧配额的是“带着大上下文闲置唤醒”的主对话（命中率 `0%`）：** 置顶的 `[HQ] Front Desk` 往往连开好几天，人的提问或定时任务隔十几分钟乃至几小时才来一次，前缀缓存早已过期归零。当主对话涨到 `207k` 上下文时，**仅仅闲置唤醒 2 步**（间隔 11 分钟与 29 分钟），就烧掉了 **`414k` 未缓存输入 Token**——两步闲聊调度的未缓存消耗，比后台连跑 130 步写代码还要贵！

针对这个“冷唤醒税”，`agy-hq` 内置了上下文水位监控：一旦 `[HQ] Front Desk` 超过 **`160k` Token** 就会主动提醒执行 `/compact` 压缩（或交班换新会话），把单次冷唤醒输入从 `252k` 直接压回 `27k`（**单次立省 `89.2%`**），同时靠 `local/MEMORY.md` 保证长期上下文不断档。

## 上手须知与按需取用

如果你准备克隆下来试试，有两处日常细节值得提前了解：

1. **“前台每轮最多 3 次查询”是刻意偏严格的默认设置。** 偶尔碰到刚好要读第 4 个文件才能答完的简单问题时，钩子也会强制让 `[HQ] Front Desk` 转交轻量后台子代理去查——用偶尔多几秒的后台转交，换取手机上的助理主入口在任何时候都不会卡住。所有阈值、分流规则和技能文件都是纯文本 Go / YAML / Markdown，随时能按你的习惯调整。
2. **跟进上游更新不会冲掉你的私人数据。** 运行 `./bin/hq upgrade` 会先为你的 `local/.git` 私密库打快照，再拉取最新分支、约 1 秒重编零依赖的 `./bin/hq`、执行无损配置迁移并用 `./bin/hq doctor` 自检；仓库自带约 1.8 秒跑完的 21 项隔离沙箱端到端测试兜底。

哪怕你暂时不需要一整套个人助理工作区，也很欢迎直接拆走其中顺手的零件：比如零依赖的 Go `PreToolUse` / `Stop` 钩子骨架、用来算清本机 Antigravity 真实缓存命中率的 `./bin/hq obs`，或是把私人笔记与代码仓干净隔离的 `local/` 双层目录结构。

完整代码与说明都已放在 **[github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)**（Apache 2.0 协议）。欢迎跑一遍 `--demo` 试试手感，如果你在打磨自己个人助理 Agent 的过程中有了新点子或踩到了边缘情况，随时来 Discussions 或 Issues 聊聊！

<details>
<summary>想看常用 CLI 命令速览、护栏参数与实测细节？展开这里</summary>

本文在 AI 协助下整理，所有配置参数与实测数据对应 2026 年 11 月 11 日发布的 [github.com/zjshen14/agy-hq](https://github.com/zjshen14/agy-hq)，图表原始数据保存在 [summary.json](/experiments/introducing-agy-hq/summary.json) 中。

- **宿主环境与零依赖 Go 助手（`./bin/hq`）：** 仅使用 Go 1.22+ 标准库构建（`go.mod` 零外部依赖），挂载于 `.agents/hooks.json`（`SessionStart`、`PreToolUse`、`Stop`）。常用命令包括：`./bin/hq status`、`./bin/hq doctor`、`./bin/hq obs [--days=N] [--json]`、`./bin/hq spawn --repo=<path> --task=<slug>`、`./bin/hq subagent`、`./bin/hq worktree add|list|prune`、`./bin/hq propose` / `approve` / `reject`、`./bin/hq webui`（默认 `127.0.0.1:4242`）以及 `./bin/hq upgrade`。
- **模型与思考深度分流：** 自动按任务复杂度路由——轻量分拣与状态查询走 `quick`（`gemini-3.8-flash-low`），常规功能编码与信息提取走 `standard`（`gemini-3.8-flash-high`），架构设计、并发根因排查、安全审计与投资逻辑证伪走 `deep`（`gemini-4-carbon-high`），并支持 `--model` / `--depth` 参数或自然语言显式覆盖。
- **主对话防卡死与 Worktree 隔离：** `local/memory/front_desk.json` 记录置顶主对话租约；在该会话中，`PreToolUse` 每轮放行最多 `3` 次只读查看，直接否决源码编辑（`edit_file`、`hq_console.md` 之外的 `write_file`）及测试套件（`go test`、`npm test`、`pytest`）。并行编码任务自动隔离在 `local/worktrees/<repo>-<task>/`。`Stop` 钩子以纯 Go 更新侧边栏看板与回合日志（`0` 额外模型 Token）。
- **9 项模块化技能（每项 `<= 150` 行）：** `swe-pulse`、`morning-brief`、`sleep-consolidate`、`inbox-triage`、`gchat`、`filing-diff`、`thesis-check`、`ledger-ingest` 与 `tax-prep`。启动记忆索引 `local/MEMORY.md` 由 Go 强制限制在 `<= 80` 行以内。
- **污点隔离、外发审批与隐私门禁：** 读取外部不可信文件的污点会话（`local/memory/tainted/<conv>.json`）封禁直接写文件、外发命令行、子代理借壳（`invoke_subagent` / `hq spawn`）及外部 `mcp_*` 插件调用。外发审批强制核验至少 `8` 位十六进制 `SHA-256` 哈希前缀；可选本地 `127.0.0.1:4242` 面板启用回环 `Host`、同源 `Origin` / `Sec-Fetch-Site`、`application/json` 及常量时间比对的 256 位随机 `X-HQ-CSRF` 令牌。推送前门禁（`./bin/hq ci pre-push`，约 `2.5 秒`）自动校验 `6/6` 项隐私规则（支持 `local/pii-denylist.txt` 与 `--history` 历史补丁扫描）、`18/18` 次钩子安全探测与 `21` 项隔离沙箱端到端工作流测试（约 `1.8 秒`）。
- **Token 与前缀缓存实测（`./bin/hq obs`）：** 解析本地 `68` 段 Antigravity `transcript.jsonl` 轨迹（`4,894` 个推理与压缩步骤；总吞吐 `505,830,652` Token = 未缓存输入 `39,816,608` + 缓存读取 `462,514,486` + 输出 `3,499,558`），全局前缀缓存命中率 `92.1%`。连续编码子代理命中率达 `97.4%`（`130` 步，`395,917` 未缓存）与 `97.9%`（`151` 步，`430,040` 未缓存）；`[HQ] Front Desk`（`110` 轮、`500` 步）历经 `49` 次冷启动（累计 `9,505,555` 未缓存输入，占全工作区 `23.9%`）。内置 `160,000` 预警水位线（`200,000` 严重告警）可将压缩后的单次冷唤醒输入从 `252,166` 降至 `27,244` Token（`-89.2%`）。

</details>
