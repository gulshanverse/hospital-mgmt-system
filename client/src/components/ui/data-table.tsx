import * as React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Download,
  EyeOff,
  Filter,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  sticky?: "left" | "right";
  render?: (row: T) => React.ReactNode;
}

interface FilterOption {
  label: string;
  value: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  stickyHeader?: boolean;
  bulkActions?: {
    label: string;
    action: (rows: T[]) => void;
    variant?: "default" | "destructive" | "secondary";
  }[];
  customFilters?: {
    key: string;
    label: string;
    options: FilterOption[];
  }[];
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  stickyHeader = true,
  bulkActions = [],
  customFilters = [],
}: DataTableProps<T>) {
  // Search & Filter State
  const [globalSearch, setGlobalSearch] = React.useState("");
  const [columnSearch, setColumnSearch] = React.useState<
    Record<string, string>
  >({});
  const [selectedFilters, setSelectedFilters] = React.useState<
    Record<string, string>
  >({});
  const [visibleColumns, setVisibleColumns] = React.useState<
    Record<string, boolean>
  >(() => columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}));

  // Sorting State
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Selection State
  const [selectedRows, setSelectedRows] = React.useState<
    Record<number, boolean>
  >({});

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Reset page on search/filter changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedRows({});
  }, [globalSearch, columnSearch, selectedFilters]);

  // Toggle Column Visibility
  const toggleColumnVisibility = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sorting Trigger
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    const activeCols = columns.filter(col => visibleColumns[col.key]);
    const headers = activeCols.map(col => col.header).join(",");
    const rows = filteredData.map(row =>
      activeCols
        .map(col => {
          const val = row[col.key];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering Logic
  const filteredData = React.useMemo(() => {
    return data
      .filter(row => {
        // Global Search
        if (globalSearch) {
          const searchLower = globalSearch.toLowerCase();
          const match = Object.values(row).some(val =>
            String(val ?? "")
              .toLowerCase()
              .includes(searchLower)
          );
          if (!match) return false;
        }

        // Column Search
        for (const [key, searchVal] of Object.entries(columnSearch)) {
          if (searchVal) {
            const rowVal = String(row[key] ?? "").toLowerCase();
            if (!rowVal.includes(searchVal.toLowerCase())) return false;
          }
        }

        // Custom Filters
        for (const [key, filterVal] of Object.entries(selectedFilters)) {
          if (filterVal) {
            const rowVal = String(row[key] ?? "");
            if (rowVal !== filterVal) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal ?? "").toLowerCase();
        const bStr = String(bVal ?? "").toLowerCase();
        return sortOrder === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
  }, [data, globalSearch, columnSearch, selectedFilters, sortKey, sortOrder]);

  // Paginated Data
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    const newSelected: Record<number, boolean> = {};
    if (checked) {
      paginatedData.forEach((_, idx) => {
        newSelected[idx] = true;
      });
    }
    setSelectedRows(newSelected);
  };

  const handleSelectRow = (idx: number, checked: boolean) => {
    setSelectedRows(prev => ({ ...prev, [idx]: checked }));
  };

  const getSelectedObjects = () => {
    return Object.keys(selectedRows)
      .filter(k => selectedRows[Number(k)])
      .map(k => paginatedData[Number(k)]);
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((_, idx) => selectedRows[idx]);
  const isSomeSelected =
    paginatedData.length > 0 &&
    !isAllSelected &&
    paginatedData.some((_, idx) => selectedRows[idx]);

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Global search records..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Filters */}
          {customFilters.map(f => (
            <div
              key={f.key}
              className="flex items-center gap-1.5 border border-border/80 rounded-lg px-2 py-1 bg-background text-xs shadow-2xs"
            >
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">
                {f.label}:
              </span>
              <select
                value={selectedFilters[f.key] || ""}
                onChange={e =>
                  setSelectedFilters(prev => ({
                    ...prev,
                    [f.key]: e.target.value,
                  }))
                }
                className="bg-transparent border-0 font-medium outline-hidden pr-2 text-foreground focus:ring-0 focus:outline-hidden cursor-pointer"
              >
                <option value="">All</option>
                {f.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Export button */}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>

          {/* Column Visibility Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns[col.key]}
                  onCheckedChange={() => toggleColumnVisibility(col.key)}
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bulk Action Panel */}
      {bulkActions.length > 0 && Object.values(selectedRows).some(Boolean) && (
        <div className="flex items-center justify-between p-3 border border-primary/20 bg-primary/5 rounded-xl animate-in fade-in slide-in-from-top-1">
          <span className="text-sm font-semibold text-primary">
            {getSelectedObjects().length} record(s) selected
          </span>
          <div className="flex gap-2">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant || "default"}
                onClick={() => action.action(getSelectedObjects())}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Grid Card */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto relative">
          <table className="w-full caption-bottom text-sm border-collapse">
            <thead
              className={cn(
                stickyHeader && "sticky top-0 bg-card z-10 border-b shadow-2xs"
              )}
            >
              <tr className="border-b transition-colors hover:bg-transparent">
                {/* Bulk Select Checkbox Header */}
                <th className="h-11 px-4 text-left align-middle font-medium w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={checked =>
                      handleSelectAll(checked === true)
                    }
                    aria-label="Select all rows"
                  />
                </th>
                {columns
                  .filter(col => visibleColumns[col.key])
                  .map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={cn(
                        "h-11 px-4 text-left align-middle font-bold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap select-none",
                        col.sortable &&
                          "cursor-pointer hover:bg-secondary/40 hover:text-foreground",
                        col.sticky === "left" &&
                          "sticky left-0 bg-card z-20 border-r",
                        col.sticky === "right" &&
                          "sticky right-0 bg-card z-20 border-l"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortable &&
                          sortKey === col.key &&
                          sortOrder === "asc" && (
                            <ChevronUp className="h-3.5 w-3.5 text-primary" />
                          )}
                        {col.sortable &&
                          sortKey === col.key &&
                          sortOrder === "desc" && (
                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          )}
                        {col.sortable && sortKey !== col.key && (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: pageSize }).map((_, rIdx) => (
                  <tr key={rIdx} className="border-b">
                    <td className="p-4 w-12">
                      <Skeleton className="h-4 w-4 rounded-xs" />
                    </td>
                    {columns
                      .filter(col => visibleColumns[col.key])
                      .map((_, cIdx) => (
                        <td key={cIdx} className="p-4">
                          <Skeleton className="h-4 w-28" />
                        </td>
                      ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty State Row
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="h-72 text-center p-8"
                  >
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>No records found</EmptyTitle>
                        <EmptyDescription>
                          Try adjusting your filters or search keywords to
                          locate details.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </td>
                </tr>
              ) : (
                // Data Rows
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={cn(
                      "border-b transition-colors hover:bg-secondary/40",
                      selectedRows[rowIdx] && "bg-secondary/50"
                    )}
                  >
                    <td className="p-4 align-middle w-12">
                      <Checkbox
                        checked={!!selectedRows[rowIdx]}
                        onCheckedChange={checked =>
                          handleSelectRow(rowIdx, checked === true)
                        }
                        aria-label={`Select row ${rowIdx}`}
                      />
                    </td>
                    {columns
                      .filter(col => visibleColumns[col.key])
                      .map(col => {
                        const cellVal = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "p-4 align-middle whitespace-nowrap",
                              col.sticky === "left" &&
                                "sticky left-0 bg-background hover:bg-secondary/30 z-10 border-r",
                              col.sticky === "right" &&
                                "sticky right-0 bg-background hover:bg-secondary/30 z-10 border-l"
                            )}
                          >
                            {col.render
                              ? col.render(row)
                              : String(cellVal ?? "-")}
                          </td>
                        );
                      })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Column search panels (collapsible or filters) */}
        <div className="flex border-t items-center justify-between p-4 bg-background/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent border-0 font-medium py-0.5 text-foreground outline-hidden focus:ring-0 focus:outline-hidden cursor-pointer"
            >
              {[5, 10, 20, 50].map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="ml-4">
              Showing{" "}
              {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}{" "}
              to {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
              {filteredData.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
