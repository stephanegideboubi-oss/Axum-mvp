export default function AboutUs() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <section className="bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">
            AX<span className="text-orange-500">UM</span>
          </h1>
          <p className="mt-4 text-neutral-300">
            We built AXUM because crowdfunding shouldn't stop at the pledge.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 space-y-8 text-neutral-700">
        <div>
          <h2 className="text-xl font-semibold text-black mb-2">Our mission</h2>
          <p>
            Too many crowdfunded projects raise money with good intentions and no way for
            contributors to see where it actually goes. AXUM connects project owners,
            contributors, and verified vendors around a shared, line-by-line budget — so every
            dollar is tracked from pledge to delivery, not just promised.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-black mb-2">How we're different</h2>
          <p>
            Funds are held in escrow and only released once a vendor submits proof of delivery.
            Every project gets a unique tracking ID, so anyone — contributor or not — can look up
            exactly where the money stands, line by line, with no login required.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-black mb-2">Get in touch</h2>
          <p>
            We're just getting started. If you'd like to partner with us, fund a project, or bid
            as a vendor, reach out through our social channels below or start exploring the
            platform.
          </p>
        </div>
      </section>
    </div>
  );
}
