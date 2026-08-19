# Graph Report - .  (2026-08-19)

## Corpus Check
- Large corpus: 527 files � ~277,688 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2367 nodes · 6034 edges · 154 communities (128 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- User Authentication Flows
- Activity Feed and Timeline
- Gantt Timeline Chart
- CSV Import and Parsing
- Test Case Management
- Dashboard Stats and Realtime
- Activity Feed and Timeline
- Gantt Timeline Chart
- Database Schema and Bootstrap
- Google OAuth Integration
- Test Case Management
- User Authentication Flows
- Activity Feed and Timeline
- Gantt Timeline Chart
- User Authentication Flows
- Test Case Management
- Announcements and Broadcasts
- RBAC and Role Validation
- User Authentication Flows
- Test Case Management
- Weekly Report Analytics
- Unknown - clsx
- Unknown - eslint
- Unknown - ./*
- Activity Feed and Timeline
- Lib - ModuleData
- Module - Props
- Test Case Management
- Activity Feed and Timeline
- Activity Feed and Timeline
-   Tests   - Row
- RBAC and Role Validation
- Test Case Management
- Lib - route.ts
- Module - parseFieldError()
- User Authentication Flows
- Database Schema and Bootstrap
- User Authentication Flows
- Activity Feed and Timeline
- CSV Import and Parsing
- Activity Feed and Timeline
- Billing and LemonSqueezy API
- Module - FilterOption
- Lib - pdf-export.ts
- [Module] - route.ts
- Lib - route.ts
- Shared - Props
- Dashboard Stats and Realtime
- Overview - admin-overview-tab.tsx
- Activity Feed and Timeline
- Dashboard Stats and Realtime
- Comments - route.ts
- Activity Feed and Timeline
- Test Case Management
- Test Case Management
- Announcements and Broadcasts
- Module - Row
- User Authentication Flows
- Database Schema and Bootstrap
- Lib - page.tsx
- Layout - page.tsx
- Test Case Management
- Dashboard Stats and Realtime
- Announcements and Broadcasts
- Lib - route.ts
- Dashboard Stats and Realtime
- Anti AI Slop Guidelines
- Activity Feed and Timeline
- Digest - route.ts
- Notification Systems and MFA
- Filters - route.ts
- [Module] - route.ts
- [Token] - page.tsx
- Dashboard Stats and Realtime
- Notification Systems and MFA
- Layout - sidebar-nav.tsx
- Scripts - migrate-sqlite-to-pg.mjs
- Anti AI Slop Guidelines
- Global Search Engine
- Invites - route.ts
- Test Case Management
- Dashboard Stats and Realtime
- Dashboard Stats and Realtime
- Module
- Database Schema and Bootstrap
- Test-Coverage - route.ts
- Web Vitals Monitoring
- Weekly Report Analytics
- Weekly Report Analytics
- Dashboard Stats and Realtime
- Dashboard Stats and Realtime
- Module - density-toggle.tsx
- Unknown - proxy.ts
- Presence - route.ts
- [Id] - route.ts
- Dashboard Stats and Realtime
- Scripts - check-api-guards.mjs
- Scripts - dev.mjs
- Aksora Branding Assets
- Security - page.tsx
- Holidays - route.ts
- About - page.tsx
- Demo - page.tsx
- Hooks - use-fetch.ts
- Scripts - backup.mjs
- Database Schema and Bootstrap
- Upload - route.ts
- User and Workspace Settings
- Blog - page.tsx
- Contact - page.tsx
- Privacy - page.tsx
- Test Case Management
- [Token] - route.ts
- Billing and LemonSqueezy API
- Unknown - package.json
- App - opengraph-image.tsx
- Dashboard Stats and Realtime
- CI/CD and DB Health Pipelines
- Unknown - next.config.ts
- Public - sw.js
- Database Schema and Bootstrap
- CI/CD and DB Health Pipelines
- Unknown - eslint.config.mjs
- Unknown - next
- Unknown - @testing-library/react
- Unknown - postcss.config.mjs
- Agent Worker Rules.Md
- Public File.Svg - File Icon SVG
- Public Globe.Svg - Globe Icon SVG
- Aksora Branding Assets
- Aksora Branding Assets
- Public Window.Svg - Window Icon SVG
- Readme.Md - Aksora README

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 263 edges
2. `cn()` - 171 edges
3. `db` - 100 edges
4. `getAccessScope()` - 78 edges
5. `isPlatformSuperAdmin()` - 71 edges
6. `toast` - 48 edges
7. `codeFromId()` - 47 edges
8. `normalizeRole()` - 41 edges
9. `ModuleKey` - 38 edges
10. `formatDisplayText()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Aksora App Icon SVG` --semantically_similar_to--> `Aksora Brand Logo SVG`  [INFERRED] [semantically similar]
  app/icon.svg → public/logo.svg
- `Apple Touch Icon PNG` --semantically_similar_to--> `Aksora App Icon SVG`  [INFERRED] [semantically similar]
  public/apple-touch-icon.png → app/icon.svg
- `DELETE()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/api/auth/avatar/route.ts → lib/auth-core.ts
- `InfoCard()` --calls--> `cn()`  [EXTRACTED]
  app/page.tsx → lib/utils.ts
- `PublicReportPage()` --calls--> `getPublicReportData()`  [EXTRACTED]
  app/report/[token]/page.tsx → lib/test-management-data.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Anti AI Slop Framework** — antislop_antislop_core, antislop_copywriting_copywriting_rules, antislop_human_human_accessibility_rules, antislop_ui_ui_visual_rules [EXTRACTED 1.00]
- **Continuous Integration Workflows** — github_workflows_ci_ci_workflow, github_workflows_db_health_db_health_workflow, github_workflows_neon_keepalive_neon_keepalive_workflow [INFERRED 0.85]

## Communities (154 total, 26 thin omitted)

### Community 0 - "User Authentication Flows"
Cohesion: 0.05
Nodes (61): GET(), GET(), POST(), TABLES_WITH_PUBLIC_TOKEN, GET(), GET(), GET(), PATCH() (+53 more)

### Community 1 - "Activity Feed and Timeline"
Cohesion: 0.10
Nodes (61): cleanupCache(), GET(), SearchCacheEntry, getActivityResults(), getAssigneeResults(), getBugResults(), getDeploymentResults(), buildFilterClause() (+53 more)

### Community 2 - "Gantt Timeline Chart"
Cohesion: 0.08
Nodes (60): GanttEditModal(), GanttEditModalProps, addDays(), buildSubHeader(), buildTopHeader(), canEditTimeline(), computeProgress(), computeStatusBreakdown() (+52 more)

### Community 3 - "CSV Import and Parsing"
Cohesion: 0.06
Nodes (55): capitalizeFirst(), getField(), HEADER_MAP, InvalidRow, mapCSVToTestCases(), MapResult, parseCSV(), parseCSVLine() (+47 more)

### Community 4 - "Test Case Management"
Cohesion: 0.09
Nodes (52): TestCaseDetailPageRoute(), TestPlanDetailPage(), TestSuiteDetailPage(), mocks, mocks, mocks, buildSearchClause(), getSearchableColumns() (+44 more)

### Community 5 - "Dashboard Stats and Realtime"
Cohesion: 0.07
Nodes (51): GET(), GET(), DashboardResponse, emptyDashboardData(), GET(), mocks, DashboardData(), checkFilterNameUnique() (+43 more)

### Community 6 - "Activity Feed and Timeline"
Cohesion: 0.06
Nodes (45): actionIcons, ActivityEntry, ActivityTimeline(), ActivityTimelineProps, extractStatusChange(), formatTimelineDate(), getActionMeta(), TimelineEntry() (+37 more)

### Community 7 - "Gantt Timeline Chart"
Cohesion: 0.06
Nodes (31): MODULES, HeatmapCell(), StatCard(), TestCoverageDashboard(), GapData, GapItem, ProjectGap, TestGapPage() (+23 more)

### Community 8 - "Database Schema and Bootstrap"
Cohesion: 0.10
Nodes (32): GET(), applyMissingColumns(), backfillPublicTokens(), backfillSearchTokenEntityIdInt(), backfillSortOrder(), backfillWorkspaceIds(), DbBootstrapDeps, ensureKanbanSortOrderColumns() (+24 more)

### Community 9 - "Google OAuth Integration"
Cohesion: 0.15
Nodes (30): findUserByEmail(), getClientIp(), GOOGLE_CLIENT_ID, GoogleTokenInfo, POST(), respondWithToken(), updateUserProfile(), UserRow (+22 more)

### Community 10 - "Test Case Management"
Cohesion: 0.10
Nodes (29): DELETE(), errorResponse(), FilterBody, PATCH(), mocks, GET(), GET(), POST() (+21 more)

### Community 11 - "User Authentication Flows"
Cohesion: 0.09
Nodes (26): LoginContent(), ApiKeyItem, ApiKeysClient(), ApiKeysPage(), formatDate(), SupportPage(), Ticket, mocks (+18 more)

### Community 12 - "Activity Feed and Timeline"
Cohesion: 0.09
Nodes (27): compareSuiteGroups(), compareTestCases(), getCaseSortValue(), PRIORITY_COLOR, SortableTestCaseRow(), STATUS_ICON, STATUS_PILL, SuiteGroup (+19 more)

### Community 13 - "Gantt Timeline Chart"
Cohesion: 0.10
Nodes (24): GET(), PATCH(), POST(), GET(), getCompanyFilter(), PATCH(), TimelineType, DELETE() (+16 more)

### Community 14 - "User Authentication Flows"
Cohesion: 0.15
Nodes (28): getClientIp(), POST(), validateEmail(), mocks, API_KEY_RATE_LIMIT, assertModule(), DELETE(), GET() (+20 more)

### Community 15 - "Test Case Management"
Cohesion: 0.10
Nodes (33): AssignDropdown(), QuickActionButtonsProps, STATUS_OPTIONS, StatusDropdown(), assigneeSchema, bugSchema, bugStatusOptions, bugTypeOptions (+25 more)

### Community 16 - "Announcements and Broadcasts"
Cohesion: 0.08
Nodes (17): AdminUser, AnnouncementsTab, AuditLogTab, OverviewTab, RevenueTab, Tab, TicketsTab, metadata (+9 more)

### Community 17 - "RBAC and Role Validation"
Cohesion: 0.12
Nodes (20): ModuleWorkspaceClient, ModuleWorkspaceClientProps, useColumnVisibility(), useWorkspaceRowHandlers(), compareVersions(), getLatestVersion(), getNextVersion(), ModuleWorkspace() (+12 more)

### Community 18 - "User Authentication Flows"
Cohesion: 0.16
Nodes (23): DELETE(), POST(), POST(), POST(), GET(), POST(), apiUserContext, authEnabled() (+15 more)

### Community 19 - "Test Case Management"
Cohesion: 0.10
Nodes (23): BugEntity, MeetingNote, ProjectDetailPage(), SuiteStats, TestPlan, mocks, InlineStatusEditor(), InlineStatusEditorProps (+15 more)

### Community 20 - "Weekly Report Analytics"
Cohesion: 0.12
Nodes (20): mocks, getInitialReport(), ReportContent(), ReportDateNav(), DetailModalView(), FocusAreaPanel(), TopAssigneesPanel(), Panel() (+12 more)

### Community 21 - "Unknown - clsx"
Cohesion: 0.06
Nodes (31): clsx, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, exceljs, @neondatabase/serverless, dependencies, clsx (+23 more)

### Community 22 - "Unknown - eslint"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, fast-check, @next/bundle-analyzer, devDependencies, eslint, eslint-config-next, fast-check (+23 more)

### Community 23 - "Unknown - ./*"
Cohesion: 0.06
Nodes (30): ./*, dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+22 more)

### Community 24 - "Activity Feed and Timeline"
Cohesion: 0.12
Nodes (21): GET(), mocks, GET(), GET(), AdminNotificationType, createAdminNotification(), getDbHealthInfo(), emailEnabled() (+13 more)

### Community 25 - "Lib - ModuleData"
Cohesion: 0.14
Nodes (25): GET(), POST(), createModuleRecord(), ModuleData, text(), textOrEmpty(), ModuleData, syncSearchIndex() (+17 more)

### Community 26 - "Module - Props"
Cohesion: 0.11
Nodes (21): UserProfile, ModuleWorkspaceFormDate(), Props, Row, DuplicateRow, DuplicateRow, FieldOption, FormField (+13 more)

### Community 27 - "Test Case Management"
Cohesion: 0.10
Nodes (22): ModuleEmptyState(), ModuleEmptyStateProps, moduleGuidance, ModuleRowActions(), ModuleRowActionsProps, Row, ModuleWorkspaceModals(), FormDrawer (+14 more)

### Community 28 - "Activity Feed and Timeline"
Cohesion: 0.16
Nodes (20): ALLOWED_FIELDS, ALLOWED_MODULES, deleteItem(), updateItemField(), errorResponse(), PATCH(), QuickActionBody, mocks (+12 more)

### Community 29 - "Activity Feed and Timeline"
Cohesion: 0.11
Nodes (21): ActionBadge(), ActivityEntry, ActivityEntryRow(), ActivityFeedResponse, ActivityLogPage(), CollapsedActivityEntry(), CollapsedGroup, ENTITY_ICON (+13 more)

### Community 30 - "  Tests   - Row"
Cohesion: 0.15
Nodes (15): CopyLinkButton(), CopyLinkButtonProps, getRowToken(), Row, useDetailViewUrl(), UseDetailViewUrlOptions, buildShareableUrl(), buildShareableUrlWithTab() (+7 more)

### Community 31 - "RBAC and Role Validation"
Cohesion: 0.16
Nodes (17): GET(), PATCH(), SELF_ASSIGNABLE_ROLES, mocks, GET(), POST(), DELETE(), PATCH() (+9 more)

### Community 32 - "Test Case Management"
Cohesion: 0.11
Nodes (17): RunExecutionPage(), CaseItem, RunData, RunExecutionView(), SuiteData, CaseItem, RunPlayMode(), RunData (+9 more)

### Community 33 - "Lib - route.ts"
Cohesion: 0.17
Nodes (17): assertModule(), headerKey(), POST(), GET(), replaceModuleRecords(), parseWorkbook(), moduleConfigs, Column (+9 more)

### Community 34 - "Module - parseFieldError()"
Cohesion: 0.15
Nodes (16): parseFieldError(), ActionArgs, createCrudActions(), CrudArgs, Row, ApiPayload, refreshWorkspace(), requestModuleJson() (+8 more)

### Community 35 - "User Authentication Flows"
Cohesion: 0.19
Nodes (18): AuthMeMembership, Invite, InviteManager(), WorkspaceOption, ASSIGNEE_ROLES, getCompanyLabel(), getInviteRoleOptions(), getRoleExportLabel() (+10 more)

### Community 36 - "Database Schema and Bootstrap"
Cohesion: 0.10
Nodes (21): scripts, analyze, build, check:api-guards, ci:check, db:backup, db:health, db:health:ci (+13 more)

### Community 37 - "User Authentication Flows"
Cohesion: 0.21
Nodes (15): DELETE(), GET(), POST(), mocks, authenticateApiRequest(), ApiKeyRow, createApiKeyForUser(), generateApiKey() (+7 more)

### Community 38 - "Activity Feed and Timeline"
Cohesion: 0.15
Nodes (14): FlakinessGauge(), HistoryEntry, VerdictDot(), VerdictTimeline(), FlakyProjectChart, FlakyTestRow(), FlakyTestsClient(), EMPTY_FLAKY_DATA (+6 more)

### Community 39 - "CSV Import and Parsing"
Cohesion: 0.13
Nodes (11): TestCasesPage(), ExecutionSuiteCards(), ReadyCard(), SuiteWithRun, TestExecutionPage(), mocks, mocks, ImportErrorsModal() (+3 more)

### Community 40 - "Activity Feed and Timeline"
Cohesion: 0.16
Nodes (13): GET(), THRESHOLDS, ActivityEntry, collapseActivityEntries(), CollapsedGroup, extractActor(), GET(), mocks (+5 more)

### Community 41 - "Billing and LemonSqueezy API"
Cohesion: 0.23
Nodes (16): POST(), createAuditLog(), getCompanyName(), LemonSqueezyWebhookPayload, POST(), createCheckoutUrl(), downgradeCompanyToFree(), getVariantId() (+8 more)

### Community 42 - "Module - FilterOption"
Cohesion: 0.14
Nodes (15): Column, ColumnVisibilityToggle(), ColumnVisibilityToggleProps, FilterDropdown(), FilterOption, FilterValue, ModuleFilterBar(), ModuleFilterBarProps (+7 more)

### Community 43 - "Lib - pdf-export.ts"
Cohesion: 0.20
Nodes (17): buildColumnSpecs(), buildPdfBuffer(), ColumnSpec, createTemplateRows(), distributeExtraWidth(), drawDataRow(), drawPageHeader(), drawTableHeader() (+9 more)

### Community 44 - "[Module] - route.ts"
Cohesion: 0.22
Nodes (14): assertModule(), checkRateLimit(), DELETE(), enforceSelfAssignment(), getValidationMessage(), lastCleanup, PATCH(), POST() (+6 more)

### Community 45 - "Lib - route.ts"
Cohesion: 0.26
Nodes (15): GET(), getModuleSheetRows(), addDataValidation(), applyAutoBorders(), applyRowColoring(), autoFitColumns(), autoFitRowHeights(), border() (+7 more)

### Community 46 - "Shared - Props"
Cohesion: 0.13
Nodes (10): WorkspacePage(), WorkspaceClient(), WorkspaceData, ErrorBoundary, Props, State, InlineAlert(), Props (+2 more)

### Community 47 - "Dashboard Stats and Realtime"
Cohesion: 0.14
Nodes (14): useCurrentUserRole(), AttentionPanel, BugByModuleChart, computeWeekPulse(), DailyDigestCard, Dashboard(), DashboardDrawer, DashboardStandupModal (+6 more)

### Community 48 - "Overview - admin-overview-tab.tsx"
Cohesion: 0.18
Nodes (12): CompanyCard(), CompanyDetail, GrowthData, OverviewData, OverviewTab(), RoleDistribution, RevenueData, ActionBtn() (+4 more)

### Community 49 - "Activity Feed and Timeline"
Cohesion: 0.19
Nodes (9): CompareRow(), FeatureRow(), MockBugTracker(), MockDashboard(), MockExecution(), MockKanban(), MockTestCase(), MockTestPlan() (+1 more)

### Community 50 - "Dashboard Stats and Realtime"
Cohesion: 0.17
Nodes (10): DashboardProps, Dashboard, DashboardData, DashboardHome(), DashboardRealtime, Props, usePresenceHeartbeat(), ChartSkeleton() (+2 more)

### Community 51 - "Comments - route.ts"
Cohesion: 0.29
Nodes (10): ALLOWED_ENTITY_TYPES, CreateCommentBody, errorResponse(), GET(), POST(), sanitizeEntityId(), sanitizeEntityType(), userHasReadAccess() (+2 more)

### Community 52 - "Activity Feed and Timeline"
Cohesion: 0.16
Nodes (13): ActivityRow, AssigneeRow, BugRow, ClosedBugRow, CountRow, GET(), getMonday(), ProjectRow (+5 more)

### Community 54 - "Test Case Management"
Cohesion: 0.18
Nodes (11): CoverageAlert, CoverageData, CoverageRow, CoverageStats, generateCoverageAlerts(), getTestCoverageData(), ProjectCoverage, SuiteCoverage (+3 more)

### Community 55 - "Test Case Management"
Cohesion: 0.16
Nodes (11): Plan, PRIORITY_DOT, RESULT_STYLE, Session, STATUS_ICON, STATUS_PILL, Suite, SuiteDetail() (+3 more)

### Community 56 - "Announcements and Broadcasts"
Cohesion: 0.19
Nodes (10): Announcement, AnnouncementBanner(), typeConfig, AppUser, AppWrapper(), AppWrapperProps, PlanStatus, TrialBanner() (+2 more)

### Community 57 - "Module - Row"
Cohesion: 0.23
Nodes (10): buildStatusAliases(), columnAccents, KanbanColumn, Row, SortableCard, getRowOrder(), getRowStatus(), KanbanBoard() (+2 more)

### Community 58 - "User Authentication Flows"
Cohesion: 0.29
Nodes (6): ensureLoggedIn(), login(), TEST_BUG, TEST_TASK, TEST_TEST_CASE, TEST_USER

### Community 59 - "Database Schema and Bootstrap"
Cohesion: 0.14
Nodes (13): actualByTable, backfillIssues, client, env, envFile, expectedByTable, issues, result (+5 more)

### Community 60 - "Lib - page.tsx"
Cohesion: 0.24
Nodes (8): GET(), MyWorkPage(), WorkspacesPage(), Membership, WorkspaceSwitcher(), getMyWorkItems(), MyWorkItem, getWorkspaceMembershipsForUser()

### Community 61 - "Layout - page.tsx"
Cohesion: 0.18
Nodes (8): ProfilePage(), ProfileForm(), mocks, OnboardingTour(), resetOnboarding(), TourStep, tourSteps, RestartTourButton()

### Community 62 - "Test Case Management"
Cohesion: 0.19
Nodes (10): Plan, PRIORITY_DOT, STATUS_ICON, STATUS_PILL, Suite, suiteReadiness(), TestCase, TestPlanDetail() (+2 more)

### Community 63 - "Dashboard Stats and Realtime"
Cohesion: 0.22
Nodes (10): AttentionItem, AttentionPanel(), AttentionPanelProps, canUseQuickActions(), AgeIndicator(), AgeIndicatorProps, computeAgeDays(), formatAgeLabel() (+2 more)

### Community 64 - "Announcements and Broadcasts"
Cohesion: 0.27
Nodes (9): Announcement, AnnouncementsTab(), AuditEntry, AuditLogTab(), TicketsTab(), formatDate(), formatDateTime(), getAllScrollParents() (+1 more)

### Community 65 - "Lib - route.ts"
Cohesion: 0.39
Nodes (9): DELETE(), PATCH(), POST(), decodeBase32(), encodeBase32(), generateHotp(), generateTotpSecret(), generateTotpUri() (+1 more)

### Community 66 - "Dashboard Stats and Realtime"
Cohesion: 0.24
Nodes (9): DashboardFilterForm(), DashboardFilterFormProps, SaveFilterButton(), DashboardSavedFilters(), DashboardSavedFiltersProps, FilterChip(), normalizeSavedFilter(), SavedFilter (+1 more)

### Community 67 - "Anti AI Slop Guidelines"
Cohesion: 0.32
Nodes (11): contrast_ratio(), linearize(), luminance(), main(), parse_hex(), parse_pairing(), parse_reference_rows(), Turn 'White on #333333' or '#555555 on black' into two RGB tuples. (+3 more)

### Community 68 - "Activity Feed and Timeline"
Cohesion: 0.20
Nodes (8): ActivityEntry, ActivityEntryRow(), ActivityFeedFilter(), ActivityFeedResponse, CollapsedActivityEntry(), CollapsedGroup, ENTITY_ICON, formatTimeRange()

### Community 69 - "Digest - route.ts"
Cohesion: 0.31
Nodes (8): DigestItem, DigestPayload, emptyPayload(), GET(), lastSessionIso(), loadDigest(), withTimeout(), mocks

### Community 70 - "Notification Systems and MFA"
Cohesion: 0.22
Nodes (4): GET(), OnlineMember, SseNotification, mocks

### Community 71 - "Filters - route.ts"
Cohesion: 0.33
Nodes (7): ALLOWED_DENSITIES, ALLOWED_SCOPES, CreateFilterBody, errorResponse(), GET(), POST(), mocks

### Community 72 - "[Module] - route.ts"
Cohesion: 0.44
Nodes (6): assertModule(), buildExportFilename(), buildPdfFilename(), GET(), buildDownloadFilename(), formatIndonesiaTimestamp()

### Community 73 - "[Token] - page.tsx"
Cohesion: 0.24
Nodes (8): PublicReportPage(), formatDate(), ReportData, ReportView(), SEVERITY_COLORS, SeverityBadge(), STATUS_COLORS, StatusBadge()

### Community 74 - "Dashboard Stats and Realtime"
Cohesion: 0.24
Nodes (5): ProjectBreakdownItem, MODULE_COLORS, Props, Props, ResponsiveContainer()

### Community 75 - "Notification Systems and MFA"
Cohesion: 0.24
Nodes (6): SidebarSection(), Notification, NotificationPanel(), Sidebar(), SidebarActionButton(), TooltipState

### Community 76 - "Layout - sidebar-nav.tsx"
Cohesion: 0.24
Nodes (9): canSeeHref(), filterGroups(), groups, PREFETCH_ROUTES, ROLE_MENU, SidebarGroup, SidebarIcon, SidebarItem (+1 more)

### Community 77 - "Scripts - migrate-sqlite-to-pg.mjs"
Cohesion: 0.20
Nodes (8): __dirname, envContent, envPath, envVars, pool, sqlite, sqlitePath, TABLES

### Community 78 - "Anti AI Slop Guidelines"
Cohesion: 0.22
Nodes (9): Aksora Agent Rules, Anti-Slop Core Guidelines, Anti-Slop Copywriting Guidelines, Anti-Slop Human Accessibility Guidelines, Anti-Slop UI Visual Guidelines, Claude Project Configuration, Design Direction, QA Tools Website Skill (+1 more)

### Community 79 - "Global Search Engine"
Cohesion: 0.33
Nodes (8): getNotificationsSince(), categoryLabels, categoryOrder, CommandItem, CommandPalette(), readRecentCommands(), saveRecentCommand(), href()

### Community 80 - "Invites - route.ts"
Cohesion: 0.33
Nodes (7): CreateInviteResult, GET(), InviteLimitReachedResult, isInviteLimitReachedResult(), POST(), mocks, listInvites()

### Community 81 - "Test Case Management"
Cohesion: 0.22
Nodes (7): mocks, ModuleRowsPageResult, ModuleWorkspaceProps, TestCaseStat, TestSuiteRow, WorkspaceRow, moduleOrder

### Community 82 - "Dashboard Stats and Realtime"
Cohesion: 0.33
Nodes (8): DailyDigestCard(), DigestItem, DigestPayload, DigestSection(), isMorning(), readDismissedKey(), todayKey(), writeDismissedKey()

### Community 83 - "Dashboard Stats and Realtime"
Cohesion: 0.28
Nodes (6): DashboardDrawerItem, DashboardDrawerProps, Comment, CommentThread(), CommentThreadProps, formatCommentTime()

### Community 84 - "Module"
Cohesion: 0.28
Nodes (7): DuplicateRow, getNextVersion(), ModuleWorkspaceFormText(), Props, Row, AutoResizeTextarea(), AutoResizeTextareaProps

### Community 85 - "Database Schema and Bootstrap"
Cohesion: 0.22
Nodes (6): dbUrl, envText, idxText, pool, statements, tablesText

### Community 86 - "Test-Coverage - route.ts"
Cohesion: 0.32
Nodes (6): GET(), CoverageAlert, CoverageRow, generateCoverageAlerts(), GET(), TrendRow

### Community 87 - "Web Vitals Monitoring"
Cohesion: 0.32
Nodes (4): inter, metadata, ServiceWorkerRegister(), WebVitals()

### Community 88 - "Weekly Report Analytics"
Cohesion: 0.25
Nodes (4): ProjectEntry, SessionTrendEntry, SeverityEntry, SEVERITY_COLORS

### Community 89 - "Weekly Report Analytics"
Cohesion: 0.25
Nodes (5): DetailModal, ReportCharts(), SEVERITY_COLORS, StatCard(), WeeklyReportData

### Community 90 - "Dashboard Stats and Realtime"
Cohesion: 0.36
Nodes (6): BugStatCard(), PulseMetric(), QuickBtn(), ResolutionRateMetric(), StatCard(), useValueChangeAnimation()

### Community 91 - "Dashboard Stats and Realtime"
Cohesion: 0.46
Nodes (6): getScoreColor(), getStrokeColor(), getTooltipText(), QualityHealthScore(), QualityHealthScoreProps, baseProps

### Community 92 - "Module - density-toggle.tsx"
Cohesion: 0.32
Nodes (7): applyDensityToContainer(), Density, DENSITY_VARS, DensityButton(), DensityToggle(), DensityToggleProps, readStoredDensity()

### Community 93 - "Unknown - proxy.ts"
Cohesion: 0.32
Nodes (7): checkRateLimit(), config, getClientIp(), lastCleanup, proxy(), publicPaths, rateLimitStore

### Community 94 - "Presence - route.ts"
Cohesion: 0.38
Nodes (4): errorResponse(), POST(), PresenceBody, mocks

### Community 95 - "[Id] - route.ts"
Cohesion: 0.43
Nodes (4): GET(), isValidModule(), parseIdOrToken(), mocks

### Community 96 - "Dashboard Stats and Realtime"
Cohesion: 0.29
Nodes (5): DashboardPage(), mocks, reactMocks, renderHome(), stateValues

### Community 97 - "Scripts - check-api-guards.mjs"
Cohesion: 0.29
Nodes (5): allowedPublic, files, root, routeDir, violations

### Community 98 - "Scripts - dev.mjs"
Cohesion: 0.38
Nodes (6): basePort, child, envPath, findPort(), getOpenPorts(), isPortFree()

### Community 99 - "Aksora Branding Assets"
Cohesion: 0.40
Nodes (6): Aksora Logo SVG (Masked), Aksora App Icon SVG, Aksora Logo PNG, Apple Touch Icon PNG, Aksora Brand Logo SVG, Aksora White Logo SVG

### Community 101 - "Holidays - route.ts"
Cohesion: 0.50
Nodes (4): cache, fetchHolidaysForYear(), GET(), LiburDenoItem

### Community 104 - "Hooks - use-fetch.ts"
Cohesion: 0.40
Nodes (3): fetchCache, FetchState, UseFetchOptions

### Community 105 - "Scripts - backup.mjs"
Cohesion: 0.40
Nodes (3): backupDir, filepath, timestamp

### Community 106 - "Database Schema and Bootstrap"
Cohesion: 0.40
Nodes (3): cookie, createPayload, unique

### Community 107 - "Upload - route.ts"
Cohesion: 0.83
Nodes (3): ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, POST()

### Community 108 - "User and Workspace Settings"
Cohesion: 0.83
Nodes (3): PATCH(), transferWorkspaceOwnership(), updateWorkspaceSettings()

### Community 115 - "Unknown - package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 118 - "CI/CD and DB Health Pipelines"
Cohesion: 1.00
Nodes (3): CI Workflow, Database Health Workflow, PNPM Workspace Configuration

## Knowledge Gaps
- **635 isolated node(s):** `metadata`, `metadata`, `posts`, `metadata`, `metadata` (+630 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentUser()` connect `User Authentication Flows` to `Activity Feed and Timeline`, `Test Case Management`, `Dashboard Stats and Realtime`, `Gantt Timeline Chart`, `Database Schema and Bootstrap`, `Google OAuth Integration`, `Test Case Management`, `User Authentication Flows`, `Gantt Timeline Chart`, `User Authentication Flows`, `User Authentication Flows`, `Lib - ModuleData`, `Activity Feed and Timeline`, `RBAC and Role Validation`, `Test Case Management`, `Lib - route.ts`, `User Authentication Flows`, `CSV Import and Parsing`, `Activity Feed and Timeline`, `Billing and LemonSqueezy API`, `[Module] - route.ts`, `Lib - route.ts`, `Shared - Props`, `Comments - route.ts`, `Activity Feed and Timeline`, `Test Case Management`, `Lib - page.tsx`, `Layout - page.tsx`, `Lib - route.ts`, `Digest - route.ts`, `Notification Systems and MFA`, `Filters - route.ts`, `[Module] - route.ts`, `Invites - route.ts`, `Test-Coverage - route.ts`, `Presence - route.ts`, `[Id] - route.ts`, `Holidays - route.ts`, `Upload - route.ts`, `User and Workspace Settings`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Why does `cn()` connect `Gantt Timeline Chart` to `Gantt Timeline Chart`, `CSV Import and Parsing`, `Activity Feed and Timeline`, `User Authentication Flows`, `Activity Feed and Timeline`, `Test Case Management`, `Announcements and Broadcasts`, `Test Case Management`, `Weekly Report Analytics`, `Module - Props`, `Test Case Management`, `Activity Feed and Timeline`, `Test Case Management`, `Module - parseFieldError()`, `User Authentication Flows`, `Activity Feed and Timeline`, `CSV Import and Parsing`, `Module - FilterOption`, `Shared - Props`, `Dashboard Stats and Realtime`, `Dashboard Stats and Realtime`, `Test Case Management`, `Announcements and Broadcasts`, `Module - Row`, `Test Case Management`, `Dashboard Stats and Realtime`, `Announcements and Broadcasts`, `Dashboard Stats and Realtime`, `Activity Feed and Timeline`, `Notification Systems and MFA`, `Layout - sidebar-nav.tsx`, `Global Search Engine`, `Dashboard Stats and Realtime`, `Module`, `Weekly Report Analytics`, `Dashboard Stats and Realtime`, `Dashboard Stats and Realtime`, `Module - density-toggle.tsx`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `db` connect `User Authentication Flows` to `Activity Feed and Timeline`, `Test Case Management`, `Dashboard Stats and Realtime`, `Gantt Timeline Chart`, `Database Schema and Bootstrap`, `Google OAuth Integration`, `Test Case Management`, `Gantt Timeline Chart`, `User Authentication Flows`, `User Authentication Flows`, `Activity Feed and Timeline`, `Lib - ModuleData`, `Activity Feed and Timeline`, `RBAC and Role Validation`, `Test Case Management`, `Lib - route.ts`, `User Authentication Flows`, `CSV Import and Parsing`, `Activity Feed and Timeline`, `Billing and LemonSqueezy API`, `Lib - route.ts`, `Comments - route.ts`, `Activity Feed and Timeline`, `Test Case Management`, `Lib - page.tsx`, `Lib - route.ts`, `Digest - route.ts`, `Notification Systems and MFA`, `Test-Coverage - route.ts`, `Presence - route.ts`, `[Id] - route.ts`, `User and Workspace Settings`, `[Token] - route.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `posts` to the rest of the system?**
  _635 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `User Authentication Flows` be split into smaller, more focused modules?**
  _Cohesion score 0.04555638536221061 - nodes in this community are weakly interconnected._
- **Should `Activity Feed and Timeline` be split into smaller, more focused modules?**
  _Cohesion score 0.09572649572649573 - nodes in this community are weakly interconnected._
- **Should `Gantt Timeline Chart` be split into smaller, more focused modules?**
  _Cohesion score 0.07686116700201208 - nodes in this community are weakly interconnected._