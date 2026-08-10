// Barrel re-export — split into focused files under lib/data/
export {
  clamp,
  computeQualityHealthScore,
  computeResolutionRate,
  computeResolutionRateDelta,
  invalidateDashboardCache,
  getBugSeverityCounts,
  getTestPassRate,
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
  type DashboardCommentRow,
  getComments,
  createComment,
  upsertHeartbeat,
  getOnlineMembers,
  removeStalePresence,
  type DashboardFilterRow,
  getFilters,
  checkFilterNameUnique,
  createFilter,
  updateFilter,
  deleteFilter,
} from "@/lib/data/data-dashboard-collaboration";
