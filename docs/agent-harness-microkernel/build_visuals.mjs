// Native SVG architecture graphs for the bilingual agent-harness-microkernel blog post.
// Numbers come from public/experiments/agent-harness-microkernel/summary.json.
// Run from the repository root: node docs/agent-harness-microkernel/build_visuals.mjs
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/experiments/agent-harness-microkernel/summary.json', 'utf8'));
if (
  data.front_desk_guardrails.inline_lookup_cap_per_turn !== 3 ||
  data.front_desk_guardrails.simulated_boundary_probes.total !== 18 ||
  data.verification_and_pre_push_gate.end_to_end_sandbox_workflows !== 18
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

const path = (d, color = '#64748b', width = 2.5, more = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;

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
    <marker id="arr-amber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="${amber}"/>
    </marker>
    <marker id="arr-coral" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 Z" fill="${coral}"/>
    </marker>
  </defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>${defs}<rect width="${w}" height="${h}" fill="${bg}" rx="16"/><g font-family="Noto Sans CJK SC, Noto Sans, system-ui, -apple-system, sans-serif">${body}</g></svg>\n`;
}

// Architecture Graph 1: Front Desk Coordinator, Hook Fence & Parallel Worktrees
function frontdesk(lang) {
  const zh = lang === 'zh';
  const title = zh
    ? '多任务个人 Agent 架构：主对话分流与钩子护栏'
    : 'Multitasking Architecture: Front Desk & Hook Fence';
  let out = text(32, 48, title, zh ? 26 : 24, ink, 700);
  out += text(
    32,
    80,
    zh
      ? '主对话负责理解与派发；Go 小助手在每次工具调用前守住主对话边界'
      : 'The main chat routes work; the Go hook vetoes heavy inline calls so chat never freezes',
    zh ? 18 : 16,
    muted
  );

  // Outer Host Container: Google Antigravity
  out += rect(20, 102, 680, 626, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(40, 134, zh ? 'Google Antigravity 工作区' : 'Google Antigravity Workspace', 17, muted, 700);

  // Row 1: Phone / Laptop -> Front Desk -> Pinned Status Card
  out += rect(38, 152, 178, 96, slateBg, 12, `stroke="${slateStroke}" stroke-width="1.5"`);
  out += text(127, 188, zh ? '手机远程界面' : 'Phone UI', 19, ink, 700, 'text-anchor="middle"');
  out += text(127, 214, zh ? '与电脑端入口' : '& Laptop Chat', 15, muted, 500, 'text-anchor="middle"');
  out += text(127, 236, zh ? '提问 / 一键确认' : 'Ask / 1-Tap Confirm', 14, purple, 600, 'text-anchor="middle"');

  out += line(216, 200, 248, 200, '#64748b', 2.5, 'marker-end="url(#arr)"');

  // Center Box: Front Desk (Main Chat)
  out += rect(254, 152, 212, 96, purpleBg, 12, `stroke="${purpleStroke}" stroke-width="2"`);
  out += text(360, 186, zh ? '前台主对话' : 'Front Desk Chat', 20, purple, 700, 'text-anchor="middle"');
  out += text(360, 212, zh ? '置顶单入口 · 理解与调度' : 'Pinned intake · Coordinator', 14, ink, 500, 'text-anchor="middle"');
  out += text(360, 234, zh ? '决定直接回答或派发后台' : 'Answers fast or delegates', 13.5, muted, 400, 'text-anchor="middle"');

  // Right Box: Pinned Status Card
  out += rect(504, 152, 178, 96, tealBg, 12, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(593, 186, zh ? '置顶状态卡片' : 'Pinned Status Card', 17, teal, 700, 'text-anchor="middle"');
  out += text(593, 212, zh ? '每轮结束自动刷新' : 'Updated after each turn', 14, ink, 500, 'text-anchor="middle"');
  out += text(593, 234, zh ? '展示任务进度与待审批项' : 'Tasks · Branches · Gates', 13, muted, 400, 'text-anchor="middle"');

  // Arrow from Front Desk to Status Card (After-turn hook)
  out += line(466, 200, 498, 200, teal, 2.2, 'stroke-dasharray="5,4" marker-end="url(#arr-teal)"');

  // Two outgoing paths from Front Desk:
  // Path A (Left): Inline Tool Calls -> checked by Go Hook Fence
  out += path('M 310 248 L 310 296 L 190 296 L 190 326', coral, 2.5, 'marker-end="url(#arr-coral)"');
  out += text(226, 286, zh ? '主对话自己调工具' : 'Inline tool call', 14.5, coral, 700, 'text-anchor="middle"');

  // Path B (Right): Delegate heavy tasks -> Background Workers
  out += path('M 410 248 L 410 296 L 530 296 L 530 326', purple, 2.5, 'marker-end="url(#arr-purple)"');
  out += text(500, 286, zh ? '派发重任务' : 'Delegates heavy work', 14.5, purple, 700, 'text-anchor="middle"');

  // Left Column: Go Hook Fence on Front Desk Tool Calls
  out += rect(38, 332, 304, 132, '#1e293b', 14);
  out += text(190, 366, zh ? 'Go 钩子护栏 (本地小助手)' : 'Go Hook Fence (Local Helper)', 20, '#ffffff', 700, 'text-anchor="middle"');
  out += text(
    190,
    394,
    zh ? '✓ 允许：前 3 次轻量只读查询' : '✓ Allows up to 3 quick read lookups',
    15,
    '#86efac',
    600,
    'text-anchor="middle"'
  );
  out += text(
    190,
    420,
    zh ? '✗ 否决：第 4 次查询、直接改代码、跑测试' : '✗ Vetoes 4th lookup, code edits & tests',
    15,
    '#fca5a5',
    600,
    'text-anchor="middle"'
  );
  out += text(
    190,
    446,
    zh ? '（被否决时，提示主对话改走右侧后台分流）' : '(When vetoed, tells chat to delegate →)',
    13,
    '#cbd5e1',
    400,
    'text-anchor="middle"'
  );

  // Dashed redirect arrow from Go Hook Fence to Right Column
  out += line(342, 398, 372, 398, coral, 2.2, 'stroke-dasharray="4,3" marker-end="url(#arr-coral)"');

  // Arrow down from Go Hook Fence to Allowed Inline Fast Replies
  out += line(190, 464, 190, 504, teal, 2.5, 'marker-end="url(#arr-teal)"');

  // Bottom Left Box: Allowed Fast Inline Replies
  out += rect(38, 510, 304, 196, tealBg, 12, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(190, 542, zh ? '主对话秒级问答 (≤ 3 次查询)' : 'Fast Front-Desk Replies (≤ 3)', 19, teal, 700, 'text-anchor="middle"');
  out += text(190, 566, zh ? '几秒内答复，手机端随时可插话' : 'Finishes in seconds; chat stays free', 15, muted, 500, 'text-anchor="middle"');
  out += rect(58, 584, 264, 44, '#ffffff', 8, `stroke="${tealStroke}"`);
  out += text(190, 612, zh ? '查日程 / 看任务状态 / 简短问答' : 'Calendar · Task status · Quick Q&A', 15, ink, 500, 'text-anchor="middle"');
  out += rect(58, 640, 264, 44, '#ffffff', 8, `stroke="${tealStroke}"`);
  out += text(190, 668, zh ? '外部动作提案 → 手机一键确认' : 'Outbound proposals → 1-tap confirm', 14.5, ink, 500, 'text-anchor="middle"');

  // Right Column: Parallel Background Workers + Isolated Git Worktrees
  out += rect(378, 332, 304, 374, purpleBg, 12, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(530, 366, zh ? '后台并行工作池' : 'Parallel Background Workers', 19, purple, 700, 'text-anchor="middle"');
  out += text(530, 392, zh ? '不占用主对话，干完活汇总结论' : 'Run asynchronously & report summary', 14.5, muted, 500, 'text-anchor="middle"');

  // Worker Box 1: Background Subagents
  out += rect(398, 412, 264, 82, '#ffffff', 10, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(530, 442, zh ? '后台子代理 (单次自主任务)' : 'Background Subagents', 16.5, purple, 700, 'text-anchor="middle"');
  out += text(530, 468, zh ? '修 Bug / 跑测试 / 提炼财报与论文' : 'Bug fixes · Test runs · Filing briefs', 14.5, ink, 500, 'text-anchor="middle"');

  // Worker Box 2: Dedicated Task Threads
  out += rect(398, 508, 264, 82, '#ffffff', 10, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(530, 538, zh ? '独立任务线程 (多轮深度协作)' : 'Dedicated Task Threads', 16.5, purple, 700, 'text-anchor="middle"');
  out += text(530, 564, zh ? '架构设计 / 撰写长文 / 复杂建模' : 'Architecture · Writing · Deep dives', 14.5, ink, 500, 'text-anchor="middle"');

  // Shared Isolation Base: Separate Git Worktrees
  out += rect(398, 604, 264, 82, amberBg, 10, `stroke="${amberStroke}" stroke-width="1.5"`);
  out += text(530, 634, zh ? '各自独立的 Git Worktree 目录' : 'Isolated Git Worktree Checkouts', 15.5, amber, 700, 'text-anchor="middle"');
  out += text(530, 660, zh ? '每个编码任务独立分支，互不冲突' : 'Every coding task gets its own folder', 14.5, ink, 500, 'text-anchor="middle"');

  return svg(
    720,
    748,
    title,
    zh
      ? '架构图：前台主对话负责接待与派发；当主对话自己调用工具时，Go 钩子护栏放行前 3 次轻量查询，否决第 4 次查询及直接改代码跑测试；耗时任务在后台子代理、独立任务线程及各自的 git worktree 中并行推进。'
      : 'Architecture diagram: Front Desk chat coordinates requests. A Go hook fence on Front Desk tool calls allows up to 3 quick lookups and vetoes inline code edits or test runs, steering heavy work to background subagents and task threads in isolated git worktrees.',
    out
  );
}

// Architecture Graph 2: Three Boundaries in Prose Order (1. Memory, 2. Approval Gate, 3. Two-Layer Split)
function layers(lang) {
  const zh = lang === 'zh';
  const title = zh
    ? '防止多任务“串味”的三道边界：记忆、外发审批与目录分层'
    : 'Three Boundaries: Memory, Outbound Approval & Folder Split';
  let out = text(32, 48, title, zh ? 24 : 21, ink, 700);
  out += text(
    32,
    80,
    zh
      ? '清晰划分哪些步骤由 Go 代码确定性执行，哪些步骤交给模型判断'
      : 'Separating deterministic Go guardrails from model judgment across three pipelines',
    zh ? 17 : 16,
    muted
  );

  // Band 1 (Top): 1. Memory Pipeline (matches Prose Section 1)
  out += rect(20, 102, 680, 196, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(42, 136, zh ? '1. 分层记忆与夜间核对流水线' : '1. Organized Memory & Nightly Review Pipeline', 19, ink, 700);
  out += text(
    42,
    160,
    zh ? 'Go 限制启动索引长度并记录原始输出；夜间定时模型任务核实后再更新专题' : 'Go caps the startup index and logs tool outputs; a nightly model pass verifies before updating',
    14.5,
    muted
  );

  // 3 horizontal boxes in Band 1
  out += rect(42, 180, 190, 96, purpleBg, 10, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(137, 212, zh ? '启动索引 (≤ 80 行)' : 'Startup Index (≤ 80L)', zh ? 16 : 15, purple, 700, 'text-anchor="middle"');
  out += text(137, 238, zh ? '每次启动只读精简地图' : 'Compact map loaded first', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(137, 260, zh ? '[Go 强制行数上限]' : '[Go enforces line cap]', 12.5, purple, 600, 'text-anchor="middle"');

  out += line(232, 228, 270, 228, purple, 2.2, 'marker-end="url(#arr-purple)"');
  out += text(251, 216, zh ? '按需' : 'read', 12.5, purple, 600, 'text-anchor="middle"');

  out += rect(276, 180, 190, 96, tealBg, 10, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(371, 212, zh ? '分领域专题笔记' : 'Topic Notes (On Demand)', zh ? 16 : 14.5, teal, 700, 'text-anchor="middle"');
  out += text(371, 238, zh ? '代码 / 投资 / 家庭各自独立' : 'Code, research & life split', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(371, 260, zh ? '[聊到相关话题才加载]' : '[Loaded only when needed]', 12.5, teal, 600, 'text-anchor="middle"');

  out += line(502, 228, 466, 228, amber, 2.2, 'marker-end="url(#arr-amber)"');

  out += rect(508, 180, 170, 96, amberBg, 10, `stroke="${amberStroke}" stroke-width="1.5"`);
  out += text(593, 212, zh ? '夜间核对任务' : 'Nightly Review', zh ? 16 : 15, amber, 700, 'text-anchor="middle"');
  out += text(593, 238, zh ? '对照当天真实工具记录' : 'Checks raw tool outputs', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(593, 260, zh ? '[核实后才写入专题]' : '[Updates verified facts]', 12.5, amber, 600, 'text-anchor="middle"');

  // Band 2 (Middle): 2. Quarantine & 1-Tap Mobile Approval Gate (matches Prose Section 2)
  out += rect(20, 316, 680, 196, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(42, 350, zh ? '2. 外部读取清洗与手机端一键外发门禁' : '2. Quarantined Read & 1-Tap Mobile Approval Gate', 19, ink, 700);
  out += text(
    42,
    374,
    zh ? '隔离清洗作为第一道过滤；真正的安全边界是绑定命令哈希的手机端人工确认' : 'Quarantine reading is a first filter; the real boundary is the hash-locked phone approval',
    14.5,
    muted
  );

  // 4 connected steps across Band 2
  out += rect(42, 394, 142, 96, slateBg, 10, `stroke="${slateStroke}" stroke-width="1.5"`);
  out += text(113, 426, zh ? '外部邮件 / 文件' : 'External File', 15.5, ink, 700, 'text-anchor="middle"');
  out += text(113, 450, zh ? '先经隔离读取包装' : 'Read in quarantine', 13.5, muted, 500, 'text-anchor="middle"');
  out += text(113, 472, zh ? '标记为不可信数据' : 'Marked untrusted', 12.5, muted, 600, 'text-anchor="middle"');

  out += line(184, 442, 210, 442, '#64748b', 2.2, 'marker-end="url(#arr)"');

  out += rect(216, 394, 148, 96, amberBg, 10, `stroke="${amberStroke}" stroke-width="1.5"`);
  out += text(290, 426, zh ? '生成外发提案' : 'Stage Proposal', 15.5, amber, 700, 'text-anchor="middle"');
  out += text(290, 450, zh ? 'Go 锁定完整命令' : 'Go locks exact cmd', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(290, 472, zh ? '计算唯一哈希值' : 'Computes cmd hash', 12.5, amber, 600, 'text-anchor="middle"');

  out += line(364, 442, 390, 442, amber, 2.2, 'marker-end="url(#arr-amber)"');

  out += rect(396, 394, 148, 96, purpleBg, 10, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(470, 426, zh ? '手机一键确认' : '1-Tap Phone Gate', 15.5, purple, 700, 'text-anchor="middle"');
  out += text(470, 450, zh ? '弹出选择题卡片' : 'Shows summary & id', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(470, 472, zh ? '人工点击批准或拒绝' : 'Tap Approve / Reject', 12.5, purple, 600, 'text-anchor="middle"');

  out += line(544, 442, 570, 442, teal, 2.2, 'marker-end="url(#arr-teal)"');

  out += rect(576, 394, 102, 96, tealBg, 10, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(627, 426, zh ? '核对执行' : 'Execute', 15.5, teal, 700, 'text-anchor="middle"');
  out += text(627, 450, zh ? '校验哈希一致' : 'Hash matches', 13, ink, 500, 'text-anchor="middle"');
  out += text(627, 472, zh ? '发消息 / 合PR' : 'Runs command', 12.5, teal, 600, 'text-anchor="middle"');

  // Band 3 (Bottom): 3. Two-Layer Folder Split (matches Prose Section 3)
  out += rect(20, 530, 680, 176, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(42, 564, zh ? '3. 双层工作区物理隔离（通用代码 vs. 个人私密目录）' : '3. Two-Layer Workspace Split (Public Code vs. Private Notes)', 19, ink, 700);

  out += rect(42, 584, 216, 100, tealBg, 10, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(150, 616, zh ? '私密目录 (local/)' : 'Private Folder (local/)', 16, teal, 700, 'text-anchor="middle"');
  out += text(150, 642, zh ? '个人笔记 / 财务底稿 / 任务分支' : 'Notes · Finances · Worktrees', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(150, 666, zh ? '被主仓库忽略 · 独立私有备份' : 'Git-ignored · Private backup', 12.5, teal, 600, 'text-anchor="middle"');

  out += line(258, 634, 286, 634, coral, 2.2, 'marker-end="url(#arr-coral)"');

  out += rect(292, 584, 156, 100, coralBg, 10, `stroke="${coralStroke}" stroke-width="1.5" stroke-dasharray="5,3"`);
  out += text(370, 616, zh ? '提交前自动扫描' : 'Pre-Commit Gate', 16, coral, 700, 'text-anchor="middle"');
  out += text(370, 642, zh ? '5 项隐私与路径检查' : '5 privacy checks', 13.5, coral, 600, 'text-anchor="middle"');
  out += text(370, 666, zh ? '拦截私密文件与密钥' : 'Blocks leaks & keys', 12.5, ink, 500, 'text-anchor="middle"');

  out += line(448, 634, 476, 634, purple, 2.2, 'marker-end="url(#arr-purple)"');

  out += rect(482, 584, 196, 100, purpleBg, 10, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(580, 616, zh ? '公开代码树 (主仓库)' : 'Public Repo Tree', 16, purple, 700, 'text-anchor="middle"');
  out += text(580, 642, zh ? 'Go 小助手源码与通用技能' : 'Go helper & generic skills', 13.5, ink, 500, 'text-anchor="middle"');
  out += text(580, 666, zh ? '可放心同步与开源分享' : 'Safe to push & share', 12.5, purple, 600, 'text-anchor="middle"');

  return svg(
    720,
    726,
    title,
    zh
      ? '架构图：按正文顺序展示三道隔离边界：1. 启动索引（≤80行）、按需专题笔记与夜间核对；2. 外部文件隔离读取与绑定命令哈希的手机端一键确认；3. 私密 local/ 目录与公开代码树经提交前隐私门禁隔离。'
      : 'Architecture diagram following the prose order: 1. Startup index (<=80 lines), on-demand topic notes, and nightly review; 2. Quarantined reads and hash-locked 1-tap phone approval; 3. Private local/ folder separated from the public repo by a pre-commit privacy gate.',
    out
  );
}

// Architecture Graph 3: Fast Guardrail Verification When the Agent Edits Its Own Skills
function ci(lang) {
  const zh = lang === 'zh';
  const beforeSec = data.verification_and_pre_push_gate.e2e_suite_wall_clock_seconds.before_shared_build_per_test_compile;
  const afterSec = data.verification_and_pre_push_gate.e2e_suite_wall_clock_seconds.after_shared_build_compile_once;
  const title = zh
    ? '当 Agent 自己修改工作流规则时，如何守住边界？'
    : 'Who Checks the Guardrails When the Agent Edits Its Own Files?';
  let out = text(32, 48, title, zh ? 24 : 20, ink, 700);
  out += text(
    32,
    80,
    zh
      ? '编译一次 Go 小助手并复用到 18 个测试沙箱，让每次推送前都能自动跑完全套体检'
      : 'Compiling the Go helper once cut sandbox test time from 10.5s to 1.8s (~5.8× faster)',
    zh ? 17 : 15.5,
    muted
  );

  // Top Panel: Speedup Comparison (10.5s -> 1.8s)
  out += rect(20, 102, 680, 250, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(42, 138, zh ? '18 条沙箱工作流测试耗时对比' : '18 End-to-End Sandbox Workflow Tests', 19, ink, 700);
  out += text(
    42,
    164,
    zh ? '消除每个测试沙箱重复编译 Go 小助手的等待时间' : 'Compile the Go helper once per run instead of rebuilding inside each test',
    15.5,
    muted
  );

  const maxSec = 12;
  const barWidth = 280;
  const rows = [
    [194, zh ? '每个测试各自编译' : 'Rebuild per test', beforeSec, '#94a3b8', `${beforeSec.toFixed(1)}s`],
    [258, zh ? '单次编译共享复用' : 'Compile once & share', afterSec, purple, `${afterSec.toFixed(1)}s (~5.8×)`]
  ];
  for (const [y, label, val, color, rightLabel] of rows) {
    out += text(42, y + 23, label, 17, ink, 600);
    out += rect(248, y, barWidth, 32, '#f0eef4', 6);
    out += rect(248, y, Math.round((barWidth * val) / maxSec), 32, color, 6);
    out += text(678, y + 23, rightLabel, 20, color === purple ? purple : ink, 700, 'text-anchor="end"');
  }
  out += text(
    42,
    328,
    zh ? '耗时减少 82.9%，使完整沙箱自检能直接挂进每次 git push' : '82.9% less time—fast enough to run automatically before every git push',
    16.5,
    teal,
    700
  );

  // Bottom Panel: Pre-Push Gate Flow
  out += rect(20, 372, 680, 184, '#ffffff', 16, `stroke="${slateStroke}" stroke-width="2"`);
  out += text(
    42,
    408,
    zh ? '每次推送前自动运行的 3 道门禁（合计约 2.5 秒）' : 'Automated Gate Before Every Push (~2.5s total)',
    19,
    ink,
    700
  );

  out += rect(42, 432, 188, 98, tealBg, 10, `stroke="${tealStroke}" stroke-width="1.5"`);
  out += text(136, 464, zh ? '1. 隐私与路径检查' : '1. Privacy Checks', 15.5, teal, 700, 'text-anchor="middle"');
  out += text(136, 492, zh ? '5 项扫描规则' : '5 boundary rules', 15, ink, 600, 'text-anchor="middle"');
  out += text(136, 514, zh ? '防止私密笔记或密钥混入' : 'No local notes or keys', 12.5, muted, 500, 'text-anchor="middle"');

  out += line(230, 481, 258, 481, teal, 2.2, 'marker-end="url(#arr-teal)"');

  out += rect(264, 432, 192, 98, purpleBg, 10, `stroke="${purpleStroke}" stroke-width="1.5"`);
  out += text(360, 464, zh ? '2. 钩子越界模拟' : '2. Hook Boundary Tests', 15.5, purple, 700, 'text-anchor="middle"');
  out += text(360, 492, zh ? '18 次越界调用测试' : '18 simulated probes', 15, ink, 600, 'text-anchor="middle"');
  out += text(360, 514, zh ? '验证主台防卡死与外发拦截' : 'Checks lookup & action gates', 12.5, muted, 500, 'text-anchor="middle"');

  out += line(456, 481, 484, 481, purple, 2.2, 'marker-end="url(#arr-purple)"');

  out += rect(490, 432, 188, 98, amberBg, 10, `stroke="${amberStroke}" stroke-width="1.5"`);
  out += text(584, 464, zh ? '3. 完整工作流回归' : '3. Sandbox Workflows', 15.5, amber, 700, 'text-anchor="middle"');
  out += text(584, 492, zh ? '18 个隔离沙箱 (1.8s)' : '18 isolated runs (1.8s)', 15, ink, 600, 'text-anchor="middle"');
  out += text(584, 514, zh ? '全部通过才允许推送' : 'All pass → push allowed', 12.5, muted, 500, 'text-anchor="middle"');

  return svg(
    720,
    576,
    title,
    zh
      ? `架构图：单次编译共享复用将 18 个隔离沙箱测试从 ${beforeSec} 秒缩短至 ${afterSec} 秒（耗时减少 82.9%，快了约 5.8 倍），使每次推送前都能自动运行 5 项隐私检查、18 次钩子越界模拟和 18 个完整沙箱工作流测试。`
      : `Architecture diagram: Compiling the Go helper once cut 18 sandbox workflow tests from ${beforeSec}s to ${afterSec}s (82.9% less time, ~5.8x faster), enabling every push to run 5 privacy checks, 18 hook boundary probes, and 18 sandbox workflows in ~2.5s.`,
    out
  );
}

// Cover Card (1200x630): Intuitive 3 Pillars Instead of Cryptic Internal Scores
function cover(lang) {
  const zh = lang === 'zh';
  let out = text(
    64,
    78,
    zh ? 'Google Antigravity 实践笔记 · 多任务个人 Agent' : 'Google Antigravity Notes · Multitasking Personal Agent',
    25,
    muted,
    500
  );
  out += text(
    64,
    154,
    zh ? '把 Google Antigravity 改造成' : 'Turning Google Antigravity into a',
    52,
    ink,
    700
  );
  out += text(
    64,
    224,
    zh ? '多任务个人 Agent：提示词是建议，钩子是规则' : 'Multitasking Agent: Prompts vs. Hooks',
    zh ? 48 : 48,
    ink,
    700
  );

  // Three clear pillar cards
  out += rect(64, 278, 344, 244, '#fff', 20);
  out += rect(428, 278, 344, 244, '#fff', 20);
  out += rect(792, 278, 344, 244, '#fff', 20);

  out += text(92, 332, zh ? '前台主对话不卡死' : 'Non-blocking Front Desk', 22, muted, 600);
  out += text(92, 414, zh ? '≤ 3 次查询' : '≤ 3 lookups', zh ? 48 : 42, purple, 700);
  out += text(92, 476, zh ? '日常问答秒回，写代码转后台' : 'Fast chat; code runs in background', 17, muted);

  out += text(456, 332, zh ? '多任务并行不冲突' : 'Parallel Task Isolation', 22, muted, 600);
  out += text(456, 414, 'Git Worktrees', 40, teal, 700);
  out += text(456, 476, zh ? '独立代码目录、分层记忆与私密库' : 'Separate branches, memory & vault', 17, muted);

  out += text(820, 332, zh ? '外部动作先过人眼' : 'Safe Outbound Actions', 22, muted, 600);
  out += text(820, 414, zh ? '手机一键确认' : '1-Tap Confirm', zh ? 46 : 38, amber, 700);
  out += text(820, 476, zh ? '锁定命令哈希，点批准才真正执行' : 'Hash-locked proposals on phone UI', 17, muted);

  out += text(
    64,
    584,
    zh
      ? '复用 Antigravity 的远程界面与子代理，用一个 Go 小助手守住多任务边界。'
      : 'Reuse Antigravity for mobile UI and subagents; use a small Go helper to keep tasks from colliding.',
    24,
    ink,
    500
  );

  return svg(
    1200,
    630,
    zh ? '把 Google Antigravity 改造成多任务个人 Agent' : 'Turning Google Antigravity into a Multitasking Personal Agent',
    zh
      ? '主对话最多 3 次轻量查询、独立 Git Worktree 与分层记忆隔离、外发动作手机一键确认。'
      : 'Front Desk capped at 3 quick lookups, parallel tasks isolated in git worktrees, and outbound actions gated by 1-tap phone confirmation.',
    out,
    '#f4f0e8'
  );
}

fs.mkdirSync('public/diagrams', { recursive: true });
fs.mkdirSync('public/images', { recursive: true });

for (const lang of ['en', 'zh']) {
  for (const [name, build] of Object.entries({ frontdesk, layers, ci })) {
    fs.writeFileSync(`public/diagrams/harness-${name}-${lang}.svg`, build(lang));
  }
  fs.writeFileSync(`public/images/agent-harness-microkernel-${lang}.svg`, cover(lang));
}

console.log('Generated six bilingual architecture graph SVGs and two share-cover SVGs.');
