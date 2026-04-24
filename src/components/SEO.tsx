import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
}

const DEFAULT_DESCRIPTION =
  "Kinsroot is the all-in-one family management platform for meetings, contributions, savings, loans and heritage — rooted in tradition, built for tomorrow.";

/**
 * Per-page SEO helper. Sets a unique title, meta description and canonical URL.
 * Use exactly one <SEO /> per route.
 */
export const SEO = ({ title, description, canonical, noIndex }: SEOProps) => {
  const fullTitle = title.includes("Kinsroot") ? title : `${title} | Kinsroot`;
  const desc = description ?? DEFAULT_DESCRIPTION;
  const url =
    canonical ??
    (typeof window !== "undefined" ? window.location.href : undefined);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {url && <link rel="canonical" href={url} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
};

export default SEO;
