import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { DEFAULT_VIDEO_SORT } from "./sort";
import type { VideoStatsRow } from "./types";

type StatsTableProps = {
  rows: VideoStatsRow[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

function SortLabel({
  label,
  sorted,
}: {
  label: string;
  sorted: false | "asc" | "desc";
}) {
  if (!sorted) {
    return <span>{label}</span>;
  }
  return (
    <span>
      {label} {sorted === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function StatsTable({ rows, sorting, onSortingChange }: StatsTableProps) {
  const columns = useMemo<ColumnDef<VideoStatsRow>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: "video_title",
        header: "Video",
        cell: ({ row }) => {
          const title = row.original.video_title;
          const url = row.original.youtube_watch_url;
          if (url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline dark:text-blue-400"
              >
                {title}
              </a>
            );
          }
          return title;
        },
      },
      {
        accessorKey: "chart_points",
        header: "Points",
      },
      {
        accessorKey: "top1",
        header: "Top 1",
      },
      {
        accessorKey: "top3",
        header: "Top 3",
      },
      {
        accessorKey: "top5",
        header: "Top 5",
      },
      {
        accessorKey: "top10",
        header: "Top 10",
      },
      {
        accessorKey: "top20",
        header: "Top 20",
      },
      {
        accessorKey: "flag",
        header: "Flag",
        enableSorting: false,
      },
      {
        accessorKey: "country",
        header: "Country",
      },
      {
        accessorKey: "year",
        header: "Year",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <SortLabel
                          label={String(header.column.columnDef.header)}
                          sorted={header.column.getIsSorted()}
                        />
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-900 dark:bg-zinc-950">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.original.video_title}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={[
                    "px-3 py-2 text-zinc-800 dark:text-zinc-200",
                    cell.column.id === "video_title"
                      ? "min-w-[16rem] max-w-xl whitespace-normal"
                      : "whitespace-nowrap",
                  ].join(" ")}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
