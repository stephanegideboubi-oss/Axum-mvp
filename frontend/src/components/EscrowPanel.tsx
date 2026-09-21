import { FormEvent, useCallback, useEffect, useState } from "react";
import { authorizeRelease, holdFunds, listProof, releaseFunds, uploadProof } from "../api/disbursements";
import { listBidsForLineItem } from "../api/bids";
import { useAuth } from "../context/AuthContext";
import { BudgetLineItem, Project } from "../types/project";
import { ProofDocument, ProofType } from "../types/proof";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function EscrowPanel({
  project,
  lineItem,
  onChanged,
}: {
  project: Project;
  lineItem: BudgetLineItem;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [proofDocs, setProofDocs] = useState<ProofDocument[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [proofType, setProofType] = useState<ProofType>("invoice");
  const [fileUrl, setFileUrl] = useState("");
  const [description, setDescription] = useState("");

  const relevant = ["awarded", "held", "proof_submitted", "released"].includes(lineItem.status);

  const load = useCallback(async () => {
    if (!relevant) return;
    const [proof, bids] = await Promise.all([
      listProof(lineItem.id),
      listBidsForLineItem(lineItem.id),
    ]);
    setProofDocs(proof);
    setSelectedVendorId(bids.find((b) => b.status === "selected")?.vendor_id ?? null);
  }, [lineItem.id, relevant]);

  useEffect(() => {
    load();
  }, [load]);

  if (!relevant) return null;

  const isVendorForThisLine = user?.role === "vendor" && user.id === selectedVendorId;

  async function handleHold() {
    setBusy(true);
    setError(null);
    try {
      await holdFunds(lineItem.id);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not hold funds");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    setBusy(true);
    setError(null);
    try {
      await releaseFunds(lineItem.id);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not release funds");
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthorize() {
    setBusy(true);
    setError(null);
    try {
      await authorizeRelease(lineItem.id);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not authorize this release");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadProof(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await uploadProof(lineItem.id, { type: proofType, fileUrl, description: description || undefined });
      setFileUrl("");
      setDescription("");
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not upload proof");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-neutral-100 pt-3 text-xs">
      {error && <p className="text-red-600 mb-2">{error}</p>}

      {proofDocs.length > 0 && (
        <ul className="space-y-1 mb-2">
          {proofDocs.map((p) => (
            <li key={p.id} className="bg-neutral-50 rounded p-2">
              <span className="uppercase tracking-wide font-medium text-neutral-700">{p.type}</span>{" "}
              — <a href={p.file_url} target="_blank" rel="noreferrer" className="underline">{p.file_url}</a>
              {p.description && <p className="text-neutral-600 mt-0.5">{p.description}</p>}
            </li>
          ))}
        </ul>
      )}

      {user?.role === "escrow_partner" && lineItem.status === "awarded" && (
        <button
          onClick={handleHold}
          disabled={busy}
          className="rounded bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 disabled:opacity-50"
        >
          {busy ? "Holding..." : `Hold ${money(lineItem.amount, project.currency)} in escrow`}
        </button>
      )}

      {isVendorForThisLine && ["held", "proof_submitted"].includes(lineItem.status) && (
        <form onSubmit={handleUploadProof} className="space-y-2">
          <p className="text-neutral-600">Upload proof of work for this line item:</p>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={proofType}
              onChange={(e) => setProofType(e.target.value as ProofType)}
              className="rounded border border-neutral-300 px-2 py-1.5"
            >
              <option value="invoice">Invoice</option>
              <option value="payment_proof">Payment proof</option>
              <option value="photo">Delivery photo</option>
            </select>
            <input
              required
              placeholder="File URL"
              className="rounded border border-neutral-300 px-2 py-1.5 col-span-2"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </div>
          <input
            placeholder="Description (optional)"
            className="w-full rounded border border-neutral-300 px-2 py-1.5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Upload proof"}
          </button>
        </form>
      )}

      {user?.role === "admin" && lineItem.status === "proof_submitted" && !lineItem.release_authorized && (
        <button
          onClick={handleAuthorize}
          disabled={busy}
          className="rounded bg-blue-700 text-white px-3 py-1.5 disabled:opacity-50"
        >
          {busy ? "Authorizing..." : "Authorize release"}
        </button>
      )}

      {user?.role === "admin" && lineItem.status === "proof_submitted" && lineItem.release_authorized && (
        <p className="text-green-700">Release authorized — awaiting the escrow partner.</p>
      )}

      {user?.role === "escrow_partner" && lineItem.status === "proof_submitted" && (
        <button
          onClick={handleRelease}
          disabled={busy || lineItem.disputed || !lineItem.release_authorized}
          className="rounded bg-green-700 text-white px-3 py-1.5 disabled:opacity-50"
          title={
            lineItem.disputed
              ? "Frozen by a dispute — resolve it first"
              : !lineItem.release_authorized
              ? "Waiting for an admin to authorize this release"
              : undefined
          }
        >
          {busy
            ? "Releasing..."
            : lineItem.disputed
            ? "Frozen by dispute — cannot release"
            : !lineItem.release_authorized
            ? "Awaiting admin authorization"
            : `Release ${money(lineItem.amount, project.currency)} to vendor`}
        </button>
      )}
    </div>
  );
}
