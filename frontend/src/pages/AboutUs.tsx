import Eyebrow from "../components/Eyebrow";

const SECTIONS = [
  {
    label: "Our mission",
    title: "Every dollar tracked, pledge to delivery",
    body: "Too many crowdfunded projects raise money with good intentions and no way for contributors to see where it actually goes. AXUM connects project owners, contributors, and verified vendors around a shared, line-by-line budget — so every dollar is tracked from pledge to delivery, not just promised.",
  },
  {
    label: "How we're different",
    title: "Released against proof, never on trust",
    body: "Funds are held in escrow and only released once a vendor submits proof of delivery. Every project gets a unique tracking ID, so anyone — contributor or not — can look up exactly where the money stands, line by line, with no login required.",
  },
  {
    label: "Get in touch",
    title: "We're just getting started",
    body: "If you'd like to partner with us, fund a project, or bid as a vendor, reach out through our social channels below or start exploring the platform.",
  },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <section className="relative overflow-hidden bg-black text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(50% 90% at 50% 120%, rgba(234,88,12,0.35), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <Eyebrow center className="text-orange-400">
            About us
          </Eyebrow>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold">
            AX<span className="text-orange-500">UM</span>
          </h1>
          <p className="mt-5 text-lg text-neutral-300">
            We built AXUM because crowdfunding shouldn't stop at the pledge.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-6">
        {SECTIONS.map((s) => (
          <div
            key={s.label}
            className="rounded-3xl border border-neutral-200 bg-white p-7 sm:p-8 shadow-sm"
          >
            <Eyebrow>{s.label}</Eyebrow>
            <h2 className="mt-3 text-2xl font-bold text-black">{s.title}</h2>
            <p className="mt-3 leading-relaxed text-neutral-700">{s.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
