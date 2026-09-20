const VIDEO_URL = import.meta.env.VITE_HOW_IT_WORKS_VIDEO_URL as string | undefined;

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
    title: "1. An entrepreneur posts a project",
    body: "Goal amount, location, and a full budget broken into line items — every dollar mapped to what it's actually for.",
  },
  {
    title: "2. Contributors fund it, vendors bid on it",
    body: "Anyone can contribute. Verified vendors bid on individual budget lines to supply the goods or services.",
  },
  {
    title: "3. Funds sit in escrow, released against proof",
    body: "Money is only held once a vendor is awarded a line, and only released once they submit proof of delivery — tracked end to end by a unique ID (UIN).",
  },
];

export default function HowItWorksVideo() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold text-black">How AXUM works</h2>
        <p className="mt-2 text-neutral-600">
          Transparent funding, from pledge to delivery — watch a 90-second walkthrough.
        </p>
      </div>

      {VIDEO_URL ? (
        <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-black">
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
      ) : (
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.title} className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-black mb-2">{s.title}</h3>
              <p className="text-sm text-neutral-600">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
