/** URL сайта (без слэша в конце). Задаётся через NEXT_PUBLIC_SITE_URL */
export const SITE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SITE_URL) ||
  'https://nextuplabel.online';

/** Домен для email (например nextuplabel.online) */
const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '').split('/')[0] || 'nextuplabel.online';

/** Email для контактов (info@домен) */
export const CONTACT_EMAIL = `info@${SITE_DOMAIN}`;
