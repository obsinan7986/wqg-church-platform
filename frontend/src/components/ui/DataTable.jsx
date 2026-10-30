import React, { useState } from 'react';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'Galmeen tokkollee hin argamne',
  emptyDescription = 'Daataan tarree kana keessa jiru ammaaf hin jiru.',
  emptyIcon,
  onRowClick,
  className = '',
  tableClassName = '',
  headerAction,
  title,
  subtitle,
  pageSize = 10,
  paginated = true,
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination calculation
  const totalItems = data.length;
  const shouldPaginate = paginated && totalItems > pageSize;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentData = shouldPaginate ? data.slice(startIndex, endIndex) : data;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div>
            {title && <h3 className="font-bold text-sm sm:text-base text-royal">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" variant="royal" />
          <span className="text-xs text-slate-500 font-medium">Daataa fe'aa jira...</span>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          className="border-0 bg-transparent py-12"
        />
      ) : (
        <>
          {/* Desktop & Tablet Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className={`w-full text-left text-xs text-slate-700 ${tableClassName}`}>
              <thead className="sticky top-0 z-10 bg-royal-tint text-[11px] uppercase tracking-wider text-royal border-b border-slate-200 select-none">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={col.key || idx}
                      className={`px-5 py-3.5 font-bold ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.width || ''} ${col.headerClassName || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentData.map((row, rowIdx) => {
                  const globalIdx = shouldPaginate ? startIndex + rowIdx : rowIdx;
                  return (
                    <tr
                      key={row._id || row.id || rowIdx}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`transition-colors ${
                        onRowClick ? 'cursor-pointer hover:bg-royal-tint/60' : 'hover:bg-royal-tint/30'
                      }`}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key || colIdx}
                          className={`px-5 py-4 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${col.truncate ? 'truncate max-w-xs' : ''} ${col.className || ''}`}
                        >
                          {col.render
                            ? col.render(row[col.key], row, globalIdx)
                            : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< 640px) */}
          <div className="sm:hidden p-3.5 space-y-3">
            {currentData.map((row, rowIdx) => {
              const globalIdx = shouldPaginate ? startIndex + rowIdx : rowIdx;
              return (
                <div
                  key={row._id || row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 transition-colors shadow-xs ${
                    onRowClick ? 'cursor-pointer active:bg-royal-tint/40' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <div
                      key={col.key || colIdx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 sm:gap-2 border-b border-slate-50 last:border-b-0 pb-1.5 last:pb-0"
                    >
                      <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex-shrink-0">
                        {col.header}:
                      </span>
                      <div className="text-slate-800 break-words font-medium text-left sm:text-right">
                        {col.render
                          ? col.render(row[col.key], row, globalIdx)
                          : row[col.key]}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {shouldPaginate && (
            <div className="p-4 border-t border-slate-200 bg-royal-tint/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                <span>Tarree </span>
                <strong className="text-slate-900">{startIndex + 1}</strong>
                <span> hanga </span>
                <strong className="text-slate-900">{endIndex}</strong>
                <span> (Waliigala: </span>
                <strong className="text-royal font-bold">{totalItems}</strong>
                <span>)</span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validCurrentPage === 1}
                  onClick={handlePrevPage}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  <span>Duraa</span>
                </Button>
                <span className="px-2 font-bold text-slate-800 text-xs">
                  {validCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validCurrentPage === totalPages}
                  onClick={handleNextPage}
                  aria-label="Next page"
                >
                  <span>Itti Aanu</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DataTable;