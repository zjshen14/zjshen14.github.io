---
title: "欢迎来到研发手记"
description: "建站缘由、未来关注的领域，以及关于 AI、Crypto 与科技投资的思考。"
pubDate: 2026-09-20
tags: ["welcome", "ai", "crypto", "投资"]
draft: false
---

欢迎来到《研发手记》！

建立这个博客的初衷，是记录我在**人工智能（AI）**、**加密经济（Crypto/Web3）**与**科技投资（Investment）**领域的深度思考、实践沉淀与宏观判断。探索前沿指数级技术如何重构市场与现实世界。

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
