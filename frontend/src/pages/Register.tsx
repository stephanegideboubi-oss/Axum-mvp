import Eyebrow from "../components/Eyebrow";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/user";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "entrepreneur", label: "Project owner — I'm raising money for a project" },
  { value: "contributor", label: "Contributor — I want to fund projects" },
  { value: "vendor", label: "Vendor — I want to bid on funded work" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [businessRegistrationInfo, setBusinessRegistrationInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        role,
        businessRegistrationInfo: role === "vendor" ? businessRegistrationInfo : undefined,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl space-y-4">
        <div>
          <Eyebrow>Join AXUM</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold text-black">Create account</h1>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Name</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Password</label>
          <input
            type="password"
            minLength={8}
            className="mt-1 w-full rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">I am a...</label>
          <select
            className="mt-1 w-full rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {role === "vendor" && (
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              Business registration info
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2"
              placeholder="e.g. Registered LLC #12345, city, country"
              value={businessRegistrationInfo}
              onChange={(e) => setBusinessRegistrationInfo(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-neutral-500">
              An admin reviews this before you can bid on any project — see it as "pending" on
              your dashboard until then.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/30 transition-colors text-white py-3 font-semibold disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-neutral-600 text-center">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-orange-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
