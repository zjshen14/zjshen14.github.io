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
    title: "DevLog",
    description: "Notes and reflections on AI, Crypto, and Technology Investment.",
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
