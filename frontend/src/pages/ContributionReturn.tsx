import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmContribution } from "../api/contributions";
import Eyebrow from "../components/Eyebrow";
import { Contribution } from "../types/contribution";

const POLL_EVERY_MS = 4000;
// Mobile-money approvals happen on the customer's phone and can take a while.
const GIVE_UP_AFTER_MS = 3 * 60 * 1000;

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

// Where customers land after a hosted payment page. The browser's say-so proves
// nothing: every visit asks the server, which asks the payment provider.
export default function ContributionReturn() {
  const [params] = useSearchParams();
  const contributionId = params.get("c");
  const leftWithoutPaying = params.get("cancelled") === "1";

  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  const check = useCallback(async () => {
    if (!contributionId) return;
    try {
      const result = await confirmContribution(contributionId);
      setContribution(result.contribution);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not check on this payment");
    }
  }, [contributionId]);

  useEffect(() => {
    check();
  }, [check]);

  // Keep checking while the provider still says "pending".
  useEffect(() => {
    if (!contribution || contribution.status !== "pending") return;
    if (Date.now() - startedAt.current > GIVE_UP_AFTER_MS) {
      setTimedOut(true);
      return;
    }
    const timer = setTimeout(check, POLL_EVERY_MS);
    return () => clearTimeout(timer);
  }, [contribution, check]);

  function restart() {
    startedAt.current = Date.now();
    setTimedOut(false);
    check();
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">
        <Eyebrow>Payment</Eyebrow>

        {!contributionId && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">Nothing to check</h1>
            <p className="mt-3 text-neutral-600">This page needs a payment to look up.</p>
          </>
        )}

        {contributionId && !contribution && !error && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">Checking your payment…</h1>
            <p className="mt-3 text-neutral-600">One moment while we confirm it with the payment provider.</p>
          </>
        )}

        {error && !contribution && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">We couldn't check this payment</h1>
            <p className="mt-3 text-sm text-red-600">{error}</p>
            <button onClick={check} className="mt-4 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500">
              Try again
            </button>
          </>
        )}

        {contribution?.status === "recorded" && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">Thank you!</h1>
            <p className="mt-3 text-neutral-600">
              Your contribution of{" "}
              <span className="font-semibold text-black">{money(contribution.amount, contribution.currency)}</span> was
              received.
            </p>
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Your tracking number (UIN):{" "}
              <span className="font-mono text-base font-semibold">{contribution.uin}</span>
              <p className="mt-1 text-xs text-green-700">
                Save it. You can check on this project any time from "Track a project", even when logged out.
              </p>
            </div>
          </>
        )}

        {contribution?.status === "pending" && !timedOut && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">Waiting for confirmation…</h1>
            <p className="mt-3 text-neutral-600">
              {leftWithoutPaying
                ? "It looks like you left the payment page before finishing. If you did complete the payment, we'll confirm it here shortly."
                : "Your payment hasn't been confirmed yet. If you're approving it on your phone, this can take a minute."}
            </p>
            <p className="mt-2 text-xs text-neutral-500">This page checks automatically — you don't need to refresh.</p>
          </>
        )}

        {contribution?.status === "pending" && timedOut && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">Still waiting</h1>
            <p className="mt-3 text-neutral-600">
              We haven't received confirmation yet. If you were charged, it will appear under "My contributions" once
              the provider confirms it; if you weren't, nothing was taken.
            </p>
            <button onClick={restart} className="mt-4 rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:border-orange-500 hover:text-orange-600">
              Check again
            </button>
          </>
        )}

        {contribution?.status === "failed" && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">The payment didn't go through</h1>
            <p className="mt-3 text-neutral-600">No money was taken. You can try again, or choose another payment method.</p>
          </>
        )}

        {contribution?.status === "refunded" && (
          <>
            <h1 className="mt-2 text-3xl font-bold text-black">This payment was refunded</h1>
            <p className="mt-3 text-neutral-600">
              The project was cancelled, so your money is being returned to the method you paid with.
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {contribution && (
            <Link
              to={`/projects/${contribution.project_id}`}
              className="rounded-xl bg-orange-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500"
            >
              Back to the project
            </Link>
          )}
          <Link to="/my-contributions" className="rounded-xl border border-neutral-300 px-5 py-2.5 font-semibold text-neutral-700 hover:border-orange-500 hover:text-orange-600">
            My contributions
          </Link>
        </div>
      </div>
    </div>
  );
}
