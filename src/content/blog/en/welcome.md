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
