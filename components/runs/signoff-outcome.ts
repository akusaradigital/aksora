export type SignoffOutcome = "Approved" | "Rejected" | "Pending";

/** All approved -> Approved, any rejected -> Rejected, otherwise (incl. no stakeholders) Pending. */
export function signoffOutcome(decisions: string[]): SignoffOutcome {
  if (decisions.includes("rejected")) return "Rejected";
  if (decisions.length > 0 && decisions.every((d) => d === "approved")) return "Approved";
  return "Pending";
}

// Self-check: runs once at import in dev; cheap and keeps the rule honest.
if (process.env.NODE_ENV !== "production") {
  const ok = signoffOutcome([]) === "Pending"
    && signoffOutcome(["approved", "approved"]) === "Approved"
    && signoffOutcome(["approved", "pending"]) === "Pending"
    && signoffOutcome(["approved", "rejected", "pending"]) === "Rejected";
  if (!ok) console.error("signoffOutcome self-check failed");
}
