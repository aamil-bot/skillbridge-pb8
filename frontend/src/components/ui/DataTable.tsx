import type { ReactNode } from "react";

import { cn } from "@/lib/format";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "Nothing to show yet.",
  highlightRow,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  highlightRow?: (row: T) => boolean;
}) {
  const alignment = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  } as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-500",
                  alignment[column.align ?? "left"],
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-sm text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  "border-b border-slate-100 last:border-0",
                  highlightRow?.(row)
                    ? "bg-brand-50/60"
                    : "hover:bg-slate-50",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-3 align-middle text-slate-700",
                      alignment[column.align ?? "left"],
                      column.className,
                    )}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
