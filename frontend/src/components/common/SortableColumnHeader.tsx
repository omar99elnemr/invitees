import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableColumnHeaderProps {
  field: string;
  sortField: string | null;
  sortDirection: SortDirection;
  onSort: (field: string) => void;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export default function SortableColumnHeader({
  field,
  sortField,
  sortDirection,
  onSort,
  children,
  align = 'left',
  className = '',
}: SortableColumnHeaderProps) {
  const isActive = sortField === field;

  const alignClass =
    align === 'right' ? 'text-right justify-end' : align === 'center' ? 'text-center justify-center' : 'text-left';

  return (
    <th
      className={`px-2 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-200/70 dark:hover:bg-gray-600 transition-colors ${alignClass} ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        {children}
        <span className={`inline-flex ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-600'}`}>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
    </th>
  );
}

// Reusable sorting utility function
export function applySorting<T extends Record<string, any>>(
  items: T[],
  sortField: string | null,
  sortDirection: SortDirection
): T[] {
  if (!sortField) return items;
  return [...items].sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

// Reusable hook-like handler for sort toggle
export function handleSortToggle(
  field: string,
  currentSortField: string | null,
  currentSortDirection: SortDirection,
  setSortField: (field: string | null) => void,
  setSortDirection: (dir: SortDirection) => void
) {
  if (currentSortField === field) {
    setSortDirection(currentSortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortField(field);
    setSortDirection('asc');
  }
}
