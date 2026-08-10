export const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// Core QA Tables Definition
export const tables = [
  {
    name: "Sprint",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL,
      "startDate" TEXT,
      "endDate" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "goal" TEXT DEFAULT '',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Task",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "sprintId" FK_INT_SPRINT,
      "title" TEXT NOT NULL,
      "project" TEXT NOT NULL,
      "relatedFeature" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "priority" TEXT NOT NULL,
      "startDate" TEXT,
      "endDate" TEXT,
      "description" TEXT NOT NULL,
      "acceptanceCriteria" TEXT NOT NULL DEFAULT '',
      "notes" TEXT NOT NULL DEFAULT '',
      "evidence" TEXT NOT NULL DEFAULT '',
      "relatedItems" TEXT DEFAULT '',
      "assignee" TEXT DEFAULT '',
      "attachments" TEXT DEFAULT '',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Bug",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "sprintId" FK_INT_SPRINT,
      "project" TEXT NOT NULL,
      "module" TEXT NOT NULL,
      "bugType" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "preconditions" TEXT NOT NULL,
      "stepsToReproduce" TEXT NOT NULL,
      "expectedResult" TEXT NOT NULL,
      "actualResult" TEXT DEFAULT '',
      "severity" TEXT NOT NULL,
      "priority" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "evidence" TEXT NOT NULL DEFAULT '',
      "relatedItems" TEXT DEFAULT '',
      "suggestedDev" TEXT DEFAULT '',
      "attachments" TEXT DEFAULT '',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "TestCase",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "testSuiteId" TEXT NOT NULL DEFAULT '',
      "tcId" TEXT NOT NULL,
      "typeCase" TEXT NOT NULL,
      "preCondition" TEXT NOT NULL,
      "quarantined" INTEGER NOT NULL DEFAULT 0,
      "quarantinedAt" DATE_TYPE,
      "quarantineReason" TEXT DEFAULT '',
      "consecutivePasses" INTEGER NOT NULL DEFAULT 0,
      "caseName" TEXT NOT NULL,
      "assignee" TEXT DEFAULT '',
      "testStep" TEXT NOT NULL,
      "expectedResult" TEXT NOT NULL,
      "actualResult" TEXT DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'Pending',
      "automationResult" TEXT,
      "evidence" TEXT DEFAULT '',
      "priority" TEXT DEFAULT 'Medium',
      "lastRunAt" TEXT,
      "relatedItems" TEXT DEFAULT '',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "TestPlan",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "title" TEXT NOT NULL,
      "project" TEXT NOT NULL,
      "sprint" TEXT NOT NULL,
      "scope" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "startDate" TEXT,
      "endDate" TEXT,
      "assignee" TEXT,
      "notes" TEXT,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "TestSession",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "date" TEXT NOT NULL,
      "project" TEXT NOT NULL,
      "sprint" TEXT NOT NULL,
      "tester" TEXT NOT NULL,
      "scope" TEXT NOT NULL,
      "totalCases" TEXT,
      "passed" TEXT,
      "failed" TEXT,
      "blocked" TEXT,
      "result" TEXT NOT NULL,
      "notes" TEXT,
      "evidence" TEXT,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "TestSuite",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "testPlanId" TEXT NOT NULL DEFAULT '',
      "title" TEXT NOT NULL,
      "assignee" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "notes" TEXT,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "ActivityLog",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "actor" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "SearchToken",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "entityIdInt" INTEGER NOT NULL DEFAULT 0,
      "token" TEXT NOT NULL,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "MeetingNote",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "date" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "project" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "attendees" TEXT NOT NULL DEFAULT '',
      "content" TEXT NOT NULL DEFAULT '',
      "summary" TEXT NOT NULL DEFAULT '',
      "actionItems" TEXT NOT NULL DEFAULT '',
      "relatedItems" TEXT DEFAULT '',
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Assignee",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "userId" INTEGER UNIQUE,
      "name" TEXT NOT NULL,
      "role" TEXT,
      "email" TEXT,
      "skills" TEXT DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'active',
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "User",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "name" TEXT,
      "email" TEXT UNIQUE,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'qa',
      "avatar" TEXT DEFAULT '',
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Invite",
    schema: `
      "id" SERIAL_OR_PK,
      "token" TEXT NOT NULL UNIQUE,
      "company" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'qa',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdBy" TEXT NOT NULL DEFAULT '',
      "expiresAt" DATE_TYPE NOT NULL,
      "acceptedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Deployment",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "date" TEXT NOT NULL,
      "version" TEXT NOT NULL,
      "project" TEXT NOT NULL,
      "environment" TEXT NOT NULL DEFAULT 'staging',
      "developer" TEXT NOT NULL,
      "changelog" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'success',
      "notes" TEXT DEFAULT '',
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "ExecutionRun",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "testSuiteId" INTEGER NOT NULL,
      "testPlanId" TEXT NOT NULL DEFAULT '',
      "runNumber" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'in-progress',
      "tester" TEXT NOT NULL DEFAULT '',
      "totalCases" INTEGER NOT NULL DEFAULT 0,
      "passed" INTEGER NOT NULL DEFAULT 0,
      "failed" INTEGER NOT NULL DEFAULT 0,
      "blocked" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT DEFAULT '',
      "startedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" DATE_TYPE,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "CaseVerdict",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "executionRunId" INTEGER NOT NULL,
      "testCaseId" INTEGER NOT NULL,
      "verdict" TEXT NOT NULL DEFAULT 'Pending',
      "actualResult" TEXT DEFAULT '',
      "evidence" TEXT DEFAULT '',
      "duration" INTEGER NOT NULL DEFAULT 0,
      "executedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "DashboardComment",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "entityType" TEXT NOT NULL,
      "entityId" INTEGER NOT NULL,
      "authorId" INTEGER NOT NULL,
      "authorName" TEXT NOT NULL DEFAULT '',
      "content" TEXT NOT NULL,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "PresenceHeartbeat",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "userId" INTEGER NOT NULL,
      "userName" TEXT NOT NULL DEFAULT '',
      "lastSeen" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "DashboardFilter",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "userId" INTEGER NOT NULL,
      "userName" TEXT NOT NULL DEFAULT '',
      "name" TEXT NOT NULL,
      "project" TEXT NOT NULL DEFAULT '',
      "activityScope" TEXT NOT NULL DEFAULT 'team',
      "density" TEXT NOT NULL DEFAULT 'comfortable',
      "shared" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "WorkLog",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "date" TEXT NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "project" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "output" TEXT DEFAULT '',
      "notes" TEXT DEFAULT '',
      "assignee" TEXT DEFAULT '',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Company",
    schema: `
      "id" SERIAL_OR_PK,
      "name" TEXT NOT NULL UNIQUE,
      "plan" TEXT NOT NULL DEFAULT 'free',
      "planExpiry" TEXT,
      "maxUsers" INTEGER NOT NULL DEFAULT 10,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "AdminAuditLog",
    schema: `
      "id" SERIAL_OR_PK,
      "actor" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "target" TEXT NOT NULL DEFAULT '',
      "detail" TEXT NOT NULL DEFAULT '',
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "Announcement",
    schema: `
      "id" SERIAL_OR_PK,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'info',
      "targetCompany" TEXT NOT NULL DEFAULT '',
      "active" INTEGER NOT NULL DEFAULT 1,
      "createdBy" TEXT NOT NULL DEFAULT '',
      "expiresAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "SupportTicket",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "status" TEXT NOT NULL DEFAULT 'open',
      "priority" TEXT NOT NULL DEFAULT 'normal',
      "createdBy" TEXT NOT NULL DEFAULT '',
      "adminReply" TEXT NOT NULL DEFAULT '',
      "repliedAt" DATE_TYPE,
      "closedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "CollaborationPresence",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "userId" INTEGER NOT NULL,
      "userName" TEXT NOT NULL DEFAULT '',
      "module" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "action" TEXT NOT NULL DEFAULT 'viewing',
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "AdminNotification",
    schema: `
      "id" SERIAL_OR_PK,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL DEFAULT '',
      "companyId" INTEGER,
      "companyName" TEXT NOT NULL DEFAULT '',
      "meta" TEXT NOT NULL DEFAULT '',
      "read" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "ModuleView",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "userId" INTEGER NOT NULL,
      "userName" TEXT NOT NULL DEFAULT '',
      "publicToken" TEXT NOT NULL DEFAULT '',
      "module" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "filters" TEXT NOT NULL DEFAULT '[]',
      "search" TEXT NOT NULL DEFAULT '',
      "viewMode" TEXT NOT NULL DEFAULT 'table',
      "shared" INTEGER NOT NULL DEFAULT 0,
      "isDefault" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" DATE_TYPE,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  },
  {
    name: "NotificationPreference",
    schema: `
      "id" SERIAL_OR_PK,
      "company" TEXT NOT NULL DEFAULT '',
      "userId" INTEGER NOT NULL,
      "assignedToMe" INTEGER NOT NULL DEFAULT 1,
      "statusChanges" INTEGER NOT NULL DEFAULT 1,
      "mentions" INTEGER NOT NULL DEFAULT 1,
      "overdueBugs" INTEGER NOT NULL DEFAULT 1,
      "sprintDeadlines" INTEGER NOT NULL DEFAULT 1,
      "dailyDigest" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATE_TYPE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
  }
];
