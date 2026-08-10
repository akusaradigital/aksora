"use client";

import { useCallback, useEffect, useState, useTransition, useRef, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ModuleKey, moduleConfigs } from "@/lib/modules";
import { toast } from "@/components/ui/toast";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { type Attachment } from "@/components/shared/attachment-uploader";
import { getFieldIcons, getModuleWorkspaceCrumbs, getModuleWorkspacePermissions, getPreferredColumnOrder } from "@/components/module/module-workspace-utils";
import { useModuleWorkspaceActions } from "@/components/module/use-module-workspace-actions";
import { ModuleWorkspaceShell } from "@/components/module/module-workspace-shell";
import { buildWorkspaceUrl, withUpdatedWorkspaceParams } from "@/components/module/module-workspace-url";
import { useDetailViewUrl } from "@/hooks/use-detail-view-url";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { getUserRoleOptions } from "@/lib/roles";
import { getLatestVersion, getNextVersion } from "@/components/module/module-workspace-content-helpers";
import { useWorkspaceRowHandlers, useColumnVisibility } from "@/components/module/module-workspace-content-handlers";


type Row = Record<string, string | number> & { id: string | number };

export function ModuleWorkspace({
  module,
  rows,
  kanbanRows = rows,
  currentPage,
  totalPages,
  totalItems,
  relatedOptions = {},
  initialFormValues = {},
  hiddenFields = [],
  user = null,
  topContent = null,
  versionSequenceDefaultValue = "",
  viewId = null,
}: {
  module: ModuleKey;
  rows: Row[]; 
  kanbanRows?: Row[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  relatedOptions?: Record<string, Array<{ label: string; value: string }>>;
  initialFormValues?: Record<string, string>;
  hiddenFields?: string[];
  user?: any;
  topContent?: ReactNode;
  versionSequenceDefaultValue?: string;
  viewId?: string | null;
}) {
  const config = moduleConfigs[module];
  const resolvedConfig = useMemo(() => {
    if (module !== "users") return config;
    const userRoleField = config.fields.find((field) => field.name === "role");
    if (!userRoleField || !("options" in userRoleField)) return config;
    return {
      ...config,
      fields: config.fields.map((field) =>
        field.name === "role" && "options" in field
          ? { ...field, options: getUserRoleOptions(String(user?.company ?? "")) }
          : field,
      ),
    };
  }, [config, module, user?.company]);
  const nextRouter = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = useMemo(() => searchParams.toString(), [searchParams]);
  const router = useMemo(() => ({
    refresh: () => {
      const url = currentSearch ? `${pathname}?${currentSearch}` : pathname;
      nextRouter.replace(url);
    },
  }), [nextRouter, pathname, currentSearch]);
  const [pending, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);
  const [localKanbanRows, setLocalKanbanRows] = useState(kanbanRows);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);
  const [duplicates, setDuplicates] = useState<{ id: number; code: string; title: string; status: string }[]>([]);
  const [lastSprint, setLastSprint] = useState<string | null>(null);
  const [sprintDuplicate, setSprintDuplicate] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dateWarnings, setDateWarnings] = useState<Record<string, "past" | "future">>({});
  const [reopenId, setReopenId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [viewingRow, setViewingRow] = useState<Row | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [openSelectField, setOpenSelectField] = useState<string | null>(null);
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(
    () => searchParams.get("q") ?? "",
  );
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Undo delete
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);

  // Row handlers (bulk select, inline update, reorder)
  const {
    selectedIds,
    handleToggleSelect,
    handleToggleSelectAll,
    handleBulkDelete,
    handleInlineUpdate,
    handleReorder,
  } = useWorkspaceRowHandlers({
    module,
    rows,
    localRows,
    router,
    setLocalRows,
    setLocalKanbanRows,
  });

  const { canAdd, canEdit, canDelete, isViewer } = useMemo(
    () => getModuleWorkspacePermissions(String(user?.role || "qa")),
    [user?.role],
  );
  const assigneeLocked = module === "assignees";
  const effectiveCanAdd = canAdd && !assigneeLocked;
  const effectiveCanEdit = canEdit && !assigneeLocked;
  const effectiveCanDelete = canDelete && !assigneeLocked;

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  useEffect(() => {
    setLocalKanbanRows(kanbanRows);
  }, [kanbanRows]);

  // URL synchronization for shareable detail links
  const handleOpenRow = useCallback((row: Row) => { setViewingRow(row); }, []);
  const handleCloseRow = useCallback(() => { setViewingRow(null); }, []);
  const handleNotFound = useCallback(() => { toast("The requested item was not found", "error"); }, []);
  const handleAccessDenied = useCallback(() => { toast("You don't have permission to view this item", "error"); }, []);
  const handleTabChange = useCallback((tab: string | null) => { setActiveTab(tab); }, []);

  useDetailViewUrl({ module, viewingRow, initialViewId: viewId, localRows, onOpenRow: handleOpenRow, onCloseRow: handleCloseRow, onNotFound: handleNotFound, onAccessDenied: handleAccessDenied, activeTab, onTabChange: handleTabChange });

  // Reset page when search/filter changes
  const statusOptions = useMemo(() => {
    const f = resolvedConfig.fields.find((f) => f.name === "status");
    return f && "options" in f ? f.options : [];
  }, [resolvedConfig.fields]);
  const hasKanban = statusOptions.length > 0 && (module === "tasks" || module === "bugs" || module === "test-cases" || module === "sprints");

  const priorityOptions = useMemo(() => {
    const f = resolvedConfig.fields.find((f) => f.name === "priority");
    return f && "options" in f ? f.options : [];
  }, [resolvedConfig.fields]);
  const severityOptions = useMemo(() => {
    const f = resolvedConfig.fields.find((f) => f.name === "severity");
    return f && "options" in f ? f.options : [];
  }, [resolvedConfig.fields]);

  // Build filter options from module config
  const filterOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }> = [];
    if (statusOptions.length > 0) opts.push({ key: "status", label: "Status", options: statusOptions });
    if (priorityOptions.length > 0) opts.push({ key: "priority", label: "Priority", options: priorityOptions });
    if (severityOptions.length > 0) opts.push({ key: "severity", label: "Severity", options: severityOptions });
    return opts;
  }, [statusOptions, priorityOptions, severityOptions]);

  // Active filters state
  const [activeFilters, setActiveFilters] = useState<Array<{ key: string; value: string; label: string }>>([]);

  const fieldIcons = useMemo(() => getFieldIcons(), []);

  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => { setSearch(searchParams.get("q") ?? ""); }, [searchParams]);

  const replaceWorkspaceUrl = useCallback((params: URLSearchParams) => {
    nextRouter.replace(buildWorkspaceUrl(pathname, params));
  }, [nextRouter, pathname]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const params = withUpdatedWorkspaceParams(currentSearch, (p) => {
        if (value.trim()) { p.set("q", value.trim()); p.set("page", "1"); } else { p.delete("q"); }
      });
      replaceWorkspaceUrl(params);
    }, 400);
  };

  useEffect(() => { return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }; }, []);

  // Go to specific page
  const handleGoToPage = useCallback((targetPage: number) => {
    replaceWorkspaceUrl(withUpdatedWorkspaceParams(currentSearch, (p) => { p.set("page", String(targetPage)); }));
  }, [currentSearch, replaceWorkspaceUrl]);

  // All modules support manual reordering
  const reorderable = true;

  const visibleRows = useMemo(() => {
    if (activeFilters.length === 0) return localRows;
    return localRows.filter((row) =>
      activeFilters.every((f) => String(row[f.key] ?? "").toLowerCase() === f.value.toLowerCase()),
    );
  }, [localRows, activeFilters]);
  const preferredColumnOrder = useMemo(() => getPreferredColumnOrder(module), [module]);
  const defaultVisibleColumns = config.columns
    .filter((column) => preferredColumnOrder.includes(column.key))
    .sort((a, b) => preferredColumnOrder.indexOf(a.key) - preferredColumnOrder.indexOf(b.key));
  const defaultColumns = useMemo(
    () => defaultVisibleColumns.length > 0 ? defaultVisibleColumns : config.columns.slice(0, Math.min(6, config.columns.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module]
  );
  const defaultColumnKeys = useMemo(() => defaultColumns.map((c) => c.key), [defaultColumns]);

  const {
    visibleColumnKeys,
    handleToggleColumn,
    handleResetColumns,
  } = useColumnVisibility(module, defaultColumnKeys, config.columns);

  const visibleColumns = useMemo(
    () => config.columns.filter((col) => visibleColumnKeys.includes(col.key)),
    [config.columns, visibleColumnKeys],
  );
  const versionSequenceField = resolvedConfig.fields.find((field) => field.helperKind === "version-sequence");
  const versionSequenceDefault = useMemo(() => getNextVersion(getLatestVersion(localRows)), [localRows]);
  const versionSequenceLabel =
    versionSequenceField && versionSequenceField.name
      ? String(editingRow?.[versionSequenceField.name] ?? localRows[0]?.[versionSequenceField.name] ?? "").trim()
      : "";
  const crumbs = useMemo(() => getModuleWorkspaceCrumbs(module, config.title), [config.title, module]);

  const goToPage = useCallback((nextPage: number) => {
    replaceWorkspaceUrl(withUpdatedWorkspaceParams(currentSearch, (p) => { p.set("page", String(nextPage)); }));
  }, [currentSearch, replaceWorkspaceUrl]);

  // Memoized: large object passed to useModuleWorkspaceActions, avoids recreation every render
  const actionArgs = useMemo(() => ({
    module, configFields: resolvedConfig.fields, rows: localRows, initialFormValues, router, toast,
    startTransition, showForm, editingRow, deleteId, pendingDeleteId, undoTimerRef, formDirty,
    openSelectField, setSelectValues, setRefreshing, setRows: setLocalRows, setShowForm,
    setEditingRow, setViewingRow, setFieldErrors, setDuplicates, setSprintDuplicate, setLastSprint,
    setAttachments, setDateWarnings, setFormDirty, setOpenSelectField, setPendingDeleteId,
    setDeleteId, setKanbanRows: setLocalKanbanRows,
  }), [module, resolvedConfig.fields, localRows, initialFormValues, router, showForm, editingRow, deleteId, pendingDeleteId, formDirty, openSelectField]) satisfies Parameters<typeof useModuleWorkspaceActions>[0];

  const {
    refreshPage,
    openFormEditor,
    closeFormEditor,
    handleFormSubmit,
    onImport,
    onUpdateStatus,
    onBatchReorder,
    performSingleDelete,
    checkDuplicates,
    checkSprintDuplicate,
  } = useModuleWorkspaceActions(actionArgs);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    useMemo(() => [
      { key: "n", description: "New item", action: () => { if (effectiveCanAdd && !showForm) openFormEditor(); } },
      { key: "Escape", description: "Close form/modal", action: () => { if (showForm) closeFormEditor(); else if (viewingRow) { setViewingRow(null); setActiveTab(null); } } },
      { key: "ArrowLeft", description: "Previous page", action: () => { if (safePage > 1) goToPage(safePage - 1); } },
      { key: "ArrowRight", description: "Next page", action: () => { if (safePage < totalPages) goToPage(safePage + 1); } },
    ], [effectiveCanAdd, showForm, viewingRow, safePage, totalPages]),
    !showForm || true,
  );

  const handleToggleForm = useCallback(() => {
    if (showForm) closeFormEditor();
    else openFormEditor();
  }, [showForm, closeFormEditor, openFormEditor]);

  const handleImportFile = useCallback((file: File) => {
    startTransition(() => {
      void onImport(file);
    });
  }, [onImport]);

  const handleEditRow = useCallback((row: Row) => openFormEditor(row as Row), [openFormEditor]);
  const handleViewRow = useCallback((row: Row) => setViewingRow(row as Row), []);
  const handleDeleteRow = useCallback((row: Row) => setDeleteId(row.id as string | number), []);
  const handleReopenRow = useCallback((row: Row) => {
    setReopenId(Number(row.id as string | number));
    setReopenReason("");
  }, []);
  const handlePrevPage = useCallback(() => goToPage(Math.max(1, safePage - 1)), [safePage, goToPage]);
  const handleNextPage = useCallback(() => goToPage(Math.min(totalPages, safePage + 1)), [safePage, totalPages, goToPage]);
  const handleCloseView = useCallback(() => {
    setViewingRow(null);
    setActiveTab(null);
  }, []);
  const handleEditView = useCallback(() => {
    setViewingRow(null);
    openFormEditor(viewingRow);
  }, [openFormEditor, viewingRow]);
  const handleDeleteCancel = useCallback(() => setDeleteId(null), []);
  const handleReopenCancel = useCallback(() => setReopenId(null), []);
  const handleReopenConfirm = useCallback(async () => {
    if (!reopenId) return;
    const reason = reopenReason.trim() || "Re-opened";
    startTransition(async () => {
      await fetch(`/api/items/bugs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reopenId, status: "open" }),
      });
      setReopenId(null);
      setReopenReason("");
      toast(`Bug re-opened: ${reason}`, "success");
      refreshPage();
    });
  }, [reopenId, reopenReason, refreshPage]);
  const handleFormChange = useCallback(() => setFormDirty(true), []);
  const handleAdd = useCallback(() => openFormEditor(), [openFormEditor]);

  return (
    <div className="space-y-6">
      <div className="animate-in fade-in  duration-150">
        <Breadcrumb crumbs={crumbs} />
      </div>
      <ModuleWorkspaceShell
        module={module}
        config={resolvedConfig as any}
        topContent={topContent}
        showForm={showForm}
        viewMode={viewMode}
        hasKanban={hasKanban}
        pending={pending}
        refreshing={refreshing}
        hiddenFields={hiddenFields}
        fieldIcons={fieldIcons}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        canAdd={effectiveCanAdd}
        canEdit={effectiveCanEdit}
        canDelete={effectiveCanDelete}
        isViewer={isViewer}
        relatedOptions={relatedOptions}
        selectValues={selectValues}
        openSelectField={openSelectField}
        attachments={attachments as any}
        duplicates={duplicates}
        sprintDuplicate={sprintDuplicate}
        lastSprint={lastSprint}
        dateWarnings={dateWarnings}
        editingRow={editingRow}
        visibleRows={visibleRows}
        kanbanRows={localKanbanRows}
        visibleColumns={visibleColumns}
        safePage={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        statusOptions={statusOptions}
        pendingDeleteId={pendingDeleteId}
        deleteOpen={deleteId !== null}
        reopenOpen={reopenId !== null}
        reopenReason={reopenReason}
        viewingRow={viewingRow}
        search={search}
        onSearchChange={handleSearchChange}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        allColumns={config.columns}
        visibleColumnKeys={visibleColumnKeys}
        onToggleColumn={handleToggleColumn}
        onResetColumns={handleResetColumns}
        onToggleForm={handleToggleForm}
        onSetViewMode={setViewMode}
        onImportFile={handleImportFile}
        onFormChange={handleFormChange}
        onSubmit={handleFormSubmit}
        onCancelForm={closeFormEditor}
        checkDuplicates={checkDuplicates}
        checkSprintDuplicate={checkSprintDuplicate}
        setOpenSelectField={setOpenSelectField}
        setSelectValues={setSelectValues}
        setAttachments={setAttachments as any}
        setDateWarnings={setDateWarnings}
        setSprintDuplicate={setSprintDuplicate}
        versionSequenceLabel={versionSequenceLabel}
        versionSequenceDefaultValue={versionSequenceDefaultValue || versionSequenceDefault}
        onAdd={handleAdd}
        onEditRow={handleEditRow}
        onViewRow={handleViewRow}
        onDeleteRow={handleDeleteRow}
        onReopenRow={handleReopenRow}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onGoToPage={handleGoToPage}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onBulkDelete={handleBulkDelete}
        onInlineUpdate={handleInlineUpdate}
        onReorder={handleReorder}
        reorderable={reorderable}
        onUpdateStatus={onUpdateStatus}
        onBatchReorder={onBatchReorder}
        onDeleteConfirm={performSingleDelete}
        onDeleteCancel={handleDeleteCancel}
        onReopenReasonChange={setReopenReason}
        onReopenCancel={handleReopenCancel}
        onReopenConfirm={handleReopenConfirm}
        onCloseView={handleCloseView}
        onEditView={handleEditView}
        initialTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
