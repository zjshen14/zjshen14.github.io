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
