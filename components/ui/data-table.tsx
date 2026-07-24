"use client";

import * as React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  pageSizeOptions?: number[];
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  bulkActions?: React.ReactNode;
  onExport?: (data: T[]) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  selectable = false,
  onSelectionChange,
  bulkActions,
  onExport,
  getRowId = (row) => JSON.stringify(row),
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>(null);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const getValue = (row: T, col: Column<T>) => {
    if (col.accessor) return col.accessor(row);
    return row[col.key] as string | number;
  };

  const filtered = React.useMemo(() => {
    return data.filter((row) =>
      Object.entries(filters).every(([key, query]) => {
        if (!query) return true;
        const col = columns.find((c) => c.key === key);
        if (!col) return true;
        const val = String(getValue(row, col)).toLowerCase();
        return val.includes(query.toLowerCase());
      })
    );
  }, [data, filters, columns]);

  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = getValue(a, col);
      const bv = getValue(b, col);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  React.useEffect(() => { setPage(0); }, [filters, pageSize]);

  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(sorted.filter((row) => selected.has(getRowId(row))));
    }
  }, [selected]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc");
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(getRowId)));
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="size-3.5 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectable && selected.size > 0 && (
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          )}
          {selectable && selected.size > 0 && bulkActions}
        </div>
        {onExport && (
          <Button variant="outline" size="sm" onClick={() => onExport(sorted)}>
            <Download className="size-4 mr-1" /> Export
          </Button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {selectable && (
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && selected.size === paged.length}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="rounded"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="p-3 text-left font-medium">
                  <div className="space-y-1">
                    <button
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.sortable && "cursor-pointer hover:text-foreground"
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                      disabled={!col.sortable}
                      aria-label={col.sortable ? `Sort by ${col.header}` : undefined}
                    >
                      {col.header}
                      {col.sortable && <SortIcon col={col.key} />}
                    </button>
                    {col.filterable && (
                      <div className="relative">
                        <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={filters[col.key] || ""}
                          onChange={(e) => setFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                          className="h-6 w-full rounded border bg-background pl-6 pr-2 text-xs"
                          aria-label={`Filter ${col.header}`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="p-8 text-center text-muted-foreground">{emptyMessage}</td></tr>
            ) : (
              paged.map((row) => {
                const id = getRowId(row);
                return (
                  <tr key={id} className={cn("hover:bg-muted/30", selected.has(id) && "bg-primary/5")}>
                    {selectable && (
                      <td className="p-3"><input type="checkbox" checked={selected.has(id)} onChange={() => toggleRow(id)} aria-label="Select row" className="rounded" /></td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="p-3">
                        {col.render ? col.render(row) : String(getValue(row, col) ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {paged.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        ) : (
          paged.map((row) => {
            const id = getRowId(row);
            return (
              <div key={id} className={cn("rounded-lg border p-4 space-y-2", selected.has(id) && "ring-2 ring-primary/30")}>
                {selectable && (
                  <div className="flex justify-end">
                    <input type="checkbox" checked={selected.has(id)} onChange={() => toggleRow(id)} aria-label="Select row" className="rounded" />
                  </div>
                )}
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{col.header}</span>
                    <span className="text-sm text-right">{col.render ? col.render(row) : String(getValue(row, col) ?? "")}</span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded border bg-background px-2 text-sm"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">
            {sorted.length === 0 ? "0 of 0" : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`}
          </span>
          <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
