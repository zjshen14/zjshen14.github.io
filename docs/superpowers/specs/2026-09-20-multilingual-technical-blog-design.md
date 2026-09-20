# Design Specification: Bilingual Technical Blog (Astro + GitHub Pages)

- **Date**: 2026-09-20
- **Status**: Draft (Pending Review)
- **Author**: Antigravity Assistant & Author

---

## 1. Overview & Goals

The objective is to build a high-performance, developer-focused, bilingual personal technical blog hosted on **GitHub Pages** with zero maintenance overhead. The blog will support **English** and **Chinese (Simplified)** with linked article translations, pristine readability in both light and dark modes, and effortless cross-posting and sharing to platforms like **X (Twitter)** and **LinkedIn**.

### Core Requirements
- **Framework**: Astro 5 (zero-JS by default, ultra-fast static HTML generation).
- **Hosting & CI/CD**: GitHub Pages via automated GitHub Actions on push to `main`.
- **Bilingual Experience**: Dedicated `/en/` and `/zh/` routing, automatic article-level translation pairing, and fallback behavior for single-language articles.
- **UI / UX**: High-contrast, typography-first minimalist aesthetic with seamless Dark/Light theme switching (WCAG AAA contrast compliant, no flash of unstyled theme).
- **Developer Features**: Shiki syntax highlighting, one-click code copy, reading time estimation (handling both English words and Chinese characters), and table of contents.
- **Social & Cross-Posting**: Complete Open Graph & Twitter Card metadata, one-click share buttons (X, LinkedIn, Copy Link with toast), and canonical URLs for cross-posting protection.
- **Search & Feeds**: Fast client-side/static multilingual search (Pagefind), bilingual RSS feeds, and automatic sitemap with `hreflang` tags.

---

## 2. Architecture & Routing

### 2.1 Locale Structure
Using Astro’s native `astro:i18n`:
- `defaultLocale`: `'en'`
- `locales`: `['en', 'zh']`
- `routing.prefixDefaultLocale`: `true` (ensures explicit `/en/` and `/zh/` paths, with `/` redirecting to the user's browser language or `/en/`).

### 2.2 Route Map
| Route | Language | Purpose |
|---|---|---|
| `/` | Redirect / Root | Detects browser language preference and routes to `/en/` or `/zh/` |
| `/en/` | English | Home: Developer bio, featured articles, recent posts |
| `/zh/` | 中文 | 首页：个人简介、精选文章、最新动态 |
| `/en/blog/` | English | Chronological article archive with tag filtering |
| `/zh/blog/` | 中文 | 文章归档与标签筛选 |
| `/en/blog/[slug]/` | English | Individual article view with translation link to Chinese |
| `/zh/blog/[slug]/` | 中文 | 文章详情页，附带跳转英文版的语言切换按钮 |
| `/en/tags/[tag]/` | English | Articles filtered by tag |
| `/zh/tags/[tag]/` | 中文 | 按标签归档的文章列表 |
| `/en/about/` | English | Detailed profile, career journey, social links |
| `/zh/about/` | 中文 | 个人背景、技术历程与社交链接 |
| `/en/rss.xml` & `/zh/rss.xml` | Both | Language-specific RSS feeds |

---

## 3. Content Architecture & Translation Linking

### 3.1 Content Directory Structure
Content will be managed using Astro Content Collections with directory-based locale isolation:
```text
src/content/blog/
├── en/
│   └── welcome.md
└── zh/
    └── welcome.md
```

### 3.2 Schema Definition (`src/content/config.ts`)
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
    ogImage: z.string().optional(),
  }),
});

export const collections = { blog };
```

### 3.3 Translation Linking Logic
Articles sharing the same file slug (e.g. `en/welcome.md` and `zh/welcome.md`) are automatically paired:
1. When rendering `/en/blog/welcome`, the layout checks for the existence of `zh/welcome`.
2. If found, a top/bottom pill is displayed: `🌐 阅读中文版` pointing to `/zh/blog/welcome/`.
3. Conversely, on `/zh/blog/welcome`, the button displays: `🌐 Read in English` pointing to `/en/blog/welcome/`.
4. If an article only exists in one language (e.g., an untranslated post), the pill is omitted; the post remains fully discoverable in that language's archive.

---

## 4. UI / UX Design & Accessibility

### 4.1 Color Palette & Theme System
- **Dark Mode**:
  - Background: `zinc-950` (`#09090b`), surface: `zinc-900` (`#18181b`), borders: `zinc-800` (`#27272a`).
  - Text: Primary `zinc-100` (`#f4f4f5`), secondary `zinc-400` (`#a1a1aa`).
  - Accent: Indigo/Violet (`indigo-400` / `violet-400`).
- **Light Mode**:
  - Background: `zinc-50` (`#fafafa`) or pure white, surface: `zinc-100`, borders: `zinc-200` (`#e4e4e7`).
  - Text: Primary `zinc-900` (`#18181b`), secondary `zinc-600` (`#52525b`).
  - Accent: Indigo/Violet (`indigo-600` / `violet-600`).
- **FOUC Prevention**: Inline `<script>` in the `<head>` checks `localStorage.theme` and `prefers-color-scheme` before rendering body to eliminate screen flash.

### 4.2 Typography Stack
- **Body & Headlines**:
  - System sans stack with CJK optimization:
    `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif`.
- **Code & Monospace**:
  - `JetBrains Mono, Fira Code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
  - Line height and padding adjusted to ensure CJK characters inside code comments do not clip.

### 4.3 Key Components
1. **Header / Navbar**:
   - Site title / logo on the left.
   - Right: Nav links (`Blog`, `About`), Search button, Language switcher (`EN` / `中`), Theme toggle button (☀️ / 🌙).
2. **Article Layout**:
   - Header with post title, publication date, estimated reading time, tags, and translation link.
   - Sticky Table of Contents on the sidebar for viewports `>= 1024px`.
   - Markdown body rendered via `@tailwindcss/typography` with customized prose styling for dark/light themes.
   - Code blocks rendered with Shiki + copy button.
   - Footer: Social sharing bar (X, LinkedIn, Copy Link), Author bio card, and Previous/Next post navigation.

---

## 5. Social Sharing, Cross-Posting & SEO

### 5.1 Social Preview Cards (Open Graph & Twitter)
Each page generates complete metadata in `<head>`:
- `og:type`: `"article"` (for blog posts) or `"website"`.
- `og:title`: Post title.
- `og:description`: Post description.
- `og:url`: Absolute canonical URL.
- `og:image`: Dedicated social share image (or dynamic fallback card with title and site name).
- `twitter:card`: `"summary_large_image"`.
- `twitter:title`, `twitter:description`, `twitter:image`.

### 5.2 Interactive Share Controls
Placed at the end of each post:
- **Share on X**: Pre-populated URL:
  `https://twitter.com/intent/tweet?text={encodedTitle}&url={encodedUrl}`.
- **Share on LinkedIn**: Native share dialog:
  `https://www.linkedin.com/sharing/share-offsite/?url={encodedUrl}`.
- **Copy Link**: Copies the URL to clipboard and triggers a brief toast notification (*"Link copied to clipboard!"* / *"链接已复制到剪贴板"*).

### 5.3 SEO & Cross-Posting Protection
- **Canonical URL**: `<link rel="canonical" href="{canonicalUrl}" />` points to the primary blog post URL. When cross-posting to Medium, Dev.to, or LinkedIn Articles, configuring this canonical URL preserves Google ranking authority.
- **Bilingual Alternate Tags**:
  `<link rel="alternate" hreflang="en" href="..." />` and `<link rel="alternate" hreflang="zh" href="..." />` for search engine locale indexing.

---

## 6. Multilingual Search & RSS

### 6.1 Static Search (Pagefind)
- Integrated using Pagefind at build time.
- Zero external runtime dependencies; indexes both English and Chinese text into static chunks.
- Accessible via a fast search modal (`Cmd+K` or search icon in header).

### 6.2 RSS Feeds
- Configured via `@astrojs/rss`.
- Separate endpoints for `/en/rss.xml` and `/zh/rss.xml` containing full post snippets and publication dates.

---

## 7. CI/CD & GitHub Pages Deployment

### 7.1 GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Triggered on push to branch `main`.
- Steps:
  1. Checkout code.
  2. Setup Node.js (v20+ or latest LTS) and install dependencies via `pnpm` (or `npm`).
  3. Run `astro check` and `astro build`.
  4. Run `pagefind --site dist`.
  5. Deploy artifacts via `actions/upload-pages-artifact` and `actions/deploy-pages`.
- Custom Domain ready: A `public/CNAME` file can be added whenever a custom domain is configured.

---

## 8. Initial Content Verification
To verify the entire setup, the repository will start with:
1. `src/content/blog/en/welcome.md`: "Welcome to My Technical Blog" (covering tech interests, code snippets, KaTeX/markdown demonstration).
2. `src/content/blog/zh/welcome.md`: "欢迎来到我的技术博客" (Chinese counterpart with matching slug to verify translation linking).
3. About pages in both English and Chinese.

---

## 9. Next Steps
Upon review and approval of this specification document, we will invoke the `writing-plans` skill to generate a step-by-step implementation plan and proceed with project scaffolding.
