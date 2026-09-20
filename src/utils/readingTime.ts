export function getReadingTime(content: string, locale: 'en' | 'zh' = 'en'): { minutes: number; text: string } {
  // Strip code blocks and HTML tags to measure prose
  const clean = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]*>/g, '');

  // Count Chinese characters
  const cjkMatches = clean.match(/[\u4e00-\u9fa5]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // Count Latin words
  const nonCjk = clean.replace(/[\u4e00-\u9fa5]/g, ' ');
  const words = nonCjk.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Reading speeds: ~200 WPM English, ~350 CPM Chinese
  const minutes = Math.max(1, Math.ceil(wordCount / 200 + cjkCount / 350));

  return {
    minutes,
    text: locale === 'zh' ? `${minutes} 分钟阅读` : `${minutes} min read`
  };
}
