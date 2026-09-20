import type { CollectionEntry } from 'astro:content';

export const LOCALES = ['en', 'zh'] as const;
export type Locale = typeof LOCALES[number];

export const defaultLocale: Locale = 'en';

export const uiStrings = {
  en: {
    siteTitle: "Between Bits",
    siteDescription: "Thoughts, engineering notes, and architectures.",
    navBlog: "Blog",
    navAbout: "About",
    navTags: "Tags",
    allPosts: "All Posts",
    recentPosts: "Recent Posts",
    viewAllPosts: "View all posts →",
    readMore: "Read article →",
    tags: "Tags",
    publishedOn: "Published on",
    updatedOn: "Updated on",
    readInOtherLang: "🌐 阅读中文版",
    otherLangCode: "zh",
    shareOnX: "Share on X",
    shareOnLinkedIn: "Share on LinkedIn",
    copyLink: "Copy Link",
    linkCopied: "Link copied to clipboard!",
    tableOfContents: "Table of Contents",
    backToBlog: "← Back to Blog",
    noPostsFound: "No posts found.",
    footerText: "Built with Astro & hosted on GitHub Pages."
  },
  zh: {
    siteTitle: "比特之间",
    siteDescription: "技术思考、工程架构与心得记录。",
    navBlog: "博客",
    navAbout: "关于我",
    navTags: "标签",
    allPosts: "所有文章",
    recentPosts: "最新文章",
    viewAllPosts: "查看所有文章 →",
    readMore: "阅读全文 →",
    tags: "标签",
    publishedOn: "发布于",
    updatedOn: "更新于",
    readInOtherLang: "🌐 Read in English",
    otherLangCode: "en",
    shareOnX: "分享至 X",
    shareOnLinkedIn: "分享至 LinkedIn",
    copyLink: "复制链接",
    linkCopied: "链接已复制到剪贴板！",
    tableOfContents: "目录",
    backToBlog: "← 返回博客",
    noPostsFound: "暂无文章。",
    footerText: "基于 Astro 构建，由 GitHub Pages 托管。"
  }
} as const;

export function getPostSlugParts(post: CollectionEntry<'blog'>) {
  // Post slug in Content Collections: "en/my-post" or "zh/my-post"
  const [locale, ...rest] = post.slug.split('/');
  return {
    locale: locale as Locale,
    articleSlug: rest.join('/')
  };
}

export function getPostTranslation(
  currentPost: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[]
): { locale: Locale; slug: string; url: string } | null {
  const { locale: currentLocale, articleSlug } = getPostSlugParts(currentPost);
  const targetLocale: Locale = currentLocale === 'en' ? 'zh' : 'en';

  const match = allPosts.find(p => {
    const parts = getPostSlugParts(p);
    return parts.locale === targetLocale && parts.articleSlug === articleSlug && !p.data.draft;
  });

  if (!match) return null;

  return {
    locale: targetLocale,
    slug: articleSlug,
    url: `/${targetLocale}/blog/${articleSlug}/`
  };
}
