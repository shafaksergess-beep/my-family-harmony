import { useTranslation } from "react-i18next";
/**
 * Animated skeleton fallback for lazy-loaded routes.
 * Mirrors the general shape of an app page (header, content blocks).
 */
export const PageLoadingSkeleton = () => {
  const { t } = useTranslation();
  return (
  <div
    className="min-h-screen bg-background p-4 md:p-8"
    role="status"
    aria-label={t("phase4.loadingPage")}
  >
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <img src="/logo.jpg" alt="Kinsroot" className="h-12 w-12 rounded-full object-contain" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted/70" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg bg-muted"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
      </div>
      <span className="sr-only">{t("phase4.loadingPage")}</span>
    </div>
  </div>
);
};

export default PageLoadingSkeleton;
