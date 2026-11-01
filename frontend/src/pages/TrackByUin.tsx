import Eyebrow from "../components/Eyebrow";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { lookupByUin } from "../api/contributions";
import EscrowStatusCard from "../components/EscrowStatusCard";
import { Contribution } from "../types/contribution";
import { EscrowStatus } from "../types/escrow";
import { BudgetLineItem, Project } from "../types/project";

const STATUS_LABELS: Record<string, string> = {
  open: "Open for bids",
  bidding: "Receiving bids",
  awarded: "Vendor selected",
  held: "Funds held in escrow",
  proof_submitted: "Proof uploaded",
  released: "Released to vendor",
};

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function TrackByUin() {
  const [uin, setUin] = useState("");
  const [result, setResult] = useState<{
    contribution: Contribution;
    project: Project;
    lineItems: BudgetLineItem[];
    escrow: EscrowStatus;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await lookupByUin(uin.trim());
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "No contribution found for that tracking number");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <Eyebrow>No login needed</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold text-black">Track a project by UIN</h1>
        </div>
        <p className="text-sm text-neutral-500">
          Enter the tracking number (UIN) you received when you contributed — no login needed.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-7 flex gap-3">
          <input
            className="flex-1 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2 font-mono"
            placeholder="AXM-XXXXXXXXXX"
            value={uin}
            onChange={(e) => setUin(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/30 transition-colors text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Looking up..." : "Track"}
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <Link
                  to={`/projects/${result.project.id}`}
                  className="text-lg font-medium text-black underline"
                >
                  {result.project.title}
                </Link>
                <p className="text-sm text-neutral-500">{result.project.location}</p>
              </div>
              <span className="text-xs uppercase tracking-wide font-medium bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full">
                {result.project.status}
              </span>
            </div>

            <div className="text-sm text-neutral-700">
              Your contribution:{" "}
              <span className="font-medium">
                {money(result.contribution.amount, result.contribution.currency)}
              </span>{" "}
              ({result.contribution.status})
            </div>

            <EscrowStatusCard escrow={result.escrow} currency={result.project.currency} />

            <div>
              <h2 className="font-medium text-black mb-2">Line-by-line status</h2>
              <ul className="space-y-2">
                {result.lineItems.map((li) => (
                  <li key={li.id} className="border border-neutral-200 rounded-xl p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-black">{li.description}</span>
                      <span className="text-neutral-500">
                        {money(li.amount, result.project.currency)}
                      </span>
                    </div>
                    <span className="mt-1 inline-block text-xs uppercase tracking-wide font-medium bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full">
                      {STATUS_LABELS[li.status] ?? li.status}
                      {li.disputed ? " · flagged, disbursement frozen" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
