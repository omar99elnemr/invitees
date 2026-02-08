/**
 * Reusable Loading Skeleton Components
 * Provides consistent shimmer-based loading placeholders across the app
 */

// Base shimmer block
function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

// ─── Page-level skeletons ────────────────────────────────────────────

/** Dashboard: stat cards + chart area */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-1">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-8 rounded-lg" />
            </div>
            <Bone className="h-8 w-16 mb-2" />
            <Bone className="h-3 w-32" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <Bone className="h-5 w-40 mb-4" />
            <Bone className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table-based pages: Events, Users, Attendance, Approvals */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4 p-1">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-48" />
        <div className="flex gap-3">
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      {/* Filter row */}
      <div className="flex gap-3">
        <Bone className="h-9 w-56 rounded-lg" />
        <Bone className="h-9 w-36 rounded-lg" />
        <Bone className="h-9 w-36 rounded-lg" />
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          {Array.from({ length: cols }).map((_, i) => (
            <Bone key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Bone
                key={c}
                className={`h-4 flex-1 ${c === 0 ? 'max-w-[180px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card grid: used for Events page card layout */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-48" />
        <Bone className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-36" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
            <Bone className="h-4 w-48" />
            <Bone className="h-4 w-32" />
            <div className="flex gap-2 pt-2">
              <Bone className="h-8 w-20 rounded-lg" />
              <Bone className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Settings / form page */
export function FormSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <Bone className="h-7 w-56" />
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-28" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/** Live dashboard: dark theme with stat cards */
export function LiveDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Bone className="h-8 w-64 !bg-gray-700" />
            <Bone className="h-4 w-40 !bg-gray-700" />
          </div>
          <Bone className="h-10 w-28 rounded-lg !bg-gray-700" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 bg-gray-800/50 border border-gray-700">
              <Bone className="h-4 w-24 mb-3 !bg-gray-700" />
              <Bone className="h-9 w-20 !bg-gray-700" />
            </div>
          ))}
        </div>
        {/* Table area */}
        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-10 w-full rounded-lg !bg-gray-700" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Check-in console */
export function CheckInSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <Bone className="h-8 w-64 mx-auto" />
          <Bone className="h-4 w-40 mx-auto" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 space-y-4">
          <Bone className="h-12 w-full rounded-lg" />
          <Bone className="h-12 w-full rounded-lg" />
          <Bone className="h-12 w-48 rounded-lg mx-auto" />
        </div>
      </div>
    </div>
  );
}

// ─── Inline skeletons (for partial loading inside a page) ────────────

/** Table rows loading inside a container */
export function InlineTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="py-4 px-2 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Bone key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Simple list loading */
export function InlineListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="py-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2">
          <Bone className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
