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
import {
  ESC_FINAL_PLACE_COLUMN_TITLE,
  escFinalPlaceSortKey,
  formatEscFinalPlace,
} from "./escFinalPlace";
import type {
  SongStatsRow,
  StatsGrain,
  StatsRow,
  VideoStatsRow,
} from "./types";
import { statsRowKey } from "./types";

type StatsTableProps = {
  grain: StatsGrain;
  rows: StatsRow[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  originalRanks: ReadonlyMap<string, number>;
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

function sharedStatColumns<T extends StatsRow>(): ColumnDef<T>[] {
  return [
    {
      accessorKey: "chart_points",
      header: "Chart Points",
    },
    {
      accessorKey: "esc_final_place",
      header: "ESC Place",
      meta: { title: ESC_FINAL_PLACE_COLUMN_TITLE },
      sortingFn: (rowA, rowB, columnId) =>
        escFinalPlaceSortKey(rowA.getValue(columnId)) -
        escFinalPlaceSortKey(rowB.getValue(columnId)),
      cell: ({ getValue }) => formatEscFinalPlace(getValue()),
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
  ];
}

export function StatsTable({
  grain,
  rows,
  sorting,
  onSortingChange,
  originalRanks,
}: StatsTableProps) {
  const columns = useMemo<ColumnDef<StatsRow>[]>(() => {
    const rankColumn: ColumnDef<StatsRow> = {
      id: "rank",
      header: "#",
      enableSorting: false,
      cell: ({ row }) => {
        const key = statsRowKey(row.original, grain);
        return originalRanks.get(key) ?? "—";
      },
    };

    if (grain === "video") {
      const videoColumns: ColumnDef<VideoStatsRow>[] = [
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
                  className="text-accent hover:underline"
                >
                  {title}
                </a>
              );
            }
            return title;
          },
        },
        ...sharedStatColumns<VideoStatsRow>(),
      ];
      return [rankColumn, ...(videoColumns as ColumnDef<StatsRow>[])];
    }

    const songColumns: ColumnDef<SongStatsRow>[] = [
      {
        id: "song_label",
        header: "Song",
        accessorFn: (row) => `${row.artist} — ${row.song}`,
        sortingFn: (rowA, rowB) => {
          const artistCmp = rowA.original.artist.localeCompare(rowB.original.artist);
          if (artistCmp !== 0) {
            return artistCmp;
          }
          return rowA.original.song.localeCompare(rowB.original.song);
        },
        cell: ({ row }) => {
          const label = `${row.original.artist} — ${row.original.song}`;
          const url = row.original.youtube_watch_url;
          if (url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {label}
              </a>
            );
          }
          return label;
        },
      },
      ...sharedStatColumns<SongStatsRow>(),
    ];
    return [rankColumn, ...(songColumns as ColumnDef<StatsRow>[])];
  }, [grain, originalRanks]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
  });

  const titleColumnId = grain === "video" ? "video_title" : "song_label";

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
                        title={
                          typeof header.column.columnDef.meta === "object" &&
                          header.column.columnDef.meta !== null &&
                          "title" in header.column.columnDef.meta
                            ? String(header.column.columnDef.meta.title)
                            : undefined
                        }
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
              key={statsRowKey(row.original, grain)}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={[
                    "px-3 py-2 text-zinc-800 dark:text-zinc-200",
                    cell.column.id === titleColumnId
                      ? "min-w-[16rem] max-w-xl whitespace-normal"
                      : "whitespace-nowrap",
                    cell.column.id === "esc_final_place"
                      ? "text-right tabular-nums"
                      : "",
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
