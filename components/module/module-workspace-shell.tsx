"use client";

import dynamic from"next/dynamic";
import { type Attachment } from"@/components/shared/attachment-uploader";
import { ModuleWorkspaceHeader } from"@/components/module/module-workspace-header";
import { ModuleWorkspaceTable } from"@/components/module/module-workspace-table";
import { ModuleWorkspaceForm } from"@/components/module/module-workspace-form";
import { ModuleMobileCards } from"@/components/module/module-mobile-cards";
import type { Dispatch, ReactNode, SetStateAction } from"react";
import { getModuleWorkspaceIcon } from"@/components/module/module-workspace-utils";

const KanbanBoard = dynamic(() => import("@/components/module/kanban-board").then((module) => module.KanbanBoard), {
 ssr: false,
 loading: () => <div className="h-40  border border-gray-200 bg-gray-50" />,
});

const ViewModal = dynamic(() => import("@/components/module/module-view-modal").then((module) => module.ViewModal), {
 ssr: false,
 loading: () => null,
});

const ModuleWorkspaceModals = dynamic(
 () => import("@/components/module/module-workspace-modals").then((module) => module.ModuleWorkspaceModals),
 {
  ssr: false,
  loading: () => null,
 },
);

const FormDrawer = dynamic(() => import("@/components/shared/form-drawer").then((module) => module.FormDrawer), {
 ssr: false,
 loading: () => <div className="fixed inset-y-0 right-0 w-full max-w-lg border-l border-gray-200 bg-white" />,
});

type Row = Record<string, string | number> & { id: string | number };

type WorkspaceConfig = {
 title: string;
 shortTitle: string;
 description: string;
 fields: any[];
 columns: Array<{ key: string }>;
};

type Props = {
 module: string;
 config: WorkspaceConfig;
 topContent?: ReactNode;
 showForm: boolean;
 viewMode:"table" |"kanban";
 hasKanban: boolean;
 pending: boolean;
 refreshing: boolean;
  hiddenFields: string[];
  fieldIcons: Record<string, ReactNode>;
  fieldErrors: Record<string, string>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
  canAdd: boolean;
 canEdit: boolean;
 canDelete: boolean;
 isViewer: boolean;
 relatedOptions: Record<string, Array<{ label: string; value: string }>>;
 selectValues: Record<string, string>;
 openSelectField: string | null;
 attachments: Attachment[];
 duplicates: Array<{ id: number; code: string; title: string; status: string }>;
 sprintDuplicate: boolean;
 lastSprint: string | null;
 dateWarnings: Record<string,"past" |"future">;
 editingRow: Row | null;
	visibleRows: any[];
	kanbanRows: any[];
	visibleColumns: any[];
 safePage: number;
 totalPages: number;
 totalItems: number;
 statusOptions: Array<{ label: string; value: string }>;
 pendingDeleteId: string | number | null;
 deleteOpen: boolean;
 reopenOpen: boolean;
 reopenReason: string;
 viewingRow: Row | null;
 onToggleForm: () => void;
 onSetViewMode: (value:"table" |"kanban") => void;
 onImportFile: (file: File) => void;
 onFormChange: () => void;
 onSubmit: (formData: FormData) => void;
 onCancelForm: () => void;
 checkDuplicates: (title: string) => void;
 checkSprintDuplicate: (sprint: string) => void;
 setOpenSelectField: Dispatch<SetStateAction<string | null>>;
 setSelectValues: Dispatch<SetStateAction<Record<string, string>>>;
 setAttachments: Dispatch<SetStateAction<Attachment[]>>;
 setDateWarnings: Dispatch<SetStateAction<Record<string,"past" |"future">>>;
 setSprintDuplicate: Dispatch<SetStateAction<boolean>>;
 versionSequenceLabel?: string;
 versionSequenceDefaultValue?: string;
 onAdd: () => void;
 onEditRow: (row: any) => void;
 onViewRow: (row: any) => void;
 onDeleteRow: (row: any) => void;
 onReopenRow: (row: any) => void;
 onPrevPage: () => void;
 onNextPage: () => void;
 onGoToPage?: (page: number) => void;
 selectedIds?: Set<string | number>;
 onToggleSelect?: (id: string | number) => void;
 onToggleSelectAll?: () => void;
 onBulkDelete?: () => void;
 onInlineUpdate?: (rowId: string | number, field: string, value: string) => void;
 onReorder?: (rowId: string | number, newIndex: number) => void;
 reorderable?: boolean;
 onUpdateStatus: (id: string | number, status: string, sortOrder?: number) => Promise<void>;
 onBatchReorder?: (items: { id: number | string; sortOrder: number; status?: string }[]) => Promise<void>;
 onDeleteConfirm: () => void;
 onDeleteCancel: () => void;
 onReopenReasonChange: (value: string) => void;
 onReopenCancel: () => void;
 onReopenConfirm: () => void;
 onCloseView: () => void;
 onEditView: () => void;
 search: string;
 onSearchChange: (value: string) => void;
 filterOptions?: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;
 activeFilters?: Array<{ key: string; value: string; label: string }>;
 onFilterChange?: (filters: Array<{ key: string; value: string; label: string }>) => void;
 allColumns?: Array<{ key: string; label: string }>;
 visibleColumnKeys?: string[];
 onToggleColumn?: (key: string) => void;
 onResetColumns?: () => void;
 initialTab?: string | null;
 onTabChange?: (tab: string) => void;
};

export function ModuleWorkspaceShell({
 module,
 config,
 topContent,
 showForm,
 viewMode,
 hasKanban,
 pending,
 refreshing,
  hiddenFields,
  fieldIcons,
  fieldErrors,
  setFieldErrors,
  canAdd,
 canEdit,
 canDelete,
 isViewer,
 relatedOptions,
 selectValues,
 openSelectField,
 attachments: _attachments,
 duplicates,
 sprintDuplicate,
 lastSprint,
 dateWarnings,
 editingRow,
	visibleRows,
	kanbanRows,
	visibleColumns,
 safePage,
 totalPages,
 totalItems,
 statusOptions,
 pendingDeleteId,
 deleteOpen,
 reopenOpen,
 reopenReason,
 viewingRow,
 onToggleForm,
 onSetViewMode,
 onImportFile,
 onFormChange,
 onSubmit,
 onCancelForm,
 checkDuplicates,
 checkSprintDuplicate,
 setOpenSelectField,
 setSelectValues,
 setAttachments: _setAttachments,
 setDateWarnings,
 setSprintDuplicate: _setSprintDuplicate,
 versionSequenceLabel,
 versionSequenceDefaultValue,
 onAdd,
 onEditRow,
 onViewRow,
 onDeleteRow,
 onReopenRow,
 onPrevPage,
 onNextPage,
 onGoToPage,
 selectedIds,
 onToggleSelect,
 onToggleSelectAll,
 onBulkDelete,
 onInlineUpdate,
 onReorder,
 reorderable,
 onUpdateStatus,
 onBatchReorder,
 onDeleteConfirm,
 onDeleteCancel,
 onReopenReasonChange,
 onReopenCancel,
 onReopenConfirm,
 onCloseView,
 onEditView,
 search,
 onSearchChange,
 filterOptions,
 activeFilters,
 onFilterChange,
 allColumns,
 visibleColumnKeys,
 onToggleColumn,
 onResetColumns,
 initialTab,
 onTabChange,
}: Props) {
 return (
 <>
 <section className="overflow-hidden bg-white border border-gray-200">
 <ModuleWorkspaceHeader
 module={module as any}
 title={config.title}
 shortTitle={config.shortTitle}
 description={config.description}
 icon={getModuleWorkspaceIcon(module as any)}
 canAdd={canAdd}
 topContent={topContent}
 showForm={showForm}
 viewMode={viewMode}
 hasKanban={hasKanban}
 pending={pending}
 refreshing={refreshing}
 onToggleForm={onToggleForm}
 onSetViewMode={onSetViewMode}
 onImportFile={onImportFile}
 search={search}
 onSearchChange={onSearchChange}
 filterOptions={filterOptions}
 activeFilters={activeFilters}
 onFilterChange={onFilterChange}
 allColumns={allColumns}
 visibleColumnKeys={visibleColumnKeys}
 onToggleColumn={onToggleColumn}
 onResetColumns={onResetColumns}
 />


 {viewMode ==="table" ? (
 <>
 {/* Desktop table */}
 <div className="hidden md:block">
 <ModuleWorkspaceTable
 module={module as any}
 shortTitle={config.shortTitle}
 visibleRows={visibleRows}
 visibleColumns={visibleColumns}
 safePage={safePage}
 totalPages={totalPages}
 totalItems={totalItems}
 canAdd={canAdd}
 canEdit={canEdit}
 canDelete={canDelete}
 pendingDeleteId={pendingDeleteId}
 onAdd={onAdd}
 onEditRow={onEditRow}
 onViewRow={onViewRow}
 onDeleteRow={onDeleteRow}
 onReopenRow={onReopenRow}
 onPrevPage={onPrevPage}
 onNextPage={onNextPage}
 onGoToPage={onGoToPage}
 selectedIds={selectedIds}
 onToggleSelect={onToggleSelect}
 onToggleSelectAll={onToggleSelectAll}
 onBulkDelete={onBulkDelete}
 onInlineUpdate={onInlineUpdate}
 statusOptions={statusOptions}
 onReorder={onReorder}
 reorderable={reorderable}
 />
 </div>
 {/* Mobile card view */}
 <div className="block md:hidden">
 <ModuleMobileCards
 module={module as any}
 shortTitle={config.shortTitle}
 rows={visibleRows}
 columns={visibleColumns}
 safePage={safePage}
 totalPages={totalPages}
 totalItems={totalItems}
 canEdit={canEdit}
 canDelete={canDelete}
 onViewRow={onViewRow}
 onEditRow={onEditRow}
 onDeleteRow={onDeleteRow}
 onPrevPage={onPrevPage}
 onNextPage={onNextPage}
 onGoToPage={onGoToPage}
 />
 </div>
 </>
 ) : (
 <div className="overflow-hidden bg-transparent border-t border-gray-200 p-4">
			<KanbanBoard rows={kanbanRows} statusOptions={statusOptions} onUpdateStatus={onUpdateStatus} onBatchReorder={onBatchReorder} onViewRow={onViewRow} />
			</div>
		)}
 </section>

 {/* Form Drawer */}
 <FormDrawer
 open={showForm}
 title={editingRow ? `Edit ${config.shortTitle}` : `Create ${config.shortTitle}`}
 subtitle={editingRow ? "Update existing data." : "Fill in new data with a consistent format."}
 onClose={onCancelForm}
 >
 <ModuleWorkspaceForm
 key={`${module}-${editingRow?.id ??"new"}`}
 module={module as any}
 shortTitle={config.shortTitle}
 fields={config.fields}
 editingRow={editingRow}
  hiddenFields={hiddenFields}
  fieldIcons={fieldIcons}
  fieldErrors={fieldErrors}
  setFieldErrors={setFieldErrors}
  canAdd={canAdd}
 canEdit={canEdit}
 pending={pending}
 isViewer={isViewer}
 relatedOptions={relatedOptions}
 selectValues={selectValues}
 openSelectField={openSelectField}
 setOpenSelectField={setOpenSelectField}
 setSelectValues={setSelectValues}
 duplicates={duplicates}
 sprintDuplicate={sprintDuplicate}
 lastSprint={lastSprint}
 dateWarnings={dateWarnings}
 setDateWarnings={setDateWarnings}
 onFormChange={onFormChange}
 onSubmit={onSubmit}
 onCancel={onCancelForm}
 checkDuplicates={checkDuplicates}
 checkSprintDuplicate={checkSprintDuplicate}
 versionSequenceLabel={versionSequenceLabel}
 versionSequenceDefaultValue={versionSequenceDefaultValue}
 />
 </FormDrawer>

 <ModuleWorkspaceModals
 deleteOpen={deleteOpen}
 onDeleteConfirm={onDeleteConfirm}
 onDeleteCancel={onDeleteCancel}
 reopenOpen={reopenOpen}
 reopenReason={reopenReason}
 onReopenReasonChange={onReopenReasonChange}
 onReopenCancel={onReopenCancel}
 onReopenConfirm={onReopenConfirm}
 />

 {viewingRow && (
 <ViewModal
 row={viewingRow}
 config={config as any}
 fieldIcons={fieldIcons as any}
 onClose={onCloseView}
 onEdit={onEditView}
 canEdit={canEdit}
 module={module}
 initialTab={initialTab}
 onTabChange={onTabChange}
 />
 )}
 </>
 );
}

