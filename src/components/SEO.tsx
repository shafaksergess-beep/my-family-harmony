import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  /** Absolute https URL of a page-specific social preview image (1200x630). */
  ogImage?: string;
}

const DEFAULT_DESCRIPTION =
  "Run your family njangi, contributions and meetings — all in one place. Kinsroot tracks savings, loans, assistance and attendance in one platform.";

const ANDROID_PACKAGE = "com.softserge.kinsroot";
const SITE_ORIGIN = "https://kinsroot.softserge.com";

/**
 * Per-page SEO helper. Sets title, description, canonical, and an
 * android-app:// alternate so Google can deep-link search results into
 * the installed Play Store app (App Indexing).
 */
export const SEO = ({ title, description, canonical, noIndex, ogImage }: SEOProps) => {
  const fullTitle = title.includes("Kinsroot") ? title : `${title} | Kinsroot`;
  const desc = description ?? DEFAULT_DESCRIPTION;
  const url =
    canonical ??
    (typeof window !== "undefined" ? window.location.href : undefined);

  let androidAlternate: string | undefined;
  if (url) {
    try {
      const u = new URL(url);
      androidAlternate = `android-app://${ANDROID_PACKAGE}/https/${u.host}${u.pathname}${u.search}`;
    } catch {
      androidAlternate = `android-app://${ANDROID_PACKAGE}/https/${SITE_ORIGIN.replace(/^https?:\/\//, "")}/`;
    }
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {url && <link rel="canonical" href={url} />}
      {androidAlternate && <link rel="alternate" href={androidAlternate} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {url && <meta property="og:url" content={url} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
};

export default SEO;
