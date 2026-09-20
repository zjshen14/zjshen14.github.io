# Multilingual Technical Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, bilingual (English + Chinese) developer technical blog using Astro 5, Tailwind CSS, and GitHub Pages with automated CI/CD deployment, high-contrast dark/light mode, and social cross-posting sharing capabilities.

**Architecture:** Astro 5 static site generator with native `astro:i18n` locale routing (`/en/` and `/zh/`), type-safe Markdown Content Collections with automatic slug-based translation linking, Tailwind Typography with balanced Latin/CJK font stacks, and GitHub Actions for continuous deployment to GitHub Pages.

**Tech Stack:** Astro 5, Tailwind CSS v3, `@tailwindcss/typography`, TypeScript, Shiki syntax highlighter, `@astrojs/sitemap`, `@astrojs/rss`.

**Spec:** [`docs/superpowers/specs/2026-09-20-multilingual-technical-blog-design.md`](file:///Users/zhijie/Workspace/agy/blogs/docs/superpowers/specs/2026-09-20-multilingual-technical-blog-design.md)

## Global Constraints
- Node version: `v20+` (current system is `v26.5.1`), Package manager: `npm`.
- Explicit locale paths: `/en/` and `/zh/`, with root `/` detecting preference or defaulting to `/en/`.
- Zero broken links: Single-language posts omit the translation toggle gracefully.
- WCAG AAA contrast for text in both Dark and Light modes.
- Zero flash of unstyled theme (FOUC).

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tailwind.config.mjs`
- Create: `tsconfig.json`
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: Astro build system configured with `astro:i18n` (`en`, `zh`), Tailwind CSS, and TypeScript.

- [ ] **Step 1: Create package.json and install dependencies**

```json
{
  "name": "personal-technical-blog",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.4",
    "@astrojs/rss": "^4.0.11",
    "@astrojs/sitemap": "^3.2.1",
    "@astrojs/tailwind": "^5.1.5",
    "@tailwindcss/typography": "^0.5.16",
    "astro": "^5.4.2",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  }
}
```

Run: `npm install`

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 3: Create astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zjshen14.github.io',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false
    }
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap()
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      wrap: true
    }
  }
});
```

- [ ] **Step 4: Create tailwind.config.mjs and src/styles/global.css**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
};
```

In `src/styles/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 min-h-screen antialiased transition-colors duration-200;
  }
}
```

- [ ] **Step 5: Verify build sanity**

Run: `npx astro check && npx astro --version`
Expected: PASS with Astro version reported.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tailwind.config.mjs tsconfig.json src/styles/global.css
git commit -m "chore: scaffold astro project with tailwind and i18n config"
```

---

### Task 2: Content Collection & i18n Translation Utilities

**Files:**
- Create: `src/content/config.ts`
- Create: `src/utils/i18n.ts`
- Create: `src/utils/readingTime.ts`
- Test: `tests/i18n.test.ts` (or validation runner)

**Interfaces:**
- Consumes: Astro Content Collections API.
- Produces:
  - `blog` collection schema.
  - `uiStrings`: bilingual UI labels (`en`, `zh`).
  - `getReadingTime(content: string, locale: 'en' | 'zh'): { minutes: number, text: string }`.
  - `getPostTranslation(post: CollectionEntry<'blog'>, allPosts: CollectionEntry<'blog'>[]): { locale: string, slug: string } | null`.

- [ ] **Step 1: Write src/content/config.ts**

```typescript
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    canonicalURL: z.string().url().optional(),
    ogImage: z.string().optional()
  })
});

export const collections = { blog };
```

- [ ] **Step 2: Create src/utils/readingTime.ts**

Handles word count for Latin text and character count for CJK (Chinese) text:

```typescript
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
```

- [ ] **Step 3: Create src/utils/i18n.ts**

```typescript
import type { CollectionEntry } from 'astro:content';

export const LOCALES = ['en', 'zh'] as const;
export type Locale = typeof LOCALES[number];

export const defaultLocale: Locale = 'en';

export const uiStrings = {
  en: {
    siteTitle: "Zhijie's Tech Blog",
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
    siteTitle: "志杰的技术博客",
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
```

- [ ] **Step 4: Commit**

```bash
git add src/content/config.ts src/utils/readingTime.ts src/utils/i18n.ts
git commit -m "feat: add content schema, i18n dictionary, and reading time utilities"
```

---

### Task 3: Base Layout, Header, Footer & Theme Toggle

**Files:**
- Create: `src/components/ThemeToggle.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produces: `BaseLayout.astro` accepting `title`, `description`, `locale`, `canonicalURL`, `ogImage`, `alternateLinks`.
- Features: Prevents FOUC via inline head script; persistent theme toggle; responsive navigation with language switch.

- [ ] **Step 1: Create src/components/ThemeToggle.astro**

```astro
---
// ThemeToggle.astro
---
<button
  id="theme-toggle"
  type="button"
  aria-label="Toggle dark mode"
  class="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
>
  <!-- Sun icon -->
  <svg id="theme-toggle-light-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.78a1 1 0 011.415 1.414l-.707.708a1 1 0 11-1.414-1.415l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-2.78 4.22a1 1 0 011.414 1.415l-.707.707a1 1 0 11-1.414-1.414l.707-.708zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-2.78a1 1 0 01.707.708l-.707.707a1 1 0 01-1.414-1.414l.707-.708zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm2.78-4.22a1 1 0 01-.707-.708l.707-.707a1 1 0 011.414 1.414l-.707.708zM10 6a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
  <!-- Moon icon -->
  <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
</button>

<script is:inline>
  function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    if (lightIcon && darkIcon) {
      if (isDark) {
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
      } else {
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
      }
    }
  }

  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    updateThemeIcons();
    if (btn) {
      btn.onclick = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcons();
      };
    }
  }

  initThemeToggle();
  document.addEventListener('astro:after-swap', initThemeToggle);
</script>
```

- [ ] **Step 2: Create src/components/Header.astro**

```astro
---
import type { Locale } from '@/utils/i18n';
import { uiStrings } from '@/utils/i18n';
import ThemeToggle from './ThemeToggle.astro';

interface Props {
  locale: Locale;
  currentPath?: string;
}

const { locale, currentPath = '' } = Astro.props;
const t = uiStrings[locale];

// Calculate target URL for language switcher
let switchUrl = locale === 'en' ? `/zh${currentPath.replace(/^\/en/, '')}` : `/en${currentPath.replace(/^\/zh/, '')}`;
if (!switchUrl.endsWith('/')) switchUrl += '/';
---

<header class="sticky top-0 z-40 w-full backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
    <a href={`/${locale}/`} class="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
      {t.siteTitle}
    </a>

    <nav class="flex items-center space-x-2 sm:space-x-4">
      <a href={`/${locale}/blog/`} class="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-md transition-colors">
        {t.navBlog}
      </a>
      <a href={`/${locale}/about/`} class="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-md transition-colors">
        {t.navAbout}
      </a>

      <!-- Language Switcher -->
      <a
        href={switchUrl}
        class="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title={locale === 'en' ? "切换到中文" : "Switch to English"}
      >
        {locale === 'en' ? '中文' : 'EN'}
      </a>

      <!-- Theme Toggle -->
      <ThemeToggle />
    </nav>
  </div>
</header>
```

- [ ] **Step 3: Create src/components/Footer.astro**

```astro
---
import type { Locale } from '@/utils/i18n';
import { uiStrings } from '@/utils/i18n';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
const t = uiStrings[locale];
const currentYear = new Date().getFullYear();
---

<footer class="mt-auto border-t border-zinc-200 dark:border-zinc-800 py-8 transition-colors">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-sm text-zinc-500 dark:text-zinc-400 space-y-4 sm:space-y-0">
    <p>© {currentYear} Zhijie. {t.footerText}</p>
    <div class="flex items-center space-x-6">
      <a href={`/${locale}/rss.xml`} class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" target="_blank" rel="noopener noreferrer">
        RSS Feed
      </a>
      <a href="https://github.com/zjshen14" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" target="_blank" rel="noopener noreferrer">
        GitHub
      </a>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Create src/layouts/BaseLayout.astro with FOUC prevention**

```astro
---
import '@/styles/global.css';
import type { Locale } from '@/utils/i18n';
import { uiStrings } from '@/utils/i18n';
import Header from '@/components/Header.astro';
import Footer from '@/components/Footer.astro';

interface Props {
  title?: string;
  description?: string;
  locale: Locale;
  canonicalURL?: string;
  ogImage?: string;
  alternateUrl?: string;
  alternateLang?: string;
}

const {
  title,
  description,
  locale,
  canonicalURL = Astro.url.href,
  ogImage = '/og-default.png',
  alternateUrl,
  alternateLang
} = Astro.props;

const t = uiStrings[locale];
const pageTitle = title ? `${title} | ${t.siteTitle}` : t.siteTitle;
const pageDescription = description || t.siteDescription;
---

<!doctype html>
<html lang={locale === 'zh' ? 'zh-CN' : 'en'} class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{pageTitle}</title>
    <meta name="description" content={pageDescription} />

    <!-- Canonical URL -->
    <link rel="canonical" href={canonicalURL} />

    <!-- Bilingual Hreflang SEO -->
    <link rel="alternate" hreflang="en" href={new URL('/en/', Astro.site).href} />
    <link rel="alternate" hreflang="zh" href={new URL('/zh/', Astro.site).href} />
    {alternateUrl && alternateLang && (
      <link rel="alternate" hreflang={alternateLang === 'zh' ? 'zh-CN' : 'en'} href={new URL(alternateUrl, Astro.site).href} />
    )}

    <!-- Open Graph / Facebook / LinkedIn -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={pageDescription} />
    <meta property="og:image" content={new URL(ogImage, Astro.url).href} />

    <!-- Twitter Cards / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content={canonicalURL} />
    <meta name="twitter:title" content={pageTitle} />
    <meta name="twitter:description" content={pageDescription} />
    <meta name="twitter:image" content={new URL(ogImage, Astro.url).href} />

    <!-- RSS Autodiscovery -->
    <link rel="alternate" type="application/rss+xml" title={`${t.siteTitle} RSS (${locale.toUpperCase()})`} href={`/${locale}/rss.xml`} />

    <!-- FOUC Prevention Script -->
    <script is:inline>
      const theme = (() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
          return localStorage.getItem('theme');
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
        return 'light';
      })();

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    </script>
  </head>
  <body class="flex flex-col min-h-screen">
    <Header locale={locale} currentPath={Astro.url.pathname} />
    <main class="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>
    <Footer locale={locale} />
  </body>
</html>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeToggle.astro src/components/Header.astro src/components/Footer.astro src/layouts/BaseLayout.astro
git commit -m "feat: add BaseLayout with dark mode FOUC prevention, header and footer"
```

---

### Task 4: Post Cards, Translation Banner & Social Sharing Bar

**Files:**
- Create: `src/components/PostCard.astro`
- Create: `src/components/TranslationAlert.astro`
- Create: `src/components/ShareBar.astro`

**Interfaces:**
- Produces:
  - `PostCard.astro`: article summary card with tags, reading time, date.
  - `TranslationAlert.astro`: alert box connecting English/Chinese counterparts.
  - `ShareBar.astro`: one-click X intent, LinkedIn share, and copy-link button with toast.

- [ ] **Step 1: Create src/components/PostCard.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';
import type { Locale } from '@/utils/i18n';
import { getReadingTime } from '@/utils/readingTime';
import { getPostSlugParts } from '@/utils/i18n';

interface Props {
  post: CollectionEntry<'blog'>;
  locale: Locale;
}

const { post, locale } = Astro.props;
const { articleSlug } = getPostSlugParts(post);
const { text: readingTimeText } = getReadingTime(post.body, locale);

const formattedDate = post.data.pubDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});
---

<article class="group py-6 border-b border-zinc-200 dark:border-zinc-800/80">
  <div class="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mb-2 space-x-3">
    <time datetime={post.data.pubDate.toISOString()}>{formattedDate}</time>
    <span>•</span>
    <span>{readingTimeText}</span>
  </div>

  <h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
    <a href={`/${locale}/blog/${articleSlug}/`}>
      {post.data.title}
    </a>
  </h2>

  <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
    {post.data.description}
  </p>

  {post.data.tags.length > 0 && (
    <div class="mt-3 flex flex-wrap gap-2">
      {post.data.tags.map(tag => (
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          #{tag}
        </span>
      ))}
    </div>
  )}
</article>
```

- [ ] **Step 2: Create src/components/TranslationAlert.astro**

```astro
---
import type { Locale } from '@/utils/i18n';
import { uiStrings } from '@/utils/i18n';

interface Props {
  translation: {
    locale: Locale;
    slug: string;
    url: string;
  } | null;
  currentLocale: Locale;
}

const { translation, currentLocale } = Astro.props;
if (!translation) return null;

const t = uiStrings[currentLocale];
---

<div class="my-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between text-sm">
  <span class="text-indigo-900 dark:text-indigo-200 font-medium">
    {currentLocale === 'en' ? "This article is also available in Chinese:" : "本文同时提供英文版本："}
  </span>
  <a
    href={translation.url}
    class="inline-flex items-center font-semibold text-indigo-600 dark:text-indigo-400 hover:underline ml-2"
  >
    {t.readInOtherLang} →
  </a>
</div>
```

- [ ] **Step 3: Create src/components/ShareBar.astro with Toast**

```astro
---
import type { Locale } from '@/utils/i18n';
import { uiStrings } from '@/utils/i18n';

interface Props {
  title: string;
  url: string;
  locale: Locale;
}

const { title, url, locale } = Astro.props;
const t = uiStrings[locale];

const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
---

<div class="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
  <span class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
    {locale === 'zh' ? "分享文章" : "Share this post"}
  </span>

  <div class="flex items-center space-x-3">
    <!-- Share on X -->
    <a
      href={xShareUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
    >
      <svg class="w-3.5 h-3.5 mr-1.5 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      {t.shareOnX}
    </a>

    <!-- Share on LinkedIn -->
    <a
      href={linkedInShareUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
    >
      <svg class="w-3.5 h-3.5 mr-1.5 fill-current" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
      </svg>
      {t.shareOnLinkedIn}
    </a>

    <!-- Copy Link Button -->
    <button
      id="copy-link-btn"
      type="button"
      data-url={url}
      data-msg={t.linkCopied}
      class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
    >
      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span id="copy-btn-text">{t.copyLink}</span>
    </button>
  </div>
</div>

<!-- Copy Toast Notification -->
<div id="copy-toast" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium">
  {t.linkCopied}
</div>

<script is:inline>
  const copyBtn = document.getElementById('copy-link-btn');
  const toast = document.getElementById('copy-toast');
  if (copyBtn && toast) {
    copyBtn.onclick = async () => {
      const url = copyBtn.getAttribute('data-url') || window.location.href;
      await navigator.clipboard.writeText(url);
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 2500);
    };
  }
</script>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PostCard.astro src/components/TranslationAlert.astro src/components/ShareBar.astro
git commit -m "feat: add PostCard, TranslationAlert, and ShareBar with clipboard toast"
```

---

### Task 5: Pages Implementation (Bilingual Routes & Code Copy)

**Files:**
- Create: `src/pages/index.astro` (Root language detection & redirect)
- Create: `src/pages/[locale]/index.astro` (Home page)
- Create: `src/pages/[locale]/blog/index.astro` (Archive page)
- Create: `src/pages/[locale]/blog/[...slug].astro` (Article detail page)
- Create: `src/pages/[locale]/about.astro` (About page)

**Interfaces:**
- Produces: Complete static routes for `/`, `/en/`, `/zh/`, `/en/blog/`, `/zh/blog/`, `/en/blog/[...slug]/`, `/zh/blog/[...slug]/`, `/en/about/`, `/zh/about/`.

- [ ] **Step 1: Create src/pages/index.astro**

```astro
---
// src/pages/index.astro
// Root redirect detecting browser language
---
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Redirecting...</title>
    <script is:inline>
      const lang = navigator.language || navigator.userLanguage || '';
      if (lang.toLowerCase().startsWith('zh')) {
        window.location.replace('/zh/');
      } else {
        window.location.replace('/en/');
      }
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=/en/" />
    </noscript>
  </head>
  <body>
    <p>Redirecting to <a href="/en/">English</a> or <a href="/zh/">中文</a>...</p>
  </body>
</html>
```

- [ ] **Step 2: Create src/pages/[locale]/index.astro**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import PostCard from '@/components/PostCard.astro';
import { LOCALES, type Locale, uiStrings, getPostSlugParts } from '@/utils/i18n';

export function getStaticPaths() {
  return LOCALES.map(locale => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: Locale };
const t = uiStrings[locale];

const allPosts = await getCollection('blog', p => {
  const parts = getPostSlugParts(p);
  return parts.locale === locale && !p.data.draft;
});

const recentPosts = allPosts
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 5);
---

<BaseLayout locale={locale}>
  <!-- Hero Section -->
  <section class="py-12 border-b border-zinc-200 dark:border-zinc-800/80">
    <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
      {locale === 'en' ? "Hi, I'm Zhijie 👋" : "你好，我是志杰 👋"}
    </h1>
    <p class="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
      {locale === 'en'
        ? "Welcome to my personal technical blog. I write about software architecture, modern web ecosystems, AI agents, and practical engineering solutions."
        : "欢迎来到我的技术博客。在这里我记录关于系统架构、现代前端/后端生态、AI Agent 与工程实践的思考与笔记。"}
    </p>
  </section>

  <!-- Recent Posts -->
  <section class="py-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        {t.recentPosts}
      </h2>
      <a href={`/${locale}/blog/`} class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
        {t.viewAllPosts}
      </a>
    </div>

    {recentPosts.length === 0 ? (
      <p class="text-zinc-500 dark:text-zinc-400">{t.noPostsFound}</p>
    ) : (
      <div>
        {recentPosts.map(post => (
          <PostCard post={post} locale={locale} />
        ))}
      </div>
    )}
  </section>
</BaseLayout>
```

- [ ] **Step 3: Create src/pages/[locale]/blog/index.astro**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import PostCard from '@/components/PostCard.astro';
import { LOCALES, type Locale, uiStrings, getPostSlugParts } from '@/utils/i18n';

export function getStaticPaths() {
  return LOCALES.map(locale => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: Locale };
const t = uiStrings[locale];

const posts = (await getCollection('blog', p => {
  const parts = getPostSlugParts(p);
  return parts.locale === locale && !p.data.draft;
})).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout locale={locale} title={t.navBlog}>
  <div class="py-6">
    <h1 class="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
      {t.allPosts}
    </h1>
    <p class="text-zinc-600 dark:text-zinc-400 mb-8">
      {locale === 'en' ? "All engineering notes and articles." : "所有技术文章与工程笔记。"}
    </p>

    {posts.length === 0 ? (
      <p class="text-zinc-500 dark:text-zinc-400">{t.noPostsFound}</p>
    ) : (
      <div class="divide-y divide-zinc-200 dark:divide-zinc-800/80">
        {posts.map(post => (
          <PostCard post={post} locale={locale} />
        ))}
      </div>
    )}
  </div>
</BaseLayout>
```

- [ ] **Step 4: Create src/pages/[locale]/blog/[...slug].astro**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import TranslationAlert from '@/components/TranslationAlert.astro';
import ShareBar from '@/components/ShareBar.astro';
import { LOCALES, type Locale, uiStrings, getPostSlugParts, getPostTranslation } from '@/utils/i18n';
import { getReadingTime } from '@/utils/readingTime';

export async function getStaticPaths() {
  const allPosts = await getCollection('blog', p => !p.data.draft);

  return allPosts.map(post => {
    const { locale, articleSlug } = getPostSlugParts(post);
    return {
      params: { locale, slug: articleSlug },
      props: { post, allPosts }
    };
  });
}

const { post, allPosts } = Astro.props;
const { locale } = Astro.params as { locale: Locale };
const t = uiStrings[locale];

const { Content } = await post.render();
const translation = getPostTranslation(post, allPosts);
const { text: readingTimeText } = getReadingTime(post.body, locale);

const formattedDate = post.data.pubDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
---

<BaseLayout
  locale={locale}
  title={post.data.title}
  description={post.data.description}
  canonicalURL={post.data.canonicalURL || Astro.url.href}
  ogImage={post.data.ogImage}
  alternateUrl={translation?.url}
  alternateLang={translation?.locale}
>
  <article class="py-6">
    <!-- Back to blog -->
    <a href={`/${locale}/blog/`} class="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 mb-6 transition-colors">
      {t.backToBlog}
    </a>

    <!-- Title & Meta -->
    <header class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
        {post.data.title}
      </h1>
      <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <time datetime={post.data.pubDate.toISOString()}>{formattedDate}</time>
        <span>•</span>
        <span>{readingTimeText}</span>
      </div>

      <!-- Translation Banner -->
      <TranslationAlert translation={translation} currentLocale={locale} />
    </header>

    <!-- Markdown Content with Prose Styling & Code Blocks -->
    <div class="prose prose-zinc dark:prose-invert max-w-none prose-headings:tracking-tight prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-pre:rounded-xl prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-800">
      <Content />
    </div>

    <!-- Social Share Bar & Copy Link -->
    <ShareBar title={post.data.title} url={Astro.url.href} locale={locale} />
  </article>

  <!-- Add copy button to code blocks -->
  <script is:inline>
    function addCopyButtons() {
      const codeBlocks = document.querySelectorAll('pre');
      codeBlocks.forEach(block => {
        if (block.querySelector('.copy-code-btn')) return;
        block.style.position = 'relative';
        const button = document.createElement('button');
        button.className = 'copy-code-btn absolute top-2 right-2 px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity';
        button.innerText = 'Copy';
        button.addEventListener('click', async () => {
          const code = block.querySelector('code')?.innerText || block.innerText;
          await navigator.clipboard.writeText(code);
          button.innerText = 'Copied!';
          setTimeout(() => { button.innerText = 'Copy'; }, 2000);
        });
        block.classList.add('group');
        block.appendChild(button);
      });
    }
    addCopyButtons();
    document.addEventListener('astro:after-swap', addCopyButtons);
  </script>
</BaseLayout>
```

- [ ] **Step 5: Create src/pages/[locale]/about.astro**

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import { LOCALES, type Locale, uiStrings } from '@/utils/i18n';

export function getStaticPaths() {
  return LOCALES.map(locale => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: Locale };
const t = uiStrings[locale];
---

<BaseLayout locale={locale} title={t.navAbout}>
  <div class="py-8 prose prose-zinc dark:prose-invert max-w-none">
    <h1>{t.navAbout}</h1>
    {locale === 'en' ? (
      <>
        <p>Hi there! I am a software engineer passionate about building scalable distributed systems, developer tools, and exploring autonomous AI agent architectures.</p>
        <h2>What I Write About</h2>
        <ul>
          <li><strong>Architecture & Systems</strong>: Designing maintainable, resilient services.</li>
          <li><strong>Frontend & Modern Tooling</strong>: Astro, TypeScript, React, and performant web apps.</li>
          <li><strong>AI & Agentic Workflows</strong>: Practical experiments with modern LLM tooling.</li>
        </ul>
        <h2>Connect With Me</h2>
        <p>Feel free to reach out or connect on <a href="https://github.com/zjshen14" target="_blank">GitHub</a> or follow along on social platforms.</p>
      </>
    ) : (
      <>
        <p>你好！我是一名软件工程师，专注于构建高可用系统、开发者效能工具，以及探索自主 AI Agent 架构。</p>
        <h2>博客内容聚焦</h2>
        <ul>
          <li><strong>系统与架构</strong>：高内聚低耦合系统设计与工程落地。</li>
          <li><strong>现代 Web 技术栈</strong>：Astro、TypeScript、React 以及前沿工程化工具。</li>
          <li><strong>AI 与智能体</strong>：面向未来的 LLM 辅助编程与 Agentic 工作流实践。</li>
        </ul>
        <h2>联系交流</h2>
        <p>欢迎通过 <a href="https://github.com/zjshen14" target="_blank">GitHub</a> 关注我的开源项目或进行交流讨论。</p>
      </>
    )}
  </div>
</BaseLayout>
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/pages/[locale]/index.astro src/pages/[locale]/blog/index.astro src/pages/[locale]/blog/[...slug].astro src/pages/[locale]/about.astro
git commit -m "feat: implement bilingual pages for home, archive, article, and about"
```

---

### Task 6: Initial Bilingual Articles & RSS Feeds

**Files:**
- Create: `src/content/blog/en/welcome.md`
- Create: `src/content/blog/zh/welcome.md`
- Create: `src/pages/en/rss.xml.ts`
- Create: `src/pages/zh/rss.xml.ts`

**Interfaces:**
- Produces:
  - Initial bilingual sample posts verified with automatic translation pairing.
  - RSS feeds at `/en/rss.xml` and `/zh/rss.xml`.

- [ ] **Step 1: Create src/content/blog/en/welcome.md**

```markdown
---
title: "Welcome to My Technical Blog"
description: "Why I started this blog, what topics I'll cover, and how it was built with Astro and GitHub Pages."
pubDate: 2026-09-20
tags: ["welcome", "astro", "blogging"]
draft: false
---

Welcome to my personal technical blog!

I created this space to document my technical journey, share deep-dives into software architecture, modern web development, and share lessons learned from engineering production systems.

## Why This Stack?

This site is built with **Astro 5** and hosted on **GitHub Pages**:

1. **Zero Runtime Bloat**: Only pure HTML and CSS are shipped for reading, delivering instant page loads and perfect Lighthouse scores.
2. **Native Bilingual Support**: Every article can seamlessly link to its Chinese counterpart.
3. **Markdown-First Workflow**: All content lives alongside code in version control.

## A Quick Code Example

Here is how clean code blocks look with syntax highlighting:

```typescript
interface BlogPost {
  title: string;
  locale: 'en' | 'zh';
  published: boolean;
}

const welcome: BlogPost = {
  title: "Welcome to My Technical Blog",
  locale: "en",
  published: true,
};
console.log(`Initialized: ${welcome.title}`);
```

Stay tuned for more articles on engineering, architectures, and experiments!
```

- [ ] **Step 2: Create src/content/blog/zh/welcome.md**

```markdown
---
title: "欢迎来到我的技术博客"
description: "建站缘由、未来将分享的技术领域，以及基于 Astro 与 GitHub Pages 的架构设计。"
pubDate: 2026-09-20
tags: ["welcome", "astro", "博客"]
draft: false
---

欢迎来到我的个人技术博客！

建立这个博客的初衷，是希望有一个属于自己的技术自留地，记录在软件架构、现代 Web 技术、AI Agent 以及系统工程实践中的心得与沉淀。

## 为什么选择这个技术栈？

本博客基于 **Astro 5** 构建，并全自动托管在 **GitHub Pages**：

1. **极速体验与零冗余 JS**：文章页面纯静态输出，获得近乎完美的 Lighthouse 性能评分。
2. **原生双语支持**：文章支持中英文版本自动关联，随时自由切换。
3. **内容即代码**：所有文章以 Markdown 存储在 Git 仓库中，享有完整的版本历史与分支管理。

## 代码高亮演示

在深色与浅色模式下均拥有清晰的代码可读性：

```typescript
interface BlogPost {
  title: string;
  locale: 'en' | 'zh';
  published: boolean;
}

const welcome: BlogPost = {
  title: "欢迎来到我的技术博客",
  locale: "zh",
  published: true,
};
console.log(`初始化成功：${welcome.title}`);
```

接下来会持续更新有关工程架构与实践的文章，欢迎订阅 RSS 或在社交网络上交流！
```

- [ ] **Step 3: Create src/pages/en/rss.xml.ts**

```typescript
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPostSlugParts } from '@/utils/i18n';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', p => {
    const { locale } = getPostSlugParts(p);
    return locale === 'en' && !p.data.draft;
  })).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: "Zhijie's Tech Blog",
    description: "Thoughts, engineering notes, and architectures.",
    site: context.site || 'https://zjshen14.github.io',
    items: posts.map(post => {
      const { articleSlug } = getPostSlugParts(post);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/en/blog/${articleSlug}/`
      };
    })
  });
}
```

- [ ] **Step 4: Create src/pages/zh/rss.xml.ts**

```typescript
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPostSlugParts } from '@/utils/i18n';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', p => {
    const { locale } = getPostSlugParts(p);
    return locale === 'zh' && !p.data.draft;
  })).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: "志杰的技术博客",
    description: "技术思考、工程架构与心得记录。",
    site: context.site || 'https://zjshen14.github.io',
    items: posts.map(post => {
      const { articleSlug } = getPostSlugParts(post);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/zh/blog/${articleSlug}/`
      };
    })
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/en/welcome.md src/content/blog/zh/welcome.md src/pages/en/rss.xml.ts src/pages/zh/rss.xml.ts
git commit -m "feat: add initial welcome posts in EN/ZH and configure bilingual RSS"
```

---

### Task 7: GitHub Actions CI/CD Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: GitHub Actions workflow for zero-touch deployment to GitHub Pages on every push to `main`.

- [ ] **Step 1: Create .github/workflows/deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for GitHub Pages deployment"
```

---

### Task 8: Verification & Build Validation

**Files:** None (testing existing artifacts)

- [ ] **Step 1: Run full production build**

Run: `npm run build`
Expected: Success with all static routes generated in `dist/`:
- `dist/index.html`
- `dist/en/index.html`
- `dist/zh/index.html`
- `dist/en/blog/index.html`
- `dist/zh/blog/index.html`
- `dist/en/blog/welcome/index.html`
- `dist/zh/blog/welcome/index.html`
- `dist/en/about/index.html`
- `dist/zh/about/index.html`
- `dist/en/rss.xml`
- `dist/zh/rss.xml`

- [ ] **Step 2: Verify translation linking in generated HTML**

Inspect `dist/en/blog/welcome/index.html` to confirm it contains the link to `/zh/blog/welcome/` with text `阅读中文版`.
Inspect `dist/zh/blog/welcome/index.html` to confirm it contains the link to `/en/blog/welcome/` with text `Read in English`.

- [ ] **Step 3: Verify social share links**

Inspect `dist/en/blog/welcome/index.html` to confirm `twitter.com/intent/tweet` and `linkedin.com/sharing/share-offsite` links exist.
