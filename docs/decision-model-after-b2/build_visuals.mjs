// Native SVG figures for the bilingual blog. Numbers come from the verified export.
// Run from the repository root: node docs/decision-model-after-b2/build_visuals.mjs
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/experiments/decision-model-after-b2/summary.json', 'utf8'));
const sgd = data.natural.sgd_development;
const pub = data.natural.jevbench_public;
if (sgd.aggregation !== 'equal_label_macro' || pub.questions !== 231) throw new Error('Review changed metric definitions');
const pct = key => (sgd.systems[key].accuracy * 100).toFixed(1);
const ink = '#202e3b', muted = '#56636c', purple = '#6952bd', teal = '#197b70';
const esc = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x,y,v,size=30,fill=ink,weight=400,more='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${more}>${esc(v)}</text>`;
const rect = (x,y,w,h,fill,rx=18,more='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${more}/>`;
const line = (x1,y1,x2,y2,color='#d6dadd',more='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${more}/>`;
const arrow = (y) => `<path d="M380 ${y} v24 m-8 -8 l8 8 8 -8" fill="none" stroke="${muted}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
function svg(w,h,title,desc,body,bg='#fbfaf7') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><rect width="${w}" height="${h}" fill="${bg}"/><g font-family="Noto Sans CJK SC, Noto Sans, Arial, sans-serif">${body}</g></svg>\n`;
}
function scores(lang) {
  const zh = lang === 'zh';
  const title = zh ? '同一次补课，两份不同的成绩' : 'One training run. Two different results.';
  let out = text(36,58,title,zh?34:32,ink,700);
  out += text(36,100,zh?'每张图只比较同一任务的训练前后':'Compare before and after within each task.',25,muted);
  out += rect(24,128,712,304,'#fff',18,'stroke="#e0e1df"');
  out += text(48,173,zh?'识别对话行为':'Classifying dialogue acts',32,ink,700);
  out += text(48,211,zh?'例如：询问、确认、拒绝':'For example: asking, confirming, rejecting',25,muted);
  const rows = [[260,'B3',zh?'补课前':'Before','#a9a9b5'],[333,'treatment',zh?'补课后':'After',purple]];
  for (const [y,key,label,color] of rows) {
    out += text(48,y+21,label,27);
    out += rect(170,y,392,30,'#f0eef4',4);
    out += rect(170,y,392*sgd.systems[key].accuracy,30,color,4);
    out += text(700,y+25,`${pct(key)}%`,32,color===purple?purple:ink,700,'text-anchor="end"');
  }
  out += text(170,395,'0%',22,muted)+text(562,395,'100%',22,muted,400,'text-anchor="end"');
  out += text(48,421,zh?'十个类别等权计分 · SGD 开发集':'Ten equally weighted classes · SGD development',21,muted);
  out += rect(24,460,712,304,'#fff',18,'stroke="#e0e1df"');
  out += text(48,505,zh?'另一套公开题':'A separate public question set',32,ink,700);
  out += text(48,543,zh?'观察不同任务上的判断表现':'Checking decisions across different tasks',25,muted);
  for (const [y,key,label,color] of [[592,'B3',zh?'补课前':'Before','#a9a9b5'],[665,'treatment',zh?'补课后':'After',purple]]) {
    out += text(48,y+21,label,27);
    out += rect(170,y,392,30,'#f0eef4',4);
    out += rect(170,y,392*pub.systems[key].correct/pub.questions,30,color,4);
    out += text(700,y+25,String(pub.systems[key].correct),32,color===purple?purple:ink,700,'text-anchor="end"');
  }
  out += text(170,727,'0',22,muted)+text(562,727,zh?'231 道题':'231 questions',22,muted,400,'text-anchor="end"');
  out += text(48,753,zh?'答对的题数 · 已用于诊断的公开 JevBench':'Correct answers · exposed public JevBench',21,muted);
  out += text(36,815,zh?'专项进步了。能用到哪里，还得另测。':'One skill improved. Transfer needs its own check.',zh?30:27,ink,700);
  return svg(760,854,title,zh?`一次训练：SGD 十类宏平均 ${pct('B3')}% 到 ${pct('treatment')}%；JevBench 仍答对 177/231。两项评估的任务与单位不同。单次实测，不代表通用能力。`:`One run: SGD ten-class macro accuracy ${pct('B3')}% to ${pct('treatment')}%; JevBench stays at 177/231 correct. Different tasks and units; not a general intelligence score.`,out);
}
function learning(lang) {
  const zh=lang==='zh';
  const title=zh?'给 AI 补课，大致是这三步':'What does extra training look like?';
  let out=text(36,60,title,zh?34:32,ink,700);
  const steps=zh?[
    ['给例子，也给正确答案','“地址填错了” → 修改地址'],
    ['让模型调整判断方式','根据例子，逐步调整内部参数。'],
    ['拿另外的题，检查效果','离开练过的例子，判断还对吗？']
  ]:[
    ['Show examples and correct answers','“Wrong address” → change the address'],
    ['Let the model adjust its decisions','Training changes some internal parameters.'],
    ['Check a separate set of questions','Does it still work beyond the practice examples?']
  ];
  for(let i=0;i<3;i++) {
    const y=96+i*142, color=i===2?teal:purple;
    out+=rect(24,y,712,110,i===2?'#eaf4ef':'#fff',18,'stroke="#dedfdd"');
    out+=`<circle cx="65" cy="${y+45}" r="22" fill="${color}"/>`+text(65,y+55,i+1,27,'#fff',700,'text-anchor="middle"');
    out+=text(104,y+54,steps[i][0],zh?32:27,ink,700);
    out+=text(48,y+93,steps[i][1],zh?28:25,muted);
    if(i<2)out+=arrow(y+113);
  }
  out+=text(36,538,zh?'练习做得好 ≠ 换一批题也做得好':'Good practice scores ≠ good scores elsewhere',zh?30:28,ink,700);
  return svg(760,572,title,zh?'简化示意：例子与答案，调整模型参数，再用未直接训练的题检查效果。例子是虚构的。':'Simplified illustration: examples with answers, parameter updates, then separate evaluation questions. The example message is fictional.',out);
}
function intent(lang) {
  const zh=lang==='zh';
  const title=zh?'“在提要求”和“要办什么”，是两道题':'Two questions hidden inside “intent”';
  let out=text(36,60,title,zh?31:32,ink,700);
  out+=rect(24,96,712,206,'#eef0f5');
  out+=text(48,140,zh?'同一段对话':'The same conversation',26,muted,700);
  out+=text(48,187,zh?'之前：“请取消我的预订。”':'Earlier: “Please cancel my reservation.”',zh?30:28);
  out+=text(48,238,zh?'现在：“还是保留吧，':'Now: “Actually, keep it.',zh?30:28,ink,700);
  out+=text(48,280,zh?'　　　只改一下到达时间。”':'Just change my arrival time.”',zh?30:28,ink,700);
  out+=arrow(318);
  out+=rect(24,360,712,160,'#fff',18,'stroke="#dedfdd"');
  out+=text(48,405,zh?'这句话在做什么？':'What kind of utterance is this?',30,muted,700);
  out+=text(48,464,zh?'提出请求':'Making a request',40,purple,700);
  out+=text(48,501,zh?'识别说话的方式，还没选出具体动作。':'Describes the speech act, not the specific action.',zh?25:24,muted);
  out+=rect(24,548,712,192,'#eaf4ef');
  out+=text(48,593,zh?'程序现在应该办什么？':'What should the program do now?',30,muted,700);
  out+=text(48,652,zh?'修改到达时间':'Change the arrival time',40,teal,700);
  out+=text(48,697,zh?'“取消预订”已经被撤回。':'The cancellation request was withdrawn.',zh?27:26,muted);
  out+=text(48,729,zh?'需要读懂上下文，以及用户改了主意。':'Requires context and the change of mind.',zh?25:24,muted);
  out+=text(36,791,zh?'虚构例子 · 不代表模型的实际回答':'Illustration only · not an actual model response',24,muted);
  return svg(760,822,title,zh?'虚构对话：用户先要求取消预订，随后撤回并要求修改到达时间。识别提出请求这一话语行为，不等于选对修改时间这一当前动作。':'Fictional conversation: a cancellation request is withdrawn and replaced with a request to change arrival time. Recognizing a request differs from choosing the current concrete action.',out);
}
function cover(lang) {
  const zh=lang==='zh';
  let out=text(64,78,zh?'一张家用显卡上的 AI 补课笔记':'AI training notes from a home GPU',27,muted,500);
  out+=text(64,156,zh?'我给 AI 补了课，':'My AI scored 96%.',zh?58:64,ink,700);
  out+=text(64,234,zh?'它考了 96%，然后呢？':'Now what?',zh?58:64,ink,700);
  out+=rect(64,286,514,244,'#fff',20)+rect(602,286,534,244,'#fff',20);
  out+=text(92,339,zh?'对话行为分类':'Dialogue classification',29,muted,500);
  out+=text(92,430,'64% → 96%',66,purple,700);
  out+=text(92,492,zh?'十类等权平均 · 约数':'Ten-class macro average · rounded',24,muted);
  out+=text(630,339,zh?'另一套公开题':'A separate public question set',29,muted,500);
  out+=text(630,430,'177 → 177',66,teal,700);
  out+=text(630,492,zh?'答对数 / 共 231 题':'Correct answers / 231 questions',24,muted);
  out+=text(64,588,zh?'一次实测，两种评估。进步是真的，边界也是真的。':'One measured run. Different tasks. Real progress has limits.',28,ink,500);
  return svg(1200,630,zh?'专项进步，为什么没有迁移？':'Why did the improvement not transfer?',zh?'SGD 对话分类宏平均约64%到96%；公开JevBench仍为177/231。单次训练的两项不同评估。':'SGD dialogue classification macro average: about 64% to 96%. Public JevBench: still 177/231. Two different evaluations of one training run.',out,'#f4f0e8');
}
fs.mkdirSync('public/diagrams',{recursive:true});
fs.mkdirSync('public/images',{recursive:true});
for(const lang of ['en','zh']) {
  for(const [name,build] of Object.entries({scores,learning,intent})) fs.writeFileSync(`public/diagrams/after-b2-${name}-${lang}.svg`,build(lang));
  fs.writeFileSync(`public/images/decision-model-after-b2-${lang}.svg`,cover(lang));
}
console.log('Generated six article SVGs and two share-cover SVGs from verified evidence.');
