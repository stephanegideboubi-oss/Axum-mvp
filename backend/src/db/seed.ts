/**
 * One-time demo data seed. Not part of the app's runtime code path — run manually
 * with `npm run seed` before a demo. Safe to re-run: it aborts if demo data already exists.
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { pool } from "../config/db";
import { appendAuditLog } from "../services/auditLog";

const DEMO_PASSWORD = "Demo1234!";

function uin() {
  return `AXM-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

interface SeedUser {
  key: string;
  email: string;
  name: string;
  role: "entrepreneur" | "contributor" | "vendor" | "admin";
  businessRegistrationInfo?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  bio?: string;
}

const USERS: SeedUser[] = [
  { key: "admin", email: "admin@axum.demo", name: "Admin", role: "admin" },
  { key: "entrepreneur1", email: "entrepreneur1@axum.demo", name: "Amara Okafor", role: "entrepreneur" },
  { key: "entrepreneur2", email: "entrepreneur2@axum.demo", name: "Ben Carter", role: "entrepreneur" },
  { key: "contributor1", email: "contributor1@axum.demo", name: "Diane Reyes", role: "contributor" },
  { key: "contributor2", email: "contributor2@axum.demo", name: "Marcus Webb", role: "contributor" },
  {
    key: "vendor1",
    email: "vendor1@axum.demo",
    name: "BuildRight Contractors",
    role: "vendor",
    businessRegistrationInfo: "Registered LLC #48213, Nairobi, Kenya",
    verificationStatus: "verified",
    bio: "General contractor specializing in medical equipment procurement and off-grid solar installations across Kenya. 12 years in the field, licensed and insured.",
  },
  {
    key: "vendor2",
    email: "vendor2@axum.demo",
    name: "Apex Site Services",
    role: "vendor",
    businessRegistrationInfo: "Registered LLC #59021, Nairobi, Kenya",
    verificationStatus: "pending",
  },
];

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [USERS[0].email]);
    if (existing.rows.length > 0) {
      console.log("Demo data already seeded (admin@axum.demo exists). Aborting.");
      return;
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const userIds: Record<string, string> = {};

    for (const u of USERS) {
      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, role, business_registration_info, verification_status, bio)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          u.email,
          passwordHash,
          u.name,
          u.role,
          u.businessRegistrationInfo ?? null,
          u.verificationStatus ?? null,
          u.bio ?? null,
        ]
      );
      userIds[u.key] = result.rows[0].id;
      await appendAuditLog(client, {
        entityType: "user",
        entityId: userIds[u.key],
        action: "user.registered",
        actorId: userIds[u.key],
        payload: { email: u.email, role: u.role, seed: true },
      });
    }

    await client.query(
      `INSERT INTO vendor_portfolio_images (vendor_id, image_url, caption)
       VALUES ($1, $2, $3)`,
      [
        userIds.vendor1,
        "https://picsum.photos/seed/axum-solar/600/400",
        "Off-grid solar array installed at a rural health clinic",
      ]
    );

    // --- Project A: fully funded, mid-flow — one line held & proof uploaded
    // (ready to release live), one line awarded but not yet held, one still open for bids.
    const projectA = await client.query(
      `INSERT INTO projects (entrepreneur_id, title, description, location, goal_amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, 'USD', 'funded') RETURNING *`,
      [
        userIds.entrepreneur1,
        "Community Health Clinic — Rural Kenya",
        "Building a small outpatient clinic to serve four surrounding villages, including equipment, power, and staff training.",
        "Kisumu County, Kenya",
        28000,
      ]
    );
    const projA = projectA.rows[0];
    await appendAuditLog(client, {
      entityType: "project",
      entityId: projA.id,
      action: "project.created",
      actorId: userIds.entrepreneur1,
      payload: { title: projA.title, goalAmount: projA.goal_amount, seed: true },
    });

    const lineItemsA = [
      { description: "Medical equipment procurement", category: "Equipment", location: "Kisumu County, Kenya", quantity: 1, unitCost: 15000 },
      { description: "Solar power system", category: "Infrastructure", location: "Kisumu County, Kenya", quantity: 1, unitCost: 8000 },
      { description: "Staff training program", category: "Services", location: "Kisumu County, Kenya", quantity: 1, unitCost: 5000 },
    ];
    const lineIds: string[] = [];
    for (const li of lineItemsA) {
      const r = await client.query(
        `INSERT INTO budget_line_items (project_id, description, category, location, quantity, unit_cost, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [projA.id, li.description, li.category, li.location, li.quantity, li.unitCost, li.quantity * li.unitCost]
      );
      lineIds.push(r.rows[0].id);
    }
    const [equipmentId, solarId, trainingId] = lineIds;

    // Contributions covering the full goal (simulated — no real payment gateway).
    for (const c of [
      { key: "contributor1", amount: 15000 },
      { key: "contributor2", amount: 13000 },
    ]) {
      const r = await client.query(
        `INSERT INTO contributions (project_id, contributor_id, amount, currency, uin, status)
         VALUES ($1, $2, $3, 'USD', $4, 'recorded') RETURNING *`,
        [projA.id, userIds[c.key], c.amount, uin()]
      );
      await appendAuditLog(client, {
        entityType: "contribution",
        entityId: r.rows[0].id,
        action: "contribution.recorded",
        actorId: userIds[c.key],
        payload: { projectId: projA.id, amount: c.amount, seed: true, simulated: true },
      });
    }

    // Line 1 (equipment): vendor selected, funds held, proof uploaded — ready to release live.
    const bid1 = await client.query(
      `INSERT INTO bids (budget_line_item_id, vendor_id, amount, notes, status)
       VALUES ($1, $2, 14500, 'We can source and install all equipment within 3 weeks, including a 1-year warranty.', 'selected')
       RETURNING *`,
      [equipmentId, userIds.vendor1]
    );
    await client.query(
      `INSERT INTO bids (budget_line_item_id, vendor_id, amount, notes, status)
       VALUES ($1, $2, 14800, 'Full equipment package with 2-year warranty and remote diagnostics support.', 'rejected')`,
      [equipmentId, userIds.vendor2]
    );
    await client.query(`UPDATE budget_line_items SET status = 'proof_submitted', updated_at = now() WHERE id = $1`, [
      equipmentId,
    ]);
    const disbursement1 = await client.query(
      `INSERT INTO disbursements (budget_line_item_id, vendor_id, amount, status, held_by)
       VALUES ($1, $2, 14500, 'held', $3) RETURNING *`,
      [equipmentId, userIds.vendor1, userIds.admin]
    );
    await client.query(
      `INSERT INTO proof_documents (budget_line_item_id, uploaded_by, type, file_url, description)
       VALUES ($1, $2, 'invoice', 'https://example.com/demo-proof/equipment-invoice.pdf', 'Invoice + delivery photos for medical equipment procurement')`,
      [equipmentId, userIds.vendor1]
    );
    await appendAuditLog(client, {
      entityType: "disbursement",
      entityId: disbursement1.rows[0].id,
      action: "disbursement.held",
      actorId: userIds.admin,
      payload: { lineItemId: equipmentId, seed: true },
    });

    // Line 2 (solar): vendor selected, admin hasn't held funds yet — demo can hold live.
    await client.query(
      `INSERT INTO bids (budget_line_item_id, vendor_id, amount, notes, status)
       VALUES ($1, $2, 7800, 'Turnkey solar + battery install, sized for 24/7 clinic power.', 'selected')`,
      [solarId, userIds.vendor1]
    );
    await client.query(
      `INSERT INTO bids (budget_line_item_id, vendor_id, amount, notes, status)
       VALUES ($1, $2, 7950, 'Solar install with 5-year maintenance plan included.', 'rejected')`,
      [solarId, userIds.vendor2]
    );
    await client.query(`UPDATE budget_line_items SET status = 'awarded', updated_at = now() WHERE id = $1`, [solarId]);

    // Line 3 (training): still open for bidding.
    await client.query(`UPDATE budget_line_items SET status = 'open' WHERE id = $1`, [trainingId]);

    // --- Project B: fresh, still collecting contributions, one line item.
    const projectB = await client.query(
      `INSERT INTO projects (entrepreneur_id, title, description, location, goal_amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, 'USD', 'open') RETURNING *`,
      [
        userIds.entrepreneur2,
        "Local Bakery Expansion",
        "Expanding a neighborhood bakery with a second oven and a renovated storefront to handle growing demand.",
        "Austin, Texas",
        10000,
      ]
    );
    const projB = projectB.rows[0];
    await appendAuditLog(client, {
      entityType: "project",
      entityId: projB.id,
      action: "project.created",
      actorId: userIds.entrepreneur2,
      payload: { title: projB.title, goalAmount: projB.goal_amount, seed: true },
    });

    for (const li of [
      { description: "Commercial oven upgrade", category: "Equipment", location: "Austin, Texas", quantity: 1, unitCost: 6000 },
      { description: "Storefront renovation", category: "Construction", location: "Austin, Texas", quantity: 1, unitCost: 4000 },
    ]) {
      await client.query(
        `INSERT INTO budget_line_items (project_id, description, category, location, quantity, unit_cost, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [projB.id, li.description, li.category, li.location, li.quantity, li.unitCost, li.quantity * li.unitCost]
      );
    }
    await client.query(
      `INSERT INTO contributions (project_id, contributor_id, amount, currency, uin, status)
       VALUES ($1, $2, 2000, 'USD', $3, 'recorded')`,
      [projB.id, userIds.contributor1, uin()]
    );

    await client.query("COMMIT");

    console.log("Demo data seeded.\n");
    console.log("All demo accounts share the password: " + DEMO_PASSWORD + "\n");
    console.table(
      USERS.map((u) => ({ role: u.role, email: u.email, verification: u.verificationStatus ?? "n/a" }))
    );
    console.log(`\nProject A (funded, mid-flow): ${projA.id}`);
    console.log(`  - Equipment line (held + proof uploaded, ready to release live): ${equipmentId}`);
    console.log(`  - Solar line (awarded, ready to hold funds live): ${solarId}`);
    console.log(`  - Training line (still open for bidding): ${trainingId}`);
    console.log(`Project B (fresh, still collecting contributions): ${projB.id}`);
    console.log(`\nVendor pending verification (approve live from /admin): vendor2@axum.demo`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
