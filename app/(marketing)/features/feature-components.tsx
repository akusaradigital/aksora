import { Checks, X } from "@phosphor-icons/react/dist/ssr";

// ─── Feature Row with Mock UI ────────────────────────────────────────────────
export function FeatureRow({ number, icon, color, bg, title, desc, bullets, mockUI, reverse }: {
  number: string; icon: React.ReactNode; color: string; bg: string; title: string; desc: string; bullets: string[]; mockUI: React.ReactNode; reverse?: boolean;
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 items-center`}>
      <div className={reverse ? "lg:order-2" : ""}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-bold text-gray-300">{number}</span>
          <div className={`flex h-10 w-10 items-center justify-center ${bg} ${color}`} aria-hidden="true">
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <p className="mt-3 text-[13px] text-gray-600 leading-relaxed">{desc}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-[12px] text-gray-600">
              <Checks size={13} weight="bold" className="shrink-0 text-emerald-500" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${reverse ? "lg:order-1" : ""}`}>
        {mockUI}
      </div>
    </div>
  );
}

// ─── Comparison Table Row ────────────────────────────────────────────────────
export function CompareRow({ feature, ours, spreadsheet, jira, testrail }: {
  feature: string; ours: boolean | string; spreadsheet: boolean | string; jira: boolean | string; testrail: boolean | string;
}) {
  const renderCell = (val: boolean | string) => {
    if (val === true) return <Checks size={14} weight="bold" className="text-emerald-500 mx-auto" />;
    if (val === false) return <X size={14} weight="bold" className="text-gray-300 mx-auto" />;
    if (val === "partial") return <span className="text-[10px] text-amber-600 font-medium">Partial</span>;
    return <span className="text-[10px] text-gray-600 font-medium">{val}</span>;
  };
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 pr-4 text-[12px] font-medium text-gray-800">{feature}</td>
      <td className="py-3 px-4 text-center bg-blue-50/30">{renderCell(ours)}</td>
      <td className="py-3 px-4 text-center">{renderCell(spreadsheet)}</td>
      <td className="py-3 px-4 text-center">{renderCell(jira)}</td>
      <td className="py-3 pl-4 text-center">{renderCell(testrail)}</td>
    </tr>
  );
}
