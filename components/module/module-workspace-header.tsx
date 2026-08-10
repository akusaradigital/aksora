"use client";

import { Plus, FileXls, FilePdf, UploadSimple, MagnifyingGlass, Table, Kanban } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { ModuleFilterBar, type FilterValue } from "@/components/module/module-filter-bar";
import { ColumnVisibilityToggle } from "@/components/module/column-visibility-toggle";
import { SavedViews } from "@/components/module/saved-views";

type FilterOption = {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

type ColumnDef = {
  key: string;
  label: string;
};

type WorkspaceHeaderProps = {
  module: string;
  title: string;
  shortTitle: string;
  description: string;
  icon?: ReactNode;
  canAdd: boolean;
  topContent?: ReactNode;
  showForm: boolean;
  viewMode: "table" | "kanban";
  hasKanban: boolean;
  pending: boolean;
  refreshing: boolean;
  onToggleForm: () => void;
  onSetViewMode: (mode: "table" | "kanban") => void;
  onImportFile: (file: File) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterOptions?: FilterOption[];
  activeFilters?: FilterValue[];
  onFilterChange?: (filters: FilterValue[]) => void;
  allColumns?: ColumnDef[];
  visibleColumnKeys?: string[];
  onToggleColumn?: (key: string) => void;
  onResetColumns?: () => void;
};

export function ModuleWorkspaceHeader({
  module,
  title,
  shortTitle,
  description,
  icon,
  canAdd,
  topContent,
  showForm,
  viewMode,
  hasKanban,
  pending,
  refreshing,
  onToggleForm,
  onSetViewMode,
  onImportFile,
  search,
  onSearchChange,
  filterOptions,
  activeFilters,
  onFilterChange,
  allColumns,
  visibleColumnKeys,
  onToggleColumn,
  onResetColumns,
}: WorkspaceHeaderProps) {
  return (
    <>
      <div className="border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              {icon ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700 border border-blue-100">
                  {icon}
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">{title}</h2>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>

          {!showForm ? (
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:flex-1 xl:justify-end">
              <div className="relative w-full min-w-0 md:w-56 xl:max-w-56">
                <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-gray-400">
                  <MagnifyingGlass size={14} weight="bold" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={`Search ${shortTitle.toLowerCase()}...`}
                  className="h-8 w-full border border-gray-200 bg-white pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-blue-500"
                />
              </div>

              {canAdd && (
                <button
                  type="button"
                  onClick={onToggleForm}
                  className="inline-flex h-8 items-center gap-1.5 bg-blue-600 px-3 text-[13px] font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus size={14} weight="bold" className="shrink-0" />
                  Add {shortTitle}
                </button>
              )}
              <a
                href={`/api/export/${module}`}
                title="Export Excel"
                aria-label="Export Excel"
                className="inline-flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-blue-600"
              >
                <FileXls size={15} weight="bold" />
              </a>

              <a
                href={`/api/export/${module}?format=pdf`}
                title="Print / Export PDF"
                aria-label="Print / Export PDF"
                className="inline-flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-blue-600"
              >
                <FilePdf size={15} weight="bold" />
              </a>

              {canAdd && (
                <label
                  title="Import Excel"
                  aria-label="Import Excel"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-blue-600"
                >
                  <UploadSimple size={15} weight="bold" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onImportFile(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}

              {allColumns && visibleColumnKeys && onToggleColumn && onResetColumns && (
                <ColumnVisibilityToggle
                  allColumns={allColumns}
                  visibleKeys={visibleColumnKeys}
                  onToggle={onToggleColumn}
                  onReset={onResetColumns}
                />
              )}

              {topContent ? <div className="flex w-full basis-full flex-col items-end">{topContent}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
      {!showForm && (
        <div className="sticky top-0 z-[var(--z-sticky)] border-b border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {hasKanban ? (
                <div className="flex h-8 items-center border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onSetViewMode("table")}
                    className={`h-full px-3 text-[12px] font-medium transition-colors ${
                      viewMode === "table"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Table size={13} weight="bold" />
                      Table
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetViewMode("kanban")}
                    className={`h-full border-l border-gray-200 px-3 text-[12px] font-medium transition-colors ${
                      viewMode === "kanban"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Kanban size={13} weight="bold" />
                      Kanban
                    </span>
                  </button>
                </div>
              ) : null}

              {(pending || refreshing) && (
                <span role="status" className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
                  <span className="h-3 w-3 animate-square-spin bg-blue-600" />
                  Refreshing...
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
              {filterOptions && filterOptions.length > 0 && activeFilters && onFilterChange && (
                <SavedViews
                  module={module}
                  activeFilters={activeFilters}
                  search={search}
                  viewMode={viewMode}
                  onApplyView={(filters, newSearch, newViewMode) => {
                    onFilterChange(filters);
                    onSearchChange(newSearch);
                    onSetViewMode(newViewMode);
                  }}
                />
              )}
              {filterOptions && filterOptions.length > 0 && activeFilters && onFilterChange && (
                <ModuleFilterBar
                  filters={filterOptions}
                  activeFilters={activeFilters}
                  onFilterChange={onFilterChange}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

