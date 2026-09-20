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
