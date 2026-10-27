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
  getDashboardOverviewData,
  type OverviewDashboardData,
  type OverviewBugItem,
  type OverviewTestRunItem,
  type OverviewActivityItem,
  type OverviewProjectItem,
} from "@/lib/data/data-dashboard-overview";

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
