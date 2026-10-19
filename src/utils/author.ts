import type { Locale } from './i18n';

export const blogAuthor = {
  name: 'Zhijie Shen',
  sameAs: [
    'https://github.com/zjshen14',
    'https://x.com/z_j_s',
    'https://huggingface.co/zjshen'
  ]
};

export const authorProfilePath = (locale: Locale) => `/${locale}/about/`;
