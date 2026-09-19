import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDisputes, resolveDispute } from "../api/disputes";
import { useAuth } from "../context/AuthContext";
import { Dispute } from "../types/dispute";

export default function AdminDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesByDispute, setNotesByDispute] = useState<Record<string, string>>({});
  const [unfreezeByDispute, setUnfreezeByDispute] = useState<Record<string, boolean>>({});
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setDisputes(await listDisputes("open"));
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not load disputes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolve(e: FormEvent, id: string) {
    e.preventDefault();
    setActingOn(id);
    setError(null);
    try {
      await resolveDispute(id, {
        notes: notesByDispute[id] ?? "",
        unfreeze: !!unfreezeByDispute[id],
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not resolve this dispute");
    } finally {
      setActingOn(null);
    }
  }

  if (user?.role !== "admin") {
    return <div className="p-8 text-red-600">You must be an admin to view this page.</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black">Open disputes</h1>
          <Link to="/admin" className="text-sm text-neutral-600 underline">
            Vendor verification
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-neutral-500">Loading...</p>}
        {!loading && disputes.length === 0 && (
          <p className="text-sm text-neutral-500">No open disputes.</p>
        )}

        <ul className="space-y-4">
          {disputes.map((d) => (
            <li key={d.id} className="bg-white rounded-lg shadow p-5 space-y-3">
              <div>
                <Link to={`/projects/${d.project_id}`} className="font-medium text-black underline">
                  {d.line_item_description}
                </Link>
                <p className="text-sm text-neutral-600 mt-1">"{d.reason}"</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Flagged {new Date(d.created_at).toLocaleString()}
                </p>
              </div>

              <form onSubmit={(e) => handleResolve(e, d.id)} className="space-y-2">
                <textarea
                  required
                  placeholder="Resolution notes"
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                  rows={2}
                  value={notesByDispute[d.id] ?? ""}
                  onChange={(e) =>
                    setNotesByDispute((prev) => ({ ...prev, [d.id]: e.target.value }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={!!unfreezeByDispute[d.id]}
                    onChange={(e) =>
                      setUnfreezeByDispute((prev) => ({ ...prev, [d.id]: e.target.checked }))
                    }
                  />
                  Also unfreeze this line item's disbursement
                </label>
                <button
                  type="submit"
                  disabled={actingOn === d.id}
                  className="rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {actingOn === d.id ? "Resolving..." : "Mark resolved"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
