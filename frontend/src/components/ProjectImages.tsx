import { FormEvent, useState } from "react";
import { addProjectImage, deleteProjectImage } from "../api/projects";
import { ProjectImage } from "../types/project";

export default function ProjectImages({
  projectId,
  images,
  isOwner,
  onChanged,
}: {
  projectId: string;
  images: ProjectImage[];
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner && images.length === 0) return null;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await addProjectImage(projectId, { imageUrl, caption: caption || undefined });
      setImageUrl("");
      setCaption("");
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not add this photo");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(imageId: string) {
    setDeletingId(imageId);
    setError(null);
    try {
      await deleteProjectImage(projectId, imageId);
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not remove this photo");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-black mb-4">Photos</h2>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {images.length === 0 && (
        <p className="text-sm text-neutral-500 mb-3">No photos added yet.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        {images.map((img) => (
          <div key={img.id}>
            <img
              src={img.image_url}
              alt={img.caption ?? "Project photo"}
              className="w-full h-32 object-cover rounded border border-neutral-200"
            />
            {img.caption && <p className="mt-1 text-xs text-neutral-500">{img.caption}</p>}
            {isOwner && (
              <button
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="mt-1 text-xs text-red-600 underline disabled:opacity-50"
              >
                {deletingId === img.id ? "Removing..." : "Remove"}
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={handleAdd} className="space-y-2 border-t border-neutral-200 pt-4">
          <input
            required
            placeholder="Image URL"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <input
            placeholder="Caption (optional)"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add photo"}
          </button>
        </form>
      )}
    </div>
  );
}
