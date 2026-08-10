"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Buildings,
  Users,
  Bug,
  Kanban,
  Checks,
  Lightning,
  ArrowLeft,
  Circle,
  Crown,
  Headset,
  ClockCounterClockwise,
  ChartLineUp,
  Notebook,
  Rocket,
  Calendar,
  UserCircle,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { getRoleLabel } from "@/lib/roles";
import { ScrollToTop } from "@/components/layout/scroll-to-top";

// ─── Types ───────────────────────────────────────────────────────────────────
type CompanyInfo = {
  id: number; name: string; plan: string; planExpiry: string | null;
  maxUsers: number; status: string; createdAt: string; updatedAt: string;
};
type UserInfo = { id: number; name: string; email: string; role: string; createdAt: string };
type Stats = {
  totalBugs: number; totalTasks: number; totalTestCases: number; totalSprints: number;
  totalTestPlans: number; totalTestSuites: number; totalMeetings: number; totalDeployments: number;
};
type ActivityEntry = { id: number; entityType: string; entityId: string; action: string; summary: string; actor: string; createdAt: string };
type OnlineUser = { userId: number; userName: string; lastSeen: string };
type TrendData = { month: string; count: number };
type StatusCount = { status: string; count: number };
type TicketInfo = { id: number; subject: string; status: string; priority: string; createdAt: string };
type BillingEntry = { id: number; actor: string; action: string; detail: string; createdAt: string };

type CompanyDetailData = {
  company: CompanyInfo;
  users: UserInfo[];
  stats: Stats;
  recentActivity: ActivityEntry[];
  onlineUsers: OnlineUser[];
  activityTrend: TrendData[];
  bugsByStatus: StatusCount[];
  tasksByStatus: StatusCount[];
  tickets: TicketInfo[];
  billingHistory: BillingEntry[];
};

export default function CompanyDetailPage() {
  return null;
}

