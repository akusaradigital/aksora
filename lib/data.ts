// Barrel re-export — split into focused files under lib/data/
export {
  makePublicToken,
  normalizeTestCaseRow,
  normalizeTestPlanRow,
  normalizeTestSuiteRow,
  getTableName,
} from "@/lib/data-helpers";

export {
  invalidateDashboardCache,
  getBugSeverityCounts,
  getTestPassRate,
  computeQualityHealthScore,
  clamp,
  getDashboardProjects,
  getProjectOptions,
  getBacklogOptions,
  getAssigneeOptions,
  getTestPlanReferenceRows,
  getTestSuitesByPlanIds,
  getTestCaseStatsBySuiteIds,
} from "@/lib/data/data-dashboard-stats";

export {
  getDashboardData,
  getReportsData,
  getResourceDetails,
  getExecutiveData,
} from "@/lib/data/data-dashboard-main";

export {
  getComments,
  createComment,
  updateFilter,
  upsertHeartbeat,
  getOnlineMembers,
  removeStalePresence,
  getFilters,
  createFilter,
  deleteFilter,
  checkFilterNameUnique,
} from "@/lib/data/data-dashboard-collaboration";

export { getModuleRows, getModuleRowsPage } from "@/lib/data-module-read";

export { createModuleRecord } from "@/lib/data/data-crud-create";
export { updateModuleRecord } from "@/lib/data/data-crud-update";
export {
  deleteModuleRecord,
  deleteModuleRecords,
  updateModuleStatus,
  batchUpdateSortOrder,
  clearModuleRecords,
  replaceModuleRecords,
  getModuleSheetRows,
} from "@/lib/data/data-crud-delete";

export {
  getTestPlanByToken,
  getTestPlanById,
  getTestSuitesByPlanId,
  getReleaseNotes,
  getQualityTrend,
  getTestSuite,
  getTestCasesByIdStrings,
  getProjectData,
  getTestSuiteByToken,
  getTestCasesByScenario,
  getTestCasesByScenarioIds,
  getAllTestCasesWithSuite,
  getPublicReportData,
} from "@/lib/test-management-data";
