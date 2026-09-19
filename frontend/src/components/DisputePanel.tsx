import { FormEvent, useState } from "react";
import { flagLineItem } from "../api/disputes";
import { useAuth } from "../context/AuthContext";
import { BudgetLineItem, Project } from "../types/project";

export default function DisputePanel({
  project,
  lineItem,
  onChanged,
}: {
  project: Project;
  lineItem: BudgetLineItem;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== "contributor" || project.status === "draft") return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { lineItemFrozen } = await flagLineItem(lineItem.id, reason);
      setResult(
        lineItemFrozen
          ? "Flagged. Enough contributors have flagged this line that disbursement is now frozen pending admin review."
          : "Flagged. An admin has been notified for a lighter-touch review."
      );
      setReason("");
      setOpen(false);
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not flag this line item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
      {result && <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-2">{result}</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}

      {!open && !result && (
        <button onClick={() => setOpen(true)} className="text-slate-500 underline">
          Flag this line item as suspicious
        </button>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            required
            placeholder="Why does this look suspicious?"
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-red-700 text-white px-3 py-1.5 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit flag"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-slate-300 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
