import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listVendors, verifyVendor } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { User } from "../types/user";

export default function AdminVendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setVendors(await listVendors());
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleVerify(id: string, status: "verified" | "rejected") {
    setActingOn(id);
    setError(null);
    try {
      await verifyVendor(id, status);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not update this vendor");
    } finally {
      setActingOn(null);
    }
  }

  if (user?.role !== "admin") {
    return <div className="p-8 text-red-600">You must be an admin to view this page.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor verification</h1>
          <Link to="/admin/disputes" className="text-sm text-slate-600 underline">
            Disputes
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && vendors.length === 0 && (
          <p className="text-sm text-slate-500">No vendors have registered yet.</p>
        )}

        <ul className="space-y-3">
          {vendors.map((v) => (
            <li key={v.id} className="bg-white rounded-lg shadow p-5 flex justify-between items-start">
              <div>
                <p className="font-medium text-slate-900">{v.name}</p>
                <p className="text-sm text-slate-500">{v.email}</p>
                <p className="text-xs text-slate-500 mt-1">{v.business_registration_info}</p>
                <span className="mt-2 inline-block text-xs uppercase tracking-wide font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {v.verification_status}
                </span>
              </div>
              {v.verification_status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleVerify(v.id, "verified")}
                    disabled={actingOn === v.id}
                    className="rounded bg-green-700 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleVerify(v.id, "rejected")}
                    disabled={actingOn === v.id}
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
