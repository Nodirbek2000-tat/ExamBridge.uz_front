import { Helmet } from 'react-helmet-async'

const SITE = 'ExamBridge'
const ORIGIN = 'https://exambridge.uz'
const DEFAULT_IMAGE = `${ORIGIN}/og-image.jpg`

/**
 * Per-page SEO tags.
 *
 * Only public pages need this — everything behind a login is marked noindex so
 * Google spends its crawl budget on pages that can actually rank.
 *
 * <Seo title="Ro'yxatdan o'tish" description="…" path="/register" />
 */
export default function Seo({
  title,
  description,
  path = '',
  image = DEFAULT_IMAGE,
  noindex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE}` : `${SITE} — IELTS, CEFR va SAT mock testlar`
  const url = `${ORIGIN}${path}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:locale" content="uz_UZ" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
