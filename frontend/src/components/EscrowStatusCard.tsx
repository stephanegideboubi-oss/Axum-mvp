import { EscrowStatus } from "../types/escrow";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Shown wherever a contributor might look for assurance that the escrow
// amount on screen matches reality: the totals are computed live from the
// database, and the badge reflects whether the escrow partner has attested
// to that exact figure (not just whatever AXUM's own database claims).
export default function EscrowStatusCard({
  escrow,
  currency,
}: {
  escrow: EscrowStatus;
  currency: string;
}) {
  if (escrow.totalHeld === 0 && escrow.totalReleased === 0) return null;

  const confirmed = escrow.confirmation?.isCurrent ?? false;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-black mb-3">Escrow</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-neutral-500">Held in escrow</dt>
          <dd className="text-black font-medium text-lg">{money(escrow.totalHeld, currency)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Released to vendors</dt>
          <dd className="text-black font-medium text-lg">{money(escrow.totalReleased, currency)}</dd>
        </div>
      </div>

      {confirmed ? (
        <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          &#10003; Confirmed by {escrow.confirmation!.bankName} on{" "}
          {formatDate(escrow.confirmation!.confirmedAt)}
        </p>
      ) : (
        <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          &#9888; Awaiting escrow confirmation
          {escrow.confirmation
            ? " — the held amount has changed since the last confirmation."
            : "."}
        </p>
      )}
    </div>
  );
}
