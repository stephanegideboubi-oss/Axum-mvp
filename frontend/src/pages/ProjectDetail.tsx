import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { contribute as contributeRequest } from "../api/contributions";
import {
  addLineItem,
  deleteLineItem,
  failProject,
  getProject,
  publishProject,
  updateLineItem,
} from "../api/projects";
import DisputePanel from "../components/DisputePanel";
import EscrowPanel from "../components/EscrowPanel";
import LineItemBidding from "../components/LineItemBidding";
import ProjectAnalyticsPanel from "../components/ProjectAnalyticsPanel";
import { useAuth } from "../context/AuthContext";
import { BudgetLineItem, Project } from "../types/project";

const STATUS_LABELS: Record<string, string> = {
  open: "Open for bids",
  bidding: "Receiving bids",
  awarded: "Vendor selected",
  held: "Funds held in escrow",
  proof_submitted: "Proof uploaded",
  released: "Released to vendor",
};

const PROJECT_STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  open: "bg-orange-100 text-orange-800",
  funded: "bg-green-100 text-green-800",
  closed: "bg-neutral-800 text-white",
  failed: "bg-red-100 text-red-700",
};

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnitCost, setEditUnitCost] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [contributionAmount, setContributionAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const [lastUin, setLastUin] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const result = await getProject(id);
      setProject(result.project);
      setLineItems(result.lineItems);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not load this project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddLineItem(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setAddingItem(true);
    setError(null);
    try {
      await addLineItem(id, {
        description,
        category,
        location,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
      });
      setDescription("");
      setCategory("");
      setLocation("");
      setQuantity("1");
      setUnitCost("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not add line item");
    } finally {
      setAddingItem(false);
    }
  }

  function startEdit(li: BudgetLineItem) {
    setEditingId(li.id);
    setEditDescription(li.description);
    setEditCategory(li.category);
    setEditLocation(li.location);
    setEditQuantity(li.quantity);
    setEditUnitCost(li.unit_cost);
  }

  async function handleSaveEdit(e: FormEvent, lineItemId: string) {
    e.preventDefault();
    if (!id) return;
    setSavingEdit(true);
    setError(null);
    try {
      await updateLineItem(id, lineItemId, {
        description: editDescription,
        category: editCategory,
        location: editLocation,
        quantity: Number(editQuantity),
        unitCost: Number(editUnitCost),
      });
      setEditingId(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not update line item");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteLineItem(lineItemId: string) {
    if (!id) return;
    if (!confirm("Remove this budget line item?")) return;
    setDeletingId(lineItemId);
    setError(null);
    try {
      await deleteLineItem(id, lineItemId);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not remove line item");
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePublish() {
    if (!id) return;
    setPublishing(true);
    setError(null);
    try {
      await publishProject(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not publish this project");
    } finally {
      setPublishing(false);
    }
  }

  async function handleContribute(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setContributing(true);
    setError(null);
    try {
      const result = await contributeRequest(id, Number(contributionAmount));
      setLastUin(result.contribution.uin);
      setContributionAmount("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not record contribution");
    } finally {
      setContributing(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!confirm("Cancel this project and refund any contributions?")) return;
    setError(null);
    try {
      await failProject(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not cancel this project");
    }
  }

  if (loading) return <div className="p-8 text-neutral-500">Loading...</div>;
  if (!project) return <div className="p-8 text-red-600">{error ?? "Project not found"}</div>;

  const isOwner = user?.id === project.entrepreneur_id;
  const goalAmount = Number(project.goal_amount);
  const raised = project.raised_amount ?? 0;
  const progressPct = Math.min(100, Math.round((raised / goalAmount) * 100));

  const allocated = lineItems.reduce((sum, li) => sum + Number(li.amount), 0);
  const remainingToAllocate = Math.round((goalAmount - allocated) * 100) / 100;
  const canPublish = lineItems.length > 0 && remainingToAllocate === 0;

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/projects" className="text-sm text-neutral-600 underline">
          &larr; Back to projects
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-black">{project.title}</h1>
              <p className="text-sm text-neutral-500">{project.location}</p>
            </div>
            <span
              className={`text-xs uppercase tracking-wide font-medium px-2 py-1 rounded ${
                PROJECT_STATUS_BADGE[project.status] ?? "bg-neutral-100 text-neutral-700"
              }`}
            >
              {project.status}
            </span>
          </div>
          <p className="mt-4 text-neutral-700 whitespace-pre-wrap">{project.description}</p>

          {project.status !== "draft" && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>{money(raised, project.currency)} raised</span>
                <span>Goal: {money(project.goal_amount, project.currency)}</span>
              </div>
              <div className="mt-1 h-2 bg-neutral-200 rounded overflow-hidden">
                <div className="h-full bg-orange-600" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {isOwner && ["draft", "open"].includes(project.status) && (
            <button
              onClick={handleCancel}
              className="mt-4 text-sm text-red-600 underline"
            >
              Cancel project{project.status === "open" ? " and refund contributors" : ""}
            </button>
          )}

          {lastUin && (
            <p className="mt-6 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
              Contribution recorded. Your tracking number (UIN) is{" "}
              <span className="font-mono font-medium">{lastUin}</span> — save it to check on this
              project any time from the "Track a project" page, even if you're not logged in.
            </p>
          )}

          {user?.role === "contributor" && project.status === "open" && (
            <form onSubmit={handleContribute} className="mt-6 border-t border-neutral-200 pt-6">
              <h3 className="font-medium text-black mb-2">Contribute to this project</h3>
              <p className="text-xs text-neutral-500 mb-3">
                Simulated for this MVP — no real payment is taken, and no real money moves yet.
              </p>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="Amount (USD)"
                  className="flex-1 rounded border border-neutral-300 px-3 py-2"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={contributing}
                  className="rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {contributing ? "Contributing..." : "Contribute"}
                </button>
              </div>
            </form>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-black mb-3">Budget line items</h2>
          {lineItems.length === 0 && (
            <p className="text-sm text-neutral-500">No line items yet.</p>
          )}
          <ul className="space-y-3">
            {lineItems.map((li) =>
              editingId === li.id ? (
                <li key={li.id} className="border border-orange-300 rounded p-4 bg-orange-50">
                  <form
                    onSubmit={(e) => handleSaveEdit(e, li.id)}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="rounded border border-neutral-300 px-3 py-2 col-span-2"
                        placeholder="Description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        required
                      />
                      <input
                        className="rounded border border-neutral-300 px-3 py-2"
                        placeholder="Category"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        required
                      />
                      <input
                        className="rounded border border-neutral-300 px-3 py-2"
                        placeholder="Location"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="rounded border border-neutral-300 px-3 py-2"
                        placeholder="Quantity"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="rounded border border-neutral-300 px-3 py-2"
                        placeholder="Unit cost (USD)"
                        value={editUnitCost}
                        onChange={(e) => setEditUnitCost(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="rounded bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                      >
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li key={li.id} className="border border-neutral-200 rounded p-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-black">{li.description}</span>
                    <span className="text-black">{money(li.amount, project.currency)}</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {li.category} · {li.location} · qty {li.quantity} @{" "}
                    {money(li.unit_cost, project.currency)}
                  </p>
                  {project.status !== "draft" && (
                    <span className="mt-2 inline-block text-xs uppercase tracking-wide font-medium bg-neutral-100 text-neutral-700 px-2 py-1 rounded">
                      {STATUS_LABELS[li.status] ?? li.status}
                      {li.disputed ? " · flagged, disbursement frozen" : ""}
                    </span>
                  )}
                  {isOwner && project.status === "draft" && (
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => startEdit(li)}
                        className="text-xs text-orange-700 underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLineItem(li.id)}
                        disabled={deletingId === li.id}
                        className="text-xs text-red-600 underline disabled:opacity-50"
                      >
                        {deletingId === li.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  )}
                  <LineItemBidding project={project} lineItem={li} onChanged={load} />
                  <EscrowPanel project={project} lineItem={li} onChanged={load} />
                  <DisputePanel project={project} lineItem={li} onChanged={load} />
                </li>
              )
            )}
          </ul>

          {project.status === "draft" && lineItems.length > 0 && (
            <div
              className={`mt-4 rounded border p-3 text-sm flex justify-between ${
                remainingToAllocate === 0
                  ? "border-green-300 bg-green-50 text-green-800"
                  : remainingToAllocate > 0
                  ? "border-orange-300 bg-orange-50 text-orange-800"
                  : "border-red-300 bg-red-50 text-red-700"
              }`}
            >
              <span>Allocated: {money(allocated, project.currency)} of {money(goalAmount, project.currency)}</span>
              <span className="font-medium">
                {remainingToAllocate === 0
                  ? "Fully allocated — ready to publish"
                  : remainingToAllocate > 0
                  ? `${money(remainingToAllocate, project.currency)} remaining to allocate`
                  : `${money(Math.abs(remainingToAllocate), project.currency)} over the goal amount`}
              </span>
            </div>
          )}

          {isOwner && project.status === "draft" && (
            <>
              <form onSubmit={handleAddLineItem} className="mt-6 space-y-3 border-t border-neutral-200 pt-6">
                <h3 className="font-medium text-black">Add a line item</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded border border-neutral-300 px-3 py-2 col-span-2"
                    placeholder="Description (e.g. 500 bricks)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                  <input
                    className="rounded border border-neutral-300 px-3 py-2"
                    placeholder="Category (e.g. Materials)"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  />
                  <input
                    className="rounded border border-neutral-300 px-3 py-2"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="rounded border border-neutral-300 px-3 py-2"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="rounded border border-neutral-300 px-3 py-2"
                    placeholder="Unit cost (USD)"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingItem}
                  className="rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {addingItem ? "Adding..." : "Add line item"}
                </button>
              </form>

              <button
                onClick={handlePublish}
                disabled={publishing || !canPublish}
                className="mt-4 w-full rounded bg-green-700 text-white py-2 font-medium disabled:opacity-50"
              >
                {publishing
                  ? "Publishing..."
                  : lineItems.length === 0
                  ? "Add at least one line item to publish"
                  : !canPublish
                  ? "Budget must add up to the funding goal before publishing"
                  : "Publish project"}
              </button>
            </>
          )}
        </div>

        {isOwner && project.status !== "draft" && (
          <ProjectAnalyticsPanel projectId={project.id} currency={project.currency} />
        )}
      </div>
    </div>
  );
}
