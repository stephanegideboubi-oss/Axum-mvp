import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";

export default function CreateProject() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const project = await createProject({
        title,
        description,
        location,
        goalAmount: Number(goalAmount),
      });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg mx-auto bg-white p-8 rounded-lg shadow space-y-4"
      >
        <h1 className="text-2xl font-semibold text-slate-900">Start a new project</h1>
        <p className="text-sm text-slate-500">
          After this, you'll add your budget line by line before publishing.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Location</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            placeholder="City, country"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Funding goal (USD)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 text-white py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Continue to budget"}
        </button>
      </form>
    </div>
  );
}
