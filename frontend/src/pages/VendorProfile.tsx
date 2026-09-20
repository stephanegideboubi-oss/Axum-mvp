import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getVendorProfile } from "../api/vendors";
import { VendorProfileResponse } from "../types/vendor";

const VERIFICATION_BADGE: Record<string, string> = {
  verified: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
};

export default function VendorProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<VendorProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getVendorProfile(id)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load this vendor"));
  }, [id]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-neutral-500">Loading...</div>;

  const { vendor, portfolio, stats } = data;

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-black">{vendor.name}</h1>
              {vendor.business_registration_info && (
                <p className="text-sm text-neutral-500 mt-1">{vendor.business_registration_info}</p>
              )}
            </div>
            <span
              className={`text-xs uppercase tracking-wide font-medium px-2 py-1 rounded ${
                VERIFICATION_BADGE[vendor.verification_status] ?? "bg-neutral-100 text-neutral-700"
              }`}
            >
              {vendor.verification_status}
            </span>
          </div>

          {vendor.bio && <p className="mt-4 text-neutral-700 whitespace-pre-wrap">{vendor.bio}</p>}

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-lg font-semibold text-black">{stats.totalBids}</p>
              <p className="text-xs text-neutral-500">Bids submitted</p>
            </div>
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-lg font-semibold text-black">{stats.jobsWon}</p>
              <p className="text-xs text-neutral-500">Jobs won</p>
            </div>
            <div className="rounded border border-neutral-200 p-3">
              <p className="text-lg font-semibold text-black">{stats.jobsCompleted}</p>
              <p className="text-xs text-neutral-500">Jobs completed &amp; paid</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Portfolio</h2>
          {portfolio.length === 0 && (
            <p className="text-sm text-neutral-500">
              This vendor hasn't added any work samples yet.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {portfolio.map((img) => (
              <a
                key={img.id}
                href={img.image_url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={img.image_url}
                  alt={img.caption ?? "Vendor work sample"}
                  className="w-full h-32 object-cover rounded border border-neutral-200"
                />
                {img.caption && <p className="mt-1 text-xs text-neutral-500">{img.caption}</p>}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
