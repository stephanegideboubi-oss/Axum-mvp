import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBids } from "../api/vendors";
import { MyBid } from "../types/bid";

const BID_STATUS_BADGE: Record<string, string> = {
  submitted: "bg-orange-100 text-orange-800",
  selected: "bg-green-100 text-green-800",
  rejected: "bg-neutral-100 text-neutral-600",
};

function money(amount: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(amount)
  );
}

export default function VendorBids() {
  const [bids, setBids] = useState<MyBid[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyBids()
      .then(setBids)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load your bids"));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-black">Projects I've bid on</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {bids === null && !error && <p className="text-sm text-neutral-500">Loading...</p>}
        {bids !== null && bids.length === 0 && (
          <p className="text-sm text-neutral-500">
            You haven't submitted any bids yet — browse funded projects to get started.
          </p>
        )}

        <ul className="space-y-3">
          {bids?.map((b) => (
            <li key={b.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start">
                <div>
                  <Link to={`/projects/${b.project_id}`} className="font-medium text-black underline">
                    {b.project_title}
                  </Link>
                  <p className="text-sm text-neutral-600 mt-1">{b.line_item_description}</p>
                </div>
                <span
                  className={`text-xs uppercase tracking-wide font-medium px-2 py-1 rounded shrink-0 ml-3 ${
                    BID_STATUS_BADGE[b.status] ?? "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">Your bid: {money(b.amount)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
