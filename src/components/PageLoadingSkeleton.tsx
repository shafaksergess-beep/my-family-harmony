/**
 * Animated skeleton fallback for lazy-loaded routes.
 * Mirrors the general shape of an app page (header, content blocks).
 */
export const PageLoadingSkeleton = () => (
  <div
    className="min-h-screen bg-background p-4 md:p-8"
    role="status"
    aria-label="Loading page"
  >
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
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
      <span className="sr-only">Loading…</span>
    </div>
  </div>
);

export default PageLoadingSkeleton;
