import { useEffect, useState } from "react";
import { getProjectAnalytics } from "../api/projects";
import { ProjectAnalytics } from "../types/project";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open for bids",
  bidding: "Receiving bids",
  awarded: "Vendor selected",
  held: "Funds held in escrow",
  proof_submitted: "Proof uploaded",
  released: "Released to vendor",
};

export default function ProjectAnalyticsPanel({
  projectId,
  currency,
}: {
  projectId: string;
  currency: string;
}) {
  const [data, setData] = useState<ProjectAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjectAnalytics(projectId)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load analytics"));
  }, [projectId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading analytics...</p>;

  const { drawdown } = data;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-lg font-semibold text-black">Project analytics</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Funded" value={`${data.fundingProgressPct}%`} />
        <Stat label="Contributors" value={String(data.contributorCount)} />
        <Stat
          label="Open disputes"
          value={String(data.openDisputeCount)}
          tone={data.openDisputeCount > 0 ? "warn" : undefined}
        />
        <Stat label="Remaining to disburse" value={money(drawdown.remainingToDisburse, currency)} />
      </div>

      <div>
        <h3 className="text-sm font-medium text-black mb-2">Escrow drawdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <MiniStat label="Budgeted" value={money(drawdown.totalBudgeted, currency)} />
          <MiniStat label="Awarded to vendors" value={money(drawdown.totalAwarded, currency)} />
          <MiniStat label="Held in escrow" value={money(drawdown.totalHeld, currency)} />
          <MiniStat label="Released" value={money(drawdown.totalReleased, currency)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-black mb-2">Bidding activity by line item</h3>
        <ul className="space-y-2">
          {data.lineItems.map((li) => {
            const variance =
              li.selectedBidAmount !== null ? li.selectedBidAmount - li.budgetedAmount : null;
            return (
              <li key={li.id} className="border border-neutral-200 rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-black">{li.description}</span>
                  <span className="text-neutral-500">{money(li.budgetedAmount, currency)} budgeted</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {STATUS_LABELS[li.status] ?? li.status}
                  {li.disputed ? " · flagged" : ""}
                  {" · "}
                  {li.bidCount} bid{li.bidCount === 1 ? "" : "s"}
                  {li.bidCount > 0 &&
                    li.minBid !== null &&
                    li.maxBid !== null &&
                    ` (${money(li.minBid, currency)} – ${money(li.maxBid, currency)})`}
                </p>
                {li.selectedBidAmount !== null && variance !== null && (
                  <p className="text-xs mt-1">
                    Awarded at {money(li.selectedBidAmount, currency)}
                    {variance !== 0 && (
                      <span className={variance < 0 ? "text-green-700" : "text-red-600"}>
                        {" "}
                        ({variance < 0 ? "-" : "+"}
                        {money(Math.abs(variance), currency)} vs. budget)
                      </span>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded border border-neutral-200 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-semibold ${tone === "warn" ? "text-red-600" : "text-black"}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-medium text-black">{value}</p>
    </div>
  );
}
