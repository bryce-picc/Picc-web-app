'use client';

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Button, Input } from '@/components/ui';

interface Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  searchPlaceholder?: string;
  onExportCsv?: () => void;
  mobileCardRenderer?: (row: TData) => ReactNode;
  getRowHref?: (row: TData) => string | null;
  rowAriaLabel?: (row: TData) => string;
}

export function AdvancedDataTable<TData, TValue>({
  columns,
  data,
  title,
  searchPlaceholder = 'Search...',
  onExportCsv,
  mobileCardRenderer,
  getRowHref,
  rowAriaLabel,
}: Props<TData, TValue>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const selectedCount = useMemo(() => Object.keys(rowSelection).length, [rowSelection]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border border-[#d8dee8] bg-white p-3 md:flex-row md:items-center md:justify-between">
        {title ? <h2 className="text-h2 font-semibold">{title}</h2> : null}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 min-w-0 flex-1 border-[#cbd3df] bg-white text-[#18212d] placeholder:text-[#929baa] sm:max-w-[360px] dark:bg-white dark:text-[#18212d] dark:placeholder:text-[#929baa]"
          />
          {onExportCsv ? (
            <Button variant="outline" className="h-11 min-w-[44px] shrink-0 border-[#cbd3df] bg-white text-[#263242] hover:bg-[#f3f6fa] dark:border-[#cbd3df] dark:bg-white dark:text-[#263242] dark:hover:bg-[#f3f6fa]" onClick={onExportCsv} aria-label="Export CSV">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          ) : null}
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{selectedCount} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="min-h-11 bg-white text-[#263242] hover:bg-[#edf2f7] dark:bg-white dark:text-[#263242] dark:hover:bg-[#edf2f7]">Tag</Button>
            <Button size="sm" variant="secondary" className="min-h-11 bg-white text-[#263242] hover:bg-[#edf2f7] dark:bg-white dark:text-[#263242] dark:hover:bg-[#edf2f7]">Assign</Button>
            <Button size="sm" variant="danger" className="min-h-11">Delete</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 text-[#18212d] md:hidden" data-testid="crm-directory-mobile">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const rowHref = getRowHref?.(row.original);
            return (
              <article
                key={row.id}
                className={`space-y-2 rounded-xl border border-[#d8dee8] bg-white p-3 text-[#18212d] shadow-[0_1px_2px_rgba(24,33,45,0.04)] ${rowHref ? 'cursor-pointer transition-colors hover:bg-[#f8fafc] active:bg-[#eef3f8]' : ''}`}
                role={rowHref ? 'link' : undefined}
                tabIndex={rowHref ? 0 : undefined}
                aria-label={rowHref ? rowAriaLabel?.(row.original) : undefined}
                onClick={rowHref ? () => router.push(rowHref) : undefined}
                onKeyDown={
                  rowHref
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(rowHref);
                        }
                      }
                    : undefined
                }
              >
                {mobileCardRenderer ? (
                  mobileCardRenderer(row.original)
                ) : (
                  row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">
                        {typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : String(cell.column.id)}
                      </span>
                      <span className="text-right">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                    </div>
                  ))
                )}
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-[#d8dee8] bg-white p-6 text-center text-[#697486]">No results.</div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-[#d8dee8] bg-white text-[#18212d] shadow-[0_1px_2px_rgba(24,33,45,0.04)] md:block" data-testid="crm-directory-desktop">
        <div className="max-h-[560px] overflow-auto bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#f1f5f9] text-[#344052]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap border-b border-[#d8dee8] px-3 py-2.5 text-left font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, idx) => {
                  const rowHref = getRowHref?.(row.original);
                  return (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={[
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]',
                        rowHref ? 'cursor-pointer transition-colors hover:bg-[#eef3f8]' : '',
                      ].join(' ')}
                      role={rowHref ? 'link' : undefined}
                      tabIndex={rowHref ? 0 : undefined}
                      aria-label={rowHref ? rowAriaLabel?.(row.original) : undefined}
                      onClick={rowHref ? () => router.push(rowHref) : undefined}
                      onKeyDown={
                        rowHref
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                router.push(rowHref);
                              }
                            }
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="border-b border-[#e2e7ee] px-3 py-2.5 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-28 text-center text-slate-500">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="min-h-11 border-[#cbd3df] bg-white text-[#263242] hover:bg-[#f3f6fa] dark:border-[#cbd3df] dark:bg-white dark:text-[#263242] dark:hover:bg-[#f3f6fa]" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="min-h-11 border-[#cbd3df] bg-white text-[#263242] hover:bg-[#f3f6fa] dark:border-[#cbd3df] dark:bg-white dark:text-[#263242] dark:hover:bg-[#f3f6fa]" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
