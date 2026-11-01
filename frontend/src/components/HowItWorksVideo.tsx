import Eyebrow from "./Eyebrow";

// Falls back to the bundled explainer video; override with an env var to swap in a hosted link instead.
const VIDEO_URL = (import.meta.env.VITE_HOW_IT_WORKS_VIDEO_URL as string | undefined) || "/how-it-works.mp4";

function isEmbeddable(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function toEmbedUrl(url: string) {
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

const STEPS = [
  {
    title: "A project owner posts a project",
    body: "Goal amount, location, and a full budget broken into line items — every dollar mapped to what it's actually for.",
  },
  {
    title: "Contributors fund it, vendors bid on it",
    body: "Anyone can contribute. Verified vendors bid on individual budget lines to supply the goods or services.",
  },
  {
    title: "Funds sit in escrow, released against proof",
    body: "Money is only held once a vendor is awarded a line, and only released once they submit proof of delivery — tracked end to end by a unique ID (UIN).",
  },
];

export default function HowItWorksVideo() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <Eyebrow center>How it works</Eyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-black">
          Transparent funding, from pledge to delivery
        </h2>
        <p className="mt-3 text-neutral-600 max-w-xl mx-auto">
          No single person can move the money. Watch the 90-second walkthrough.
        </p>
      </div>

      {VIDEO_URL && (
        <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/10 bg-black">
          {isEmbeddable(VIDEO_URL) ? (
            <iframe
              src={toEmbedUrl(VIDEO_URL)}
              title="How AXUM works"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={VIDEO_URL} controls className="w-full h-full" />
          )}
        </div>
      )}

      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {STEPS.map((s, i) => {
          const featured = i === 0;
          return (
            <div
              key={s.title}
              className={`relative rounded-3xl p-7 transition duration-300 hover:-translate-y-1 ${
                featured
                  ? "bg-gradient-to-br from-neutral-800 to-black text-white shadow-xl"
                  : "bg-white border border-neutral-200 shadow-sm hover:shadow-xl"
              }`}
            >
              <span
                className={`absolute top-6 right-7 text-xs font-bold ${
                  featured ? "text-orange-400" : "text-neutral-400"
                }`}
              >
                0{i + 1}
              </span>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg font-bold ${
                  featured ? "bg-white/10 text-orange-400" : "bg-orange-50 text-orange-600"
                }`}
              >
                {i + 1}
              </div>
              <h3 className={`mt-5 text-lg font-semibold ${featured ? "text-white" : "text-black"}`}>
                {s.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${featured ? "text-neutral-300" : "text-neutral-600"}`}>
                {s.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
