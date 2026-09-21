import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { confirmProjectBalance, getEscrowOverview } from "../api/escrow";
import { useAuth } from "../context/AuthContext";
import { EscrowOverviewProject } from "../types/escrow";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function EscrowDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<EscrowOverviewProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setProjects(await getEscrowOverview());
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not load escrow accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(projectId: string) {
    setActingOn(projectId);
    setError(null);
    try {
      await confirmProjectBalance(projectId);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not confirm this balance");
    } finally {
      setActingOn(null);
    }
  }

  if (user?.role !== "escrow_partner") {
    return <div className="p-8 text-red-600">You must be the escrow partner to view this page.</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-black">Escrow accounts</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-neutral-500">Loading...</p>}
        {!loading && projects.length === 0 && (
          <p className="text-sm text-neutral-500">No projects have funds in escrow yet.</p>
        )}

        <ul className="space-y-4">
          {projects.map((p) => {
            const confirmed = p.confirmation?.isCurrent ?? false;
            return (
              <li key={p.project.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      to={`/projects/${p.project.id}`}
                      className="font-medium text-black underline"
                    >
                      {p.project.title}
                    </Link>
                    <p className="text-xs text-neutral-500 mt-1">{p.project.status}</p>
                  </div>
                  <span
                    className={`text-xs uppercase tracking-wide font-medium px-2 py-1 rounded ${
                      confirmed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {confirmed ? "Confirmed" : "Unconfirmed"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <dt className="text-neutral-500">Held</dt>
                    <dd className="text-black font-medium">{money(p.totalHeld, p.project.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Released</dt>
                    <dd className="text-black font-medium">
                      {money(p.totalReleased, p.project.currency)}
                    </dd>
                  </div>
                </div>

                {p.confirmation && (
                  <p className="mt-3 text-xs text-neutral-500">
                    Last confirmed {money(p.confirmation.confirmedTotal, p.project.currency)} on{" "}
                    {formatDate(p.confirmation.confirmedAt)}
                    {!confirmed && " — held amount has changed since"}
                  </p>
                )}

                {p.pendingAuthorization.length > 0 && (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    {p.pendingAuthorization.length} line item(s) awaiting admin authorization before
                    they can be released.
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleConfirm(p.project.id)}
                    disabled={actingOn === p.project.id}
                    className="rounded bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    {actingOn === p.project.id ? "Confirming..." : "Confirm balance"}
                  </button>
                </div>

                <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
                  {p.lineItems.map((li) => (
                    <li key={li.id} className="text-xs flex justify-between items-center">
                      <span className="text-neutral-700">
                        {li.description} · {li.vendorName}
                      </span>
                      <span className="text-neutral-500">
                        {money(li.amount, p.project.currency)} · {li.disbursementStatus}
                        {li.disbursementStatus === "held" &&
                          (li.releaseAuthorized ? " · authorized" : " · not yet authorized")}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
