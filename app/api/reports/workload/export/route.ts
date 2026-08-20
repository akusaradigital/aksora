import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGenericWorkbook } from "@/lib/excel";
import { GET as getWorkloadData } from "../route";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getWorkloadData();
  if (!res.ok) return res;

  const data = await res.json();
  const workload = data.workload || [];

  const columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "Tasks", key: "tasks", width: 10 },
    { header: "Test Plans", key: "plans", width: 12 },
    { header: "Score", key: "score", width: 10 },
    { header: "Workload Level", key: "level", width: 15 },
  ];

  const workbook = await buildGenericWorkbook({
    sheetName: "Workload",
    columns,
    rows: workload,
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="workload-export.xlsx"',
    },
  });
}
