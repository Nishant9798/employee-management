export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div className={`${width} ${height} bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`} />
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
      <SkeletonLine width="w-1/3" height="h-5" className="mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? 'w-2/3' : 'w-full'} className="mb-3" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width="w-24" height="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? 'w-32' : 'w-20'} height="h-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <SkeletonLine width="w-20" height="h-3" className="mb-3" />
          <SkeletonLine width="w-16" height="h-8" className="mb-2" />
          <SkeletonLine width="w-24" height="h-3" />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'card', ...props }) {
  switch (type) {
    case 'table': return <SkeletonTable {...props} />;
    case 'stats': return <SkeletonStats {...props} />;
    case 'card': return <SkeletonCard {...props} />;
    case 'line': return <SkeletonLine {...props} />;
    default: return <SkeletonCard {...props} />;
  }
}
