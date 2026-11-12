// Native SVG UI anatomy, modular skill grid & telemetry graphs for introducing-agy-hq.
// Numbers come from public/experiments/introducing-agy-hq/summary.json.
// Run from the repository root: node docs/introducing-agy-hq/build_visuals.mjs
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/experiments/introducing-agy-hq/summary.json', 'utf8'));
if (
  data.workspace_and_skills.built_in_skills !== 9 ||
  data.safety_and_verification.end_to_end_sandbox_workflows !== 21 ||
  data.token_and_prefix_cache_telemetry.conversations_analyzed !== 68
) {
  throw new Error('Summary JSON invariants do not match expected diagram values');
}

const ink = '#1e293b';
const muted = '#52606d';
const purple = '#5b46b2';
const purpleBg = '#f2effb';
const purpleStroke = '#cbbef5';
const teal = '#14746a';
const tealBg = '#eaf6f3';
const tealStroke = '#b5dfd8';
const amber = '#9c5700';
const amberBg = '#fef6e7';
const amberStroke = '#f3d39c';
const coral = '#b84a39';
const coralBg = '#f9eae7';
const coralStroke = '#e5b8b0';
const slateBg = '#f4f6f8';
const slateStroke = '#d5dce2';

const esc = v =>
  String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const text = (x, y, v, size = 20, fill = ink, weight = 400, more = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${more}>${esc(v)}</text>`;

const rect = (x, y, w, h, fill, rx = 14, more = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${more}/>`;

const line = (x1, y1, x2, y2, color = '#64748b', width = 2.5, more = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${more}/>`;

function svg(w, h, title, desc, body, bg = '#fbfaf7') {
  const defs = `<defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="#64748b"/>
    </marker>
    <marker id="arr-teal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="${teal}"/>
    </marker>
    <marker id="arr-purple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="${purple}"/>
    </marker>
  </defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>${defs}<rect width="${w}" height="${h}" fill="${bg}" rx="16"/><g font-family="Noto Sans CJK SC, Noto Sans, system-ui, -apple-system, sans-serif">${body}</g></svg>\n`;
}

// Diagram 1: Concrete UI & Disk Anatomy (What You Actually See on Screen + On Disk)
function architecture(lang) {
  const zh = lang === 'zh';
  const title = zh
    ? 'agy-hq 界面与目录解剖：你在屏幕上看到什么、底层跑着什么'
    : 'Inside agy-hq: What You See on Screen vs. What Runs on Disk';
  let out = text(32, 48, title, zh ? 23 : 21, ink, 700);
  out += text(
    32,
    78,
    zh
      ? '上半部为 Antigravity 桌面与手机端真实交互布局；下半部为本地零依赖 Go 钩子与双层目录'
      : 'Top: live Google Antigravity layout (desktop & phone UI) · Bottom: local Go hooks & folder split',
    zh ? 15.5 : 14.8,
    muted
  );

  // Top Window Frame: Antigravity UI (3 Panes: Sidebar | Front Desk Chat | Live Console Card)
  out += rect(20, 98, 680, 356, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  // Window top bar
  out += rect(20, 98, 680, 36, slateBg, 14, `stroke="${slateStroke}" stroke-width="1.5"`);
  out += `<circle cx="42" cy="116" r="5.5" fill="#f87171"/><circle cx="60" cy="116" r="5.5" fill="#fbbf24"/><circle cx="78" cy="116" r="5.5" fill="#34d399"/>`;
  out += text(
    360,
    122,
    zh
      ? 'Google Antigravity（桌面 IDE / 手机 Remote Control 远程界面）'
      : 'Google Antigravity (Desktop IDE & Phone Remote Control UI)',
    13.5,
    muted,
    700,
    'text-anchor="middle"'
  );

  // Pane 1 (Left): Sidebar Thread List (x=34..204)
  out += rect(34, 146, 170, 294, slateBg, 10, `stroke="${slateStroke}" stroke-width="1.5"`);
  out += text(48, 170, zh ? '侧边栏会话列表' : 'Sidebar Threads', 13.5, muted, 700);

  // Pinned Front Desk item
  out += rect(44, 182, 150, 52, purpleBg, 8, `stroke="${purpleStroke}" stroke-width="1.8"`);
  out += text(54, 204, zh ? '📌 [HQ] 前台总控' : '📌 [HQ] Front Desk', 13, purple, 700);
  out += text(54, 224, zh ? '常驻置顶 · 秒级问答' : 'Pinned · Never blocks', 11.5, ink, 500);

  // Spawned task threads
  out += text(48, 256, zh ? '并行任务与自动任务' : 'Active & Scheduled', 12, muted, 600);
  const sideItems = zh
    ? [
        ['[Task:web] 修 PR #279', '独立 worktree · 深度模型'],
        ['[Task:ACME] 季报核对', '污点隔离沙箱 · Flash'],
        ['[Auto] 07:30 早间简报', '定时触发守护']
      ]
    : [
        ['[Task:web] Fix PR #279', 'Isolated git worktree'],
        ['[Task:ACME] 10-Q Diff', 'Quarantined researcher'],
        ['[Auto] Morning Brief', '7:30 AM cron schedule']
      ];
  sideItems.forEach(([t1, t2], idx) => {
    const sy = 266 + idx * 54;
    out += rect(44, sy, 150, 46, '#ffffff', 7, `stroke="${slateStroke}"`);
    out += text(52, sy + 20, t1, 12, ink, 600);
    out += text(52, sy + 37, t2, 11, muted, 400);
  });

  // Pane 2 (Center): [HQ] Front Desk Chat + 1-Tap Native Approval Card (x=216..478)
  out += rect(216, 146, 262, 294, '#ffffff', 10, `stroke="${purpleStroke}" stroke-width="1.8"`);
  out += text(230, 170, zh ? '[HQ] Front Desk 对话流' : '[HQ] Front Desk Chat', 13.5, purple, 700);

  // User prompt bubble
  out += rect(230, 182, 234, 54, slateBg, 8, `stroke="${slateStroke}"`);
  out += text(240, 202, zh ? '你：“下午两点有空吗？顺便对比收件' : 'You: "Is 2pm free? Also diff the', 12, ink, 600);
  out += text(240, 222, zh ? '箱里的 ACME 季报并修下 PR #279。”' : 'ACME 10-Q and fix PR #279."', 12, ink, 600);

  // Fast agent reply bubble
  out += rect(230, 246, 234, 64, tealBg, 8, `stroke="${tealStroke}"`);
  out += text(240, 266, zh ? '前台 (2秒回)：“两点空闲（查1/3）。' : 'Front Desk (2s): "2pm is open.', 12, teal, 700);
  out += text(240, 285, zh ? '季报对比与 PR #279 已分流至后台' : 'Dispatched 10-Q diff & PR #279', 11.8, ink, 500);
  out += text(240, 302, zh ? '独立目录，我随时待命。”' : 'to background worktrees."', 11.8, ink, 500);

  // 1-Tap Native Approval Card
  out += rect(230, 322, 234, 106, amberBg, 8, `stroke="${amberStroke}" stroke-width="1.6"`);
  out += text(240, 342, zh ? '原生一键审批卡 (展示完整命令)' : '1-Tap Approval Card (Full Preview)', 12, amber, 700);
  out += text(240, 362, zh ? '发布 ACME 摘要？sha256:e9519584' : 'Publish ACME digest? sha256:e9519584', 11.5, ink, 600);
  out += text(240, 380, zh ? '"Gross margin 64.2% (+140 bps)..."' : '"Gross margin 64.2% (+140 bps)..."', 11, muted, 500);
  out += rect(240, 392, 98, 26, teal, 6);
  out += text(289, 410, zh ? '✓ 批准执行' : '✓ Approve', 12, '#ffffff', 700, 'text-anchor="middle"');
  out += rect(348, 392, 98, 26, '#ffffff', 6, `stroke="${coralStroke}" stroke-width="1.5"`);
  out += text(397, 410, zh ? '✕ 拒绝' : '✕ Reject', 12, coral, 700, 'text-anchor="middle"');

  // Pane 3 (Right): Pinned Live Console Card hq_console.md (x=490..686)
  out += rect(490, 146, 196, 294, tealBg, 10, `stroke="${tealStroke}" stroke-width="1.6"`);
  out += text(502, 170, zh ? '置顶看板 hq_console.md' : 'Pinned hq_console.md', 13, teal, 700);
  out += text(502, 188, zh ? 'Go 自动刷新 · 0 模型 Token' : 'Go auto-sync · 0 LLM tokens', 11.2, muted, 600);

  const consoleRows = zh
    ? [
        ['活跃任务', '2 个后台运行中', ink],
        ['独立分支', 'web-fix-pr279', purple],
        ['待批提案', '1 项 (e9519584)', amber],
        ['记忆索引', '13 / 80 行 (健康)', teal],
        ['主台水位', '42k / 160k Token', teal]
      ]
    : [
        ['Tasks', '2 running in bg', ink],
        ['Worktree', 'web-fix-pr279', purple],
        ['Approvals', '1 pending (sha256)', amber],
        ['MEMORY.md', '13 / 80 lines', teal],
        ['Context', '42k / 160k (OK)', teal]
      ];
  consoleRows.forEach(([k, v, col], idx) => {
    const cy = 200 + idx * 46;
    out += rect(500, cy, 176, 38, '#ffffff', 6, `stroke="${tealStroke}"`);
    out += text(508, cy + 16, k, 11, muted, 600);
    out += text(508, cy + 31, v, 12, col, 700);
  });

  // Connectors from UI down to Local Hook Engine & Two-Layer Disk
  out += line(230, 454, 230, 482, '#64748b', 2.4, 'marker-end="url(#arr)"');
  out += line(520, 454, 520, 482, teal, 2.4, 'marker-end="url(#arr-teal)"');

  // Bottom Left: Zero-Dep Go Hook Binary (./bin/hq)
  out += rect(20, 488, 332, 188, '#1e293b', 14);
  out += text(36, 520, zh ? '本地零依赖 Go 引擎 (./bin/hq)' : 'Zero-Dependency Go Helper (./bin/hq)', zh ? 16.5 : 15, '#ffffff', 700);
  out += text(36, 548, zh ? '• 按需派单：轻量秒回，重活按难度选模型' : '• Smart routing: fast Desk + tiered workers', 12.8, '#cbd5e1', 500);
  out += text(36, 574, zh ? '• PreToolUse：主台限 3 次查询，禁直接改码' : '• PreToolUse: caps Desk at 3 reads; no edits', 12.8, '#86efac', 600);
  out += text(36, 600, zh ? '• 污点与哈希锁：隔离外部附件，校验 ≥8位哈希' : '• Safety: taints untrusted reads; checks hash', 12.8, '#fcd34d', 600);
  out += text(36, 626, zh ? '• Stop & obs：零开销刷看板、统计缓存命中率' : '• Stop & obs: 0-token board sync & cache stats', 12.8, '#cbd5e1', 500);
  out += text(36, 654, zh ? '（纯 Go 标准库零依赖，启动记忆 ≤80 行）' : '(Pure Go stdlib, <=80-line startup memory)', 12, '#94a3b8', 400);

  // Bottom Right: Two-Layer On-Disk Layout
  out += rect(368, 488, 332, 188, '#ffffff', 14, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(388, 520, zh ? '双层本地目录结构（代码与私密分离）' : 'Two-Layer Disk Layout (Code vs. Vault)', 16, ink, 700);

  out += rect(384, 534, 300, 56, purpleBg, 9, `stroke="${purpleStroke}"`);
  out += text(396, 556, zh ? 'agy-hq/（通用主仓库 · 可安全分享）' : 'agy-hq/ (Tracked Engine & 9 Skills)', 13, purple, 700);
  out += text(396, 577, zh ? 'cmd/hq · .agents/hooks.json · skills/*/SKILL.md' : 'cmd/hq · hooks.json · skills/*/SKILL.md', 11.5, ink, 500);

  out += rect(384, 602, 300, 60, amberBg, 9, `stroke="${amberStroke}"`);
  out += text(396, 624, zh ? 'local/（Git 忽略私密库 · 独立私有备份）' : 'local/ (Git-Ignored Private Vault)', 13, amber, 700);
  out += text(396, 646, zh ? 'inbox/ · notes/ · private/ · worktrees/<task>/' : 'inbox/ · notes/ · private/ · worktrees/<task>/', 11.5, ink, 500);

  return svg(
    720,
    696,
    title,
    zh
      ? '界面与目录解剖图：上方展示 Google Antigravity 内的三栏真实界面（左侧边栏置顶主对话与并行任务、中间主对话秒回气泡与原生一键审批卡、右侧零 Token 自动刷新的置顶看板）；下方展示本地零依赖 Go 钩子引擎与 agy-hq/ 同 local/ 私密库的双层目录结构。'
      : 'UI and disk anatomy of agy-hq: Top shows the 3-pane Google Antigravity layout (Sidebar with pinned Front Desk and task threads, center chat with a 2-second reply and 1-tap SHA-256 approval card, right pinned hq_console.md card). Bottom shows the local zero-dependency Go helper and the two-layer split between tracked code and the git-ignored local/ vault.',
    out
  );
}

// Diagram 2: 3x3 Modular Plug-In Skill Catalog (Zero Misleading Sequential Arrows!)
function workflows(lang) {
  const zh = lang === 'zh';
  const title = zh
    ? '9 项模块化内置技能（纯 Markdown 插件，互不耦合）'
    : '9 Modular Built-In Skills (Pure Markdown, Keep What You Use)';
  let out = text(32, 46, title, zh ? 23 : 20.5, ink, 700);
  out += text(
    32,
    76,
    zh
      ? '每项技能只是独立的 SKILL.md（≤150 行），无需改 Go 代码，用不上的领域可直接忽略或删除'
      : 'Independent <=150-line SKILL.md files · Zero Go edits needed; ignore or delete unused skills',
    zh ? 13.8 : 13.8,
    muted
  );

  const cards = zh
    ? [
        // Row 1: Core Engineering & Daily Rhythm (Purple)
        {
          badge: '核心研发',
          name: 'swe-pulse',
          sub: '多仓库研发编排',
          l1: '按任务检出独立 git worktree',
          l2: '汇总跨仓 PR/CI 并门禁合入',
          bg: purpleBg,
          stroke: purpleStroke,
          color: purple
        },
        {
          badge: '核心日常',
          name: 'morning-brief',
          sub: '07:30 早间全景简报',
          l1: '聚合日历、收件箱与待看 PR',
          l2: '集中列出待一键确认的提案',
          bg: purpleBg,
          stroke: purpleStroke,
          color: purple
        },
        {
          badge: '核心日常',
          name: 'sleep-consolidate',
          sub: '23:30 夜间记忆复核',
          l1: '核对真实工具日志防记忆幻觉',
          l2: '维持启动索引 ≤80 行不膨胀',
          bg: purpleBg,
          stroke: purpleStroke,
          color: purple
        },
        // Row 2: Quarantined Intake & Messaging (Teal)
        {
          badge: '消息分拣',
          name: 'inbox-triage',
          sub: '收件箱污点隔离分拣',
          l1: '在受限会话读取 local/inbox/',
          l2: '提炼结构化摘要写入笔记库',
          bg: tealBg,
          stroke: tealStroke,
          color: teal
        },
        {
          badge: '沟通·可选',
          name: 'gchat',
          sub: 'Google Chat 空间助手',
          l1: '检索未读群聊与私信上下文',
          l2: '生成带全文预览的一键发信提案',
          bg: tealBg,
          stroke: tealStroke,
          color: teal
        },
        {
          badge: '投研·可选',
          name: 'filing-diff',
          sub: '连续两期财报语义对比',
          l1: '逐节比对 10-K / 10-Q 变动',
          l2: '高亮新增风险因素与附注调整',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        },
        // Row 3: Optional Research & Plain-Text Finance (Amber)
        {
          badge: '投研·可选',
          name: 'thesis-check',
          sub: '投资逻辑与止损核验',
          l1: '对照预设论点评估最新财报',
          l2: '触发证伪或止损条件时预警',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        },
        {
          badge: '账务·可选',
          name: 'ledger-ingest',
          sub: '纯文本复式记账导入',
          l1: '解析银行 CSV/OFX 对账单',
          l2: '写入 local/private/ 并验平',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        },
        {
          badge: '账务·可选',
          name: 'tax-prep',
          sub: '税务底稿与清单追踪',
          l1: '提取 W-2 / 1099 表格字段',
          l2: '全程隔离在本地私密目录内',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        }
      ]
    : [
        // Row 1: Core Engineering & Daily Rhythm (Purple)
        {
          badge: 'Core',
          name: 'swe-pulse',
          sub: 'Multi-Repo Orchestrator',
          l1: 'Spawns isolated git worktrees;',
          l2: 'tracks PR/CI & stages merges',
          bg: purpleBg,
          stroke: purpleStroke,
          color: purple
        },
        {
          badge: 'Core',
          name: 'morning-brief',
          sub: 'Daily 7:30 AM Digest',
          l1: 'Rolls up calendar, inbox, open',
          l2: 'PRs & pending 1-tap approvals',
          bg: purpleBg,
          stroke: purpleStroke,
          color: purple
        },
        {
          badge: 'Core',
          name: 'sleep-consolidate',
          sub: 'Nightly Memory Audit',
          l1: 'Checks claims vs. raw tool logs;',
          l2: 'keeps MEMORY.md <= 80 lines',
          bg: purpleBg,
          stroke: purpleStroke,
          color: purple
        },
        // Row 2: Quarantined Intake & Messaging (Teal)
        {
          badge: 'Intake',
          name: 'inbox-triage',
          sub: 'Quarantined File Triage',
          l1: 'Reads local/inbox/ in tainted',
          l2: 'mode; extracts safe summaries',
          bg: tealBg,
          stroke: tealStroke,
          color: teal
        },
        {
          badge: 'Optional',
          name: 'gchat',
          sub: 'Google Chat Workflow',
          l1: 'Reads spaces/DMs & stages',
          l2: '1-tap SHA-256 send proposals',
          bg: tealBg,
          stroke: tealStroke,
          color: teal
        },
        {
          badge: 'Optional',
          name: 'filing-diff',
          sub: 'SEC 10-K / 10-Q Diff',
          l1: 'Section-by-section diff spotting',
          l2: 'new risks & footnote shifts',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        },
        // Row 3: Optional Research & Plain-Text Finance (Amber)
        {
          badge: 'Optional',
          name: 'thesis-check',
          sub: 'Thesis & Kill Criteria',
          l1: 'Tests new earnings releases',
          l2: 'against written exit triggers',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        },
        {
          badge: 'Optional',
          name: 'ledger-ingest',
          sub: 'Plain-Text Accounting',
          l1: 'Parses CSV/OFX into Beancount',
          l2: 'or hledger inside local/private/',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        },
        {
          badge: 'Optional',
          name: 'tax-prep',
          sub: 'Local Tax Workpapers',
          l1: 'Extracts W-2/1099 fields &',
          l2: 'checklists in local/private/',
          bg: amberBg,
          stroke: amberStroke,
          color: amber
        }
      ];

  const colW = 216;
  const rowH = 152;
  const gapX = 16;
  const gapY = 16;

  cards.forEach((c, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 20 + col * (colW + gapX);
    const y = 98 + row * (rowH + gapY);

    out += rect(x, y, colW, rowH, '#ffffff', 12, `stroke="${c.stroke}" stroke-width="1.8"`);
    // Top pill header strip
    out += rect(x + 12, y + 12, colW - 24, 26, c.bg, 6);
    out += text(x + 18, y + 30, c.name, 13, c.color, 700);
    out += text(x + colW - 18, y + 29, c.badge, 11, muted, 600, 'text-anchor="end"');

    out += text(x + 16, y + 64, c.sub, 15, ink, 700);
    out += text(x + 16, y + 96, c.l1, 12.8, muted, 500);
    out += text(x + 16, y + 118, c.l2, 12.8, muted, 500);
  });

  // Shared Safety Floor Strip at Bottom
  out += rect(20, 600, 680, 56, '#1e293b', 12);
  out += text(
    360,
    624,
    zh
      ? '所有技能共享同一套底层 Go 安全与回归护栏（无需每项技能重复实现）'
      : 'Every skill inherits the same deterministic Go safety & verification floor:',
    13,
    '#cbd5e1',
    500,
    'text-anchor="middle"'
  );
  out += text(
    360,
    644,
    zh
      ? '外部读取污点隔离 · ≥8 位哈希一键审批 · 6 项隐私扫描 · 21 项沙箱端到端测试 (~1.8s)'
      : 'Tainted-session quarantine · >=8-char SHA-256 approvals · 6 privacy checks · 21 sandbox E2E tests (~1.8s)',
    12.3,
    '#86efac',
    700,
    'text-anchor="middle"'
  );

  return svg(
    720,
    676,
    title,
    zh
      ? '模块化技能矩阵图：3x3 网格展示 9 个互不耦合的内置 SKILL.md 插件（swe-pulse、morning-brief、sleep-consolidate、inbox-triage、gchat、filing-diff、thesis-check、ledger-ingest、tax-prep），无需串联执行，可按需保留或删除，底层统一继承 Go 安全与测试护栏。'
      : '3x3 modular grid of the 9 independent built-in SKILL.md plugins (swe-pulse, morning-brief, sleep-consolidate, inbox-triage, gchat, filing-diff, thesis-check, ledger-ingest, tax-prep), showing each skill can be used or removed independently over a shared Go safety floor.',
    out
  );
}

// Diagram 3: Built-In Token & Cache Observability (./bin/hq obs)
function tokenObs(lang) {
  const zh = lang === 'zh';
  const sub130 = data.token_and_prefix_cache_telemetry.comparison.continuous_subagent_130_steps;
  const sub151 = data.token_and_prefix_cache_telemetry.comparison.continuous_subagent_151_steps;
  const idle2 = data.token_and_prefix_cache_telemetry.comparison.idle_front_desk_2_step_wakeup_at_207k;

  const title = zh
    ? '内置配额透视 (./bin/hq obs)：高频子代理 vs. 闲置主对话'
    : 'Built-In Token Telemetry (./bin/hq obs): Subagents vs. Idle Chat';
  let out = text(32, 48, title, zh ? 23 : 20.5, ink, 700);
  out += text(
    32,
    80,
    zh
      ? '实测 68 段真实会话（5.06 亿总 Token）：连续跑代码的子代理比闲置唤醒的主对话更省配额'
      : 'Across 68 conversations (505.8M gross tokens), >5-minute idle cache expiry dominated cost',
    zh ? 15.8 : 15,
    muted
  );

  // Top Panel: Uncached Input Token Comparison
  out += rect(20, 102, 680, 294, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(
    42,
    136,
    zh ? '实际计费的“未命中缓存”输入 Token 对比（越短越省）' : 'Uncached Input Tokens Billed (Fresh Prompt Cost)',
    18.5,
    ink,
    700
  );
  out += text(
    42,
    160,
    zh
      ? '后台子代理每隔 3–8 秒连续执行，前缀缓存始终滚烫；主对话闲置超 5 分钟后缓存归零'
      : 'Subagents step every 3–8s (warm prefix cache); idle chat wakes up after cache expires (0% hit)',
    14,
    muted
  );

  const maxTokens = 480000;
  const barX = 286;
  const barMaxW = 248;

  const bars = [
    {
      y: 184,
      label: zh ? '后台子代理（连续跑 130 步）' : 'Coding subagent (130 steps)',
      sub: zh ? '总吞吐 1524 万 · 缓存命中 97.4%' : '15.2M gross · 97.4% cache hit',
      val: sub130.uncached_input_tokens,
      color: teal,
      right: '396k'
    },
    {
      y: 246,
      label: zh ? '前台主对话（闲置唤醒仅 2 步）' : 'Idle Front Desk (just 2 steps!)',
      sub: zh ? '207k 上下文 · 闲置 11m/29m (命中 0%)' : '207k context · 11m & 29m idle (0% hit)',
      val: idle2.uncached_input_tokens,
      color: coral,
      right: '414k'
    },
    {
      y: 308,
      label: zh ? '后台子代理（连续跑 151 步）' : 'Coding subagent (151 steps)',
      sub: zh ? '总吞吐 2059 万 · 缓存命中 97.9%' : '20.6M gross · 97.9% cache hit',
      val: sub151.uncached_input_tokens,
      color: purple,
      right: '430k'
    }
  ];

  for (const b of bars) {
    out += text(42, b.y + 16, b.label, 15.5, b.color === coral ? coral : ink, 700);
    out += text(42, b.y + 36, b.sub, 12.5, muted, 500);
    out += rect(barX, b.y + 4, barMaxW, 30, '#f0eef4', 6);
    out += rect(barX, b.y + 4, Math.round((barMaxW * b.val) / maxTokens), 30, b.color, 6);
    out += text(676, b.y + 26, zh ? `${b.right} 未缓存` : `${b.right} uncached`, 16, b.color, 700, 'text-anchor="end"');
  }

  out += text(
    42,
    376,
    zh
      ? '结论：主对话闲置唤醒 2 步（414k），比连续跑 130 步的编码子代理（396k）更费配额。'
      : '2 idle chat wakeups (414k) billed more fresh input than a 130-step subagent (396k).',
    14,
    coral,
    700
  );

  // Bottom Panel: Compaction Watermark Solution
  out += rect(20, 414, 680, 186, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(
    42,
    448,
    zh ? '内置上下文水位守护：提前在 160k 提醒压缩，避开高水位冷启动' : 'Built-In 160k Context Watermark Instead of Drifting to ~255k',
    zh ? 18 : 17,
    ink,
    700
  );

  out += rect(42, 468, 290, 110, coralBg, 10, `stroke="${coralStroke}" stroke-width="1.5"`);
  out += text(187, 498, zh ? '放任不管：主对话涨到 ~255k' : 'Unchecked: Drift to ~255k', 15.5, coral, 700, 'text-anchor="middle"');
  out += text(187, 524, zh ? '49 次冷启动烧掉 951 万未缓存 Token' : '49 cold wakeups burned 9.51M fresh', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(187, 548, zh ? '单单一个主对话占去全局 23.9% 消耗' : '(23.9% of entire workspace spend!)', 13, coral, 600, 'text-anchor="middle"');

  out += line(332, 523, 376, 523, teal, 2.5, 'marker-end="url(#arr-teal)"');

  out += rect(382, 468, 296, 110, tealBg, 10, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(530, 498, zh ? '160k 水位线自动提醒 /compact' : 'Nudge /compact at 160k', 15.5, teal, 700, 'text-anchor="middle"');
  out += text(530, 524, zh ? '压缩后单次冷唤醒：252k → 27k' : 'Cold wakeup drops: 252k → 27k', 14, ink, 600, 'text-anchor="middle"');
  out += text(530, 548, zh ? '单次唤醒立省 89.2%，长期记忆零丢失' : '89.2% less per wakeup; vault intact', 13, teal, 700, 'text-anchor="middle"');

  return svg(
    720,
    620,
    title,
    zh
      ? '实测对比图：通过 ./bin/hq obs 解析 68 段真实会话，连续跑 130 步和 151 步的后台子代理缓存命中率达 97.4% 和 97.9%，仅消耗 396k 和 430k 未缓存输入 Token；而 207k 上下文的闲置主对话仅唤醒 2 步就消耗 414k。通过内置 160k 水位提醒压缩，单次冷唤醒从 252k 降至 27k（减少 89.2%）。'
      : 'Empirical chart from ./bin/hq obs across 68 conversations: 130-step and 151-step continuous coding subagents hit 97.4% and 97.9% prefix cache (burning only 396k and 430k uncached input tokens), while 2 idle Front Desk wakeup steps at 207k context burned 414k. The 160k compaction watermark drops cold wakeups from 252k to 27k (-89.2%).',
    out
  );
}

// Cover Card (1200x630): Personal Assistant Agent First, Subtle Model-Tiering Nod
function cover(lang) {
  const zh = lang === 'zh';
  let out = text(
    64,
    78,
    zh
      ? '多任务个人助理 Agent 分享 · github.com/zjshen14/agy-hq'
      : 'Personal Assistant Agent · github.com/zjshen14/agy-hq',
    24,
    muted,
    500
  );
  out += text(
    64,
    154,
    zh ? 'agy-hq：把 Google Antigravity' : 'Introducing agy-hq: A Multitasking',
    51,
    ink,
    700
  );
  out += text(
    64,
    224,
    zh ? '用成多任务并行的个人助理 Agent' : 'Personal Assistant on Antigravity',
    zh ? 48 : 47,
    ink,
    700
  );

  // Three clear pillar cards
  out += rect(64, 278, 344, 244, '#fff', 20);
  out += rect(428, 278, 344, 244, '#fff', 20);
  out += rect(792, 278, 344, 244, '#fff', 20);

  out += text(92, 332, zh ? '真正像助理一样秒回' : 'Works Like an Assistant', 21, muted, 600);
  out += text(92, 414, zh ? '9 项模块化技能' : '9 Plug-In Skills', zh ? 40 : 38, purple, 700);
  out += text(92, 476, zh ? '代码、日程、收件箱与笔记多线并行' : 'Coding, notes, inbox & admin in parallel', 15.5, muted);

  out += text(456, 332, zh ? '私密隔离与外发门禁' : 'Private & Safe by Default', 21, muted, 600);
  out += text(456, 414, zh ? 'local/ + 一键审批' : 'local/ + 1-Tap', zh ? 36 : 39, teal, 700);
  out += text(456, 476, zh ? '私密库隔离、污点沙箱与哈希确认' : 'Ignored vault, worktrees & hash lock', 16, muted);

  out += text(820, 332, zh ? '智能派单与配额透视' : 'Smart Routing & Cache', 21, muted, 600);
  out += text(820, 414, '97.9% Cache', 40, amber, 700);
  out += text(820, 476, zh ? '轻重分流 (含 Carbon) 与 hq obs 实测' : 'Flash/Carbon routing & ./bin/hq obs', 16, muted);

  out += text(
    64,
    584,
    zh
      ? '纯 Go 标准库零外部依赖 · 一行 ./scripts/bootstrap.sh --demo 一分钟体验完整沙箱。'
      : 'Zero external Go dependencies · Try the full sandbox in 60s with ./scripts/bootstrap.sh --demo',
    23,
    ink,
    500
  );

  return svg(
    1200,
    630,
    zh
      ? 'agy-hq：把 Google Antigravity 用成多任务并行的个人助理 Agent'
      : 'Introducing agy-hq: A Multitasking Personal Assistant Agent on Google Antigravity',
    zh
      ? '单入口秒回个人助理、9 项可选 Markdown 插件技能、local/ 私密库与一键审批门禁、以及轻重模型分流与缓存透视。'
      : 'One responsive Front Desk assistant, 9 modular Markdown skills, private local/ vault with 1-tap approvals, and tiered routing with zero-token cache observability.',
    out,
    '#f4f0e8'
  );
}

fs.mkdirSync('public/diagrams', { recursive: true });
fs.mkdirSync('public/images', { recursive: true });

for (const lang of ['en', 'zh']) {
  fs.writeFileSync(`public/diagrams/agy-hq-architecture-${lang}.svg`, architecture(lang));
  fs.writeFileSync(`public/diagrams/agy-hq-workflows-${lang}.svg`, workflows(lang));
  fs.writeFileSync(`public/diagrams/agy-hq-token-obs-${lang}.svg`, tokenObs(lang));
  fs.writeFileSync(`public/images/introducing-agy-hq-${lang}.svg`, cover(lang));
}

console.log('Generated six bilingual agy-hq introduction diagrams and two share-cover SVGs.');
