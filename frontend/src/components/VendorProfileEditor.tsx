import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { addPortfolioImage, deletePortfolioImage, getVendorProfile, updateMyVendorProfile } from "../api/vendors";
import { useAuth } from "../context/AuthContext";
import { useFileUpload } from "../hooks/useFileUpload";
import { VendorPortfolioImage } from "../types/vendor";

export default function VendorProfileEditor() {
  const { user } = useAuth();
  const [bio, setBio] = useState("");
  const [portfolio, setPortfolio] = useState<VendorPortfolioImage[]>([]);
  const [savingBio, setSavingBio] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { upload, uploading, error: uploadError, setError: setUploadError } = useFileUpload();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!user) return;
    try {
      const data = await getVendorProfile(user.id);
      setBio(data.vendor.bio ?? "");
      setPortfolio(data.portfolio);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not load your profile");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSaveBio(e: FormEvent) {
    e.preventDefault();
    setSavingBio(true);
    setBioSaved(false);
    setError(null);
    try {
      await updateMyVendorProfile({ bio });
      setBioSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not save your profile");
    } finally {
      setSavingBio(false);
    }
  }

  async function handleAddImage(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setAddingImage(true);
    setError(null);
    try {
      const imageUrl = await upload(file);
      await addPortfolioImage({ imageUrl, caption: caption || undefined });
      setFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? uploadError ?? "Could not add this image");
    } finally {
      setAddingImage(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    setDeletingId(imageId);
    setError(null);
    try {
      await deletePortfolioImage(imageId);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not remove this image");
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) return null;

  return (
    <div className="bg-white rounded-lg shadow p-8 space-y-6">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-black">Your public profile</h3>
        <Link to={`/vendors/${user.id}`} className="text-sm text-orange-700 underline">
          View public profile
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSaveBio} className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Bio — describe the goods or services you provide
        </label>
        <textarea
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="e.g. Licensed electrical contractor specializing in solar installs across Kisumu County..."
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setBioSaved(false);
          }}
        />
        <button
          type="submit"
          disabled={savingBio}
          className="rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {savingBio ? "Saving..." : "Save bio"}
        </button>
        {bioSaved && <span className="ml-3 text-sm text-green-700">Saved.</span>}
      </form>

      <div className="border-t border-neutral-200 pt-6">
        <h4 className="font-medium text-black mb-3">Portfolio — showcase your work</h4>
        {portfolio.length === 0 && (
          <p className="text-sm text-neutral-500 mb-3">
            No photos yet — upload a photo of past work below.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          {portfolio.map((img) => (
            <div key={img.id} className="relative">
              <img
                src={img.image_url}
                alt={img.caption ?? "Portfolio item"}
                className="w-full h-32 object-cover rounded border border-neutral-200"
              />
              {img.caption && <p className="mt-1 text-xs text-neutral-500">{img.caption}</p>}
              <button
                onClick={() => handleDeleteImage(img.id)}
                disabled={deletingId === img.id}
                className="mt-1 text-xs text-red-600 underline disabled:opacity-50"
              >
                {deletingId === img.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>

        {(uploadError) && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}
        <form onSubmit={handleAddImage} className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            required
            className="w-full text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setUploadError(null);
            }}
          />
          <input
            placeholder="Caption (optional)"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            type="submit"
            disabled={addingImage || uploading || !file}
            className="rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {uploading ? "Uploading..." : addingImage ? "Adding..." : "Add photo"}
          </button>
        </form>
      </div>
    </div>
  );
}
