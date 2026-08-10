import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Plan pricing (monthly)
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 490000,       // Rp 490.000/month
  enterprise: 1490000, // Rp 1.490.000/month
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Revenue by plan
    const planCounts = await db.query<{ plan: string; count: number }>(
      `SELECT "plan", COUNT(*) as "count" FROM "Company" WHERE "status" = 'active' GROUP BY "plan"`
    );

    const mrr = planCounts.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0) * Number(p.count), 0);
    const arr = mrr * 12;

    // Revenue breakdown per plan
    const revenueByPlan = planCounts.map((p) => ({
      plan: p.plan,
      count: Number(p.count),
      pricePerMonth: PLAN_PRICES[p.plan] || 0,
      revenue: (PLAN_PRICES[p.plan] || 0) * Number(p.count),
    }));

    // Churn: suspended companies (lost revenue)
    const churnedCompanies = await db.query<{ plan: string; count: number }>(
      `SELECT "plan", COUNT(*) as "count" FROM "Company" WHERE "status" = 'suspended' GROUP BY "plan"`
    );
    const churnRevenue = churnedCompanies.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0) * Number(p.count), 0);

    // Conversion funnel
    const totalCompanies = await db.get<{ total: number }>(
      `SELECT COUNT(*) as "total" FROM "Company"`
    );
    const paidCompanies = await db.get<{ total: number }>(
      `SELECT COUNT(*) as "total" FROM "Company" WHERE "plan" != 'free' AND "status" = 'active'`
    );
    const conversionRate = (totalCompanies?.total || 0) > 0
      ? Math.round(((paidCompanies?.total || 0) / (totalCompanies?.total || 1)) * 100)
      : 0;

    // Expiring soon (next 30 days) — potential churn risk
    const expiringRow = await db.get<{ count: number }>(
      `SELECT COUNT(*) as "count" FROM "Company"
      WHERE "status" = 'active' AND "planExpiry" IS NOT NULL
      AND "planExpiry"::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
    );
    const expiringCount = Number(expiringRow?.count || 0);

    // Monthly revenue trend (last 6 months) - single query instead of N+1
    const allCompanies = await db.query<{ plan: string; createdAt: string }>(
      `SELECT "plan", "createdAt" FROM "Company" WHERE "status" != 'suspended'`
    );

    const revenueHistory: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10) + "T23:59:59";

      const monthRevenue = allCompanies
        .filter((c) => c.createdAt <= endOfMonth)
        .reduce((sum, c) => sum + (PLAN_PRICES[c.plan] || 0), 0);
      revenueHistory.push({ month: monthStr, revenue: monthRevenue });
    }

    return NextResponse.json({
      data: {
        mrr,
        arr,
        churnRevenue,
        conversionRate,
        expiringCount,
        revenueByPlan: JSON.parse(JSON.stringify(revenueByPlan)),
        revenueHistory: JSON.parse(JSON.stringify(revenueHistory)),
        planPrices: PLAN_PRICES,
      },
    });
  } catch (error) {
    console.error("Revenue error:", error);
    return NextResponse.json({ error: "Failed to load revenue data" }, { status: 500 });
  }
}
