import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBidsForLineItem, rejectBid, selectBid, submitBid } from "../api/bids";
import { useAuth } from "../context/AuthContext";
import { Bid } from "../types/bid";
import { BudgetLineItem, Project } from "../types/project";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function LineItemBidding({
  project,
  lineItem,
  onChanged,
}: {
  project: Project;
  lineItem: BudgetLineItem;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [showBids, setShowBids] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.id === project.entrepreneur_id;
  const canBid =
    project.status === "funded" &&
    ["open", "bidding"].includes(lineItem.status) &&
    user?.role === "vendor";
  const canReview = isOwner && project.status === "funded" && ["open", "bidding"].includes(lineItem.status);

  const loadBids = useCallback(async () => {
    const result = await listBidsForLineItem(lineItem.id);
    setBids(result);
  }, [lineItem.id]);

  useEffect(() => {
    if (project.status === "funded") {
      loadBids();
    }
  }, [loadBids, project.status]);

  const myBid = bids.find((b) => b.vendor_id === user?.id);
  const selectedBid = bids.find((b) => b.status === "selected");

  async function handleSubmitBid(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitBid(lineItem.id, { amount: Number(amount), notes });
      setAmount("");
      setNotes("");
      await loadBids();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not submit bid");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelect(bidId: string) {
    setActingOn(bidId);
    setError(null);
    try {
      await selectBid(bidId);
      await loadBids();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not select this bid");
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(bidId: string) {
    setActingOn(bidId);
    setError(null);
    try {
      await rejectBid(bidId);
      await loadBids();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not reject this bid");
    } finally {
      setActingOn(null);
    }
  }

  if (project.status !== "funded") return null;

  return (
    <div className="mt-3 border-t border-neutral-100 pt-3">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {selectedBid && (
        <p className="text-xs text-neutral-600 mb-2">
          Awarded to{" "}
          <Link
            to={`/vendors/${selectedBid.vendor_id}`}
            className="text-orange-700 underline font-medium"
          >
            {selectedBid.vendor_name} — view profile
          </Link>
        </p>
      )}

      {bids.length > 0 && (
        <button
          onClick={() => setShowBids((v) => !v)}
          className="text-xs text-neutral-600 underline mb-2"
        >
          {showBids ? "Hide bids" : `View bids (${bids.length})`}
        </button>
      )}

      {showBids && (
        <ul className="space-y-2 mb-3">
          {bids.map((b) => (
            <li key={b.id} className="flex justify-between items-start bg-neutral-50 rounded p-2 text-xs">
              <div>
                <p className="font-medium text-black">
                  <Link to={`/vendors/${b.vendor_id}`} className="text-orange-700 underline">
                    {b.vendor_name}
                  </Link>{" "}
                  — {money(b.amount, project.currency)}
                </p>
                <p className="text-neutral-600">{b.notes}</p>
                <span className="uppercase tracking-wide text-neutral-500">{b.status}</span>
              </div>
              {canReview && b.status === "submitted" && (
                <div className="flex gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => handleSelect(b.id)}
                    disabled={actingOn === b.id}
                    className="rounded bg-green-700 text-white px-2 py-1 disabled:opacity-50"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleReject(b.id)}
                    disabled={actingOn === b.id}
                    className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canBid && user?.verification_status !== "verified" && (
        <p className="text-xs text-amber-600">
          Your vendor account must be verified by an admin before you can bid.
        </p>
      )}

      {canBid && user?.verification_status === "verified" && !myBid && (
        <form onSubmit={handleSubmitBid} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Bid amount (USD)"
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              required
              placeholder="Notes / proposal"
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit bid"}
          </button>
        </form>
      )}

      {myBid && (
        <p className="text-xs text-neutral-500">
          Your bid: {money(myBid.amount, project.currency)} — status: {myBid.status}
        </p>
      )}
    </div>
  );
}
