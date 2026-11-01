import Eyebrow from "../components/Eyebrow";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl space-y-4">
        <div>
          <Eyebrow>Welcome back</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold text-black">Log in</h1>
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
            className="mt-1 w-full rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/30 transition-colors text-white py-3 font-semibold disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-neutral-600 text-center">
          Need an account?{" "}
          <Link to="/register" className="font-medium text-orange-600 hover:underline">
            Register
          </Link>
        </p>
        <p className="text-sm text-neutral-600 text-center">
          Already contributed?{" "}
          <Link to="/track" className="font-medium text-orange-600 hover:underline">
            Track your project with your UIN
          </Link>
        </p>
      </form>
    </div>
  );
}
