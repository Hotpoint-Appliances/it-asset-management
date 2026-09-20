// Loads demo data for exercising the dashboard and reports (phase 6). Run via `npm run seed:demo`.
// Re-runnable: it first deletes every asset whose tag starts with `DEMO-` (their audit,
// maintenance and disposal rows cascade), then recreates them, so real assets are never touched.
// Uses the categories / locations / departments / conditions / statuses already in the database
// (run `npm run seed:admin` and the schema first) plus two demo vendors it creates if missing.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.split("#")[0].trim();
    if (value && !process.env[key]) process.env[key] = value;
  }
}

interface DemoAsset {
  tag: string;
  name: string;
  category: number; // index into the categories list (wraps)
  department: number; // index into departments (wraps)
  location: number;
  status: string;
  condition: string;
  owner: string | "user"; // "user" = assign to the first viewer/system user
  purchaseDaysAgo: number | null;
  cost: number | null;
  warrantyInDays: number | null; // relative to today; negative = already expired
  depreciation: "straight_line" | null;
  lifeMonths: number | null;
  salvage: number | null;
  vendor: number | null; // index into the demo vendors
}

const ASSETS: DemoAsset[] = [
  {
    tag: "DEMO-001",
    name: "Dell Latitude 5440",
    category: 0,
    department: 0,
    location: 0,
    status: "active",
    condition: "good",
    owner: "Amina Otieno",
    purchaseDaysAgo: 400,
    cost: 145000,
    warrantyInDays: 12,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 15000,
    vendor: 0,
  },
  {
    tag: "DEMO-002",
    name: "HP EliteBook 840",
    category: 0,
    department: 1,
    location: 1,
    status: "active",
    condition: "good",
    owner: "user",
    purchaseDaysAgo: 200,
    cost: 132000,
    warrantyInDays: 28,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 12000,
    vendor: 0,
  },
  {
    tag: "DEMO-003",
    name: "Lenovo ThinkCentre M70",
    category: 1,
    department: 2,
    location: 2,
    status: "active",
    condition: "good",
    owner: "Peter Kamau",
    purchaseDaysAgo: 900,
    cost: 98000,
    warrantyInDays: 47,
    depreciation: "straight_line",
    lifeMonths: 48,
    salvage: 8000,
    vendor: 1,
  },
  {
    tag: "DEMO-004",
    name: "Dell OptiPlex 7010",
    category: 1,
    department: 3,
    location: 3,
    status: "active",
    condition: "bad",
    owner: "Grace Wanjiru",
    purchaseDaysAgo: 1300,
    cost: 87000,
    warrantyInDays: 82,
    depreciation: "straight_line",
    lifeMonths: 48,
    salvage: 7000,
    vendor: 1,
  },
  {
    tag: "DEMO-005",
    name: "MacBook Air M2",
    category: 0,
    department: 3,
    location: 4,
    status: "active",
    condition: "good",
    owner: "Brian Mutua",
    purchaseDaysAgo: 120,
    cost: 189000,
    warrantyInDays: 240,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 20000,
    vendor: 0,
  },
  {
    tag: "DEMO-006",
    name: "Lenovo ThinkPad T14",
    category: 0,
    department: 0,
    location: 0,
    status: "in_repair",
    condition: "bad",
    owner: "Amina Otieno",
    purchaseDaysAgo: 700,
    cost: 128000,
    warrantyInDays: -30,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 10000,
    vendor: 0,
  },
  {
    tag: "DEMO-007",
    name: "HP ProDesk 400",
    category: 1,
    department: 1,
    location: 1,
    status: "in_repair",
    condition: "worse",
    owner: "Faith Njeri",
    purchaseDaysAgo: 1500,
    cost: 76000,
    warrantyInDays: null,
    depreciation: "straight_line",
    lifeMonths: 48,
    salvage: 5000,
    vendor: 1,
  },
  {
    tag: "DEMO-008",
    name: "Dell XPS 13 (spare)",
    category: 0,
    department: 0,
    location: 2,
    status: "in_storage",
    condition: "good",
    owner: "IT Store",
    purchaseDaysAgo: 60,
    cost: 175000,
    warrantyInDays: 300,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 18000,
    vendor: 0,
  },
  {
    tag: "DEMO-009",
    name: "Acer Aspire 5",
    category: 0,
    department: 2,
    location: 3,
    status: "lost",
    condition: "bad",
    owner: "Kevin Omondi",
    purchaseDaysAgo: 800,
    cost: 68000,
    warrantyInDays: null,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 5000,
    vendor: null,
  },
  {
    tag: "DEMO-010",
    name: "HP Z2 Workstation",
    category: 1,
    department: 0,
    location: 0,
    status: "active",
    condition: "good",
    owner: "Ian Mwangi",
    purchaseDaysAgo: null,
    cost: null,
    warrantyInDays: 90,
    depreciation: "straight_line",
    lifeMonths: null,
    salvage: null,
    vendor: 1,
  }, // missing depreciation inputs
  {
    tag: "DEMO-011",
    name: "Lenovo IdeaPad 3 (no depreciation)",
    category: 0,
    department: 3,
    location: 4,
    status: "active",
    condition: "good",
    owner: "Sharon Achieng",
    purchaseDaysAgo: 30,
    cost: 54000,
    warrantyInDays: 700,
    depreciation: null,
    lifeMonths: null,
    salvage: null,
    vendor: null,
  },
  {
    tag: "DEMO-012",
    name: "Dell Latitude 7420 (retired)",
    category: 0,
    department: 1,
    location: 1,
    status: "disposed",
    condition: "worse",
    owner: "Finance Pool",
    purchaseDaysAgo: 1700,
    cost: 120000,
    warrantyInDays: -900,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 10000,
    vendor: 0,
  },
  {
    tag: "DEMO-013",
    name: "HP ProBook 450 (sold)",
    category: 0,
    department: 2,
    location: 2,
    status: "disposed",
    condition: "bad",
    owner: "Operations Pool",
    purchaseDaysAgo: 1900,
    cost: 95000,
    warrantyInDays: -1100,
    depreciation: "straight_line",
    lifeMonths: 36,
    salvage: 8000,
    vendor: 0,
  },
  {
    tag: "DEMO-014",
    name: "Dell OptiPlex 3000",
    category: 1,
    department: 2,
    location: 3,
    status: "active",
    condition: "good",
    owner: "Diana Chebet",
    purchaseDaysAgo: 365,
    cost: 82000,
    warrantyInDays: 5,
    depreciation: "straight_line",
    lifeMonths: 48,
    salvage: 6000,
    vendor: 1,
  },
];

async function main() {
  loadEnvLocal();
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const admin = (
      await client.query(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin' ORDER BY u.created_at LIMIT 1`,
      )
    ).rows[0];
    if (!admin)
      throw new Error("No admin user found, run `npm run seed:admin` first.");
    const sysUser = (
      await client.query(
        `SELECT id, full_name FROM users WHERE id <> $1 ORDER BY created_at LIMIT 1`,
        [admin.id],
      )
    ).rows[0];

    const list = async (table: string) =>
      (await client.query(`SELECT id, name FROM ${table} ORDER BY id`))
        .rows as { id: number; name: string }[];
    const categories = await list("categories");
    const departments = await list("departments");
    const locations = await list("locations");
    const conditions = await list("asset_conditions");
    const statuses = await list("asset_statuses");
    if (!categories.length || !departments.length || !locations.length) {
      throw new Error(
        "Categories, departments and locations must exist first.",
      );
    }
    const byName = (rows: { id: number; name: string }[], name: string) => {
      const row = rows.find((r) => r.name === name);
      if (!row) throw new Error(`Missing lookup value "${name}"`);
      return row.id;
    };

    const vendorIds: number[] = [];
    for (const name of [
      "Demo Vendor: Compu-Tech Ltd",
      "Demo Vendor: Office Hardware Kenya",
    ]) {
      const existing = await client.query(
        `SELECT id FROM vendors WHERE name = $1`,
        [name],
      );
      vendorIds.push(
        existing.rows[0]?.id ??
          (
            await client.query(
              `INSERT INTO vendors (name) VALUES ($1) RETURNING id`,
              [name],
            )
          ).rows[0].id,
      );
    }

    const removed = await client.query(
      `DELETE FROM assets WHERE asset_tag LIKE 'DEMO-%'`,
    );
    console.log(`Removed ${removed.rowCount} previous demo asset(s).`);

    const ids: Record<string, string> = {};
    for (const a of ASSETS) {
      const assignedUser = a.owner === "user" && sysUser ? sysUser.id : null;
      const ownerName = assignedUser
        ? null
        : a.owner === "user"
          ? "Demo Owner"
          : a.owner;
      const row = (
        await client.query(
          `INSERT INTO assets (asset_tag, name, category_id, location_id, department_id, assigned_user_id, owner_name,
             condition_id, status_id, vendor_id, purchase_date, purchase_cost, warranty_expiry, depreciation_method,
             useful_life_months, salvage_value, created_by, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
             CASE WHEN $11::int IS NULL THEN NULL ELSE CURRENT_DATE - $11::int END, $12,
             CASE WHEN $13::int IS NULL THEN NULL ELSE CURRENT_DATE + $13::int END, $14,$15,$16,$17,
             now() - interval '45 days')
           RETURNING id`,
          [
            a.tag,
            a.name,
            categories[a.category % categories.length].id,
            locations[a.location % locations.length].id,
            departments[a.department % departments.length].id,
            assignedUser,
            ownerName,
            byName(conditions, a.condition),
            byName(statuses, a.status),
            a.vendor == null ? null : vendorIds[a.vendor],
            a.purchaseDaysAgo,
            a.cost,
            a.warrantyInDays,
            a.depreciation,
            a.lifeMonths,
            a.salvage,
            admin.id,
          ],
        )
      ).rows[0];
      ids[a.tag] = row.id;
      await client.query(
        `INSERT INTO asset_audit_log (asset_id, action_type, performed_by, performed_at)
         VALUES ($1, 'created', $2, now() - interval '45 days')`,
        [row.id, admin.id],
      );
    }

    const audit = (
      tag: string,
      action: string,
      field: string | null,
      oldV: string | null,
      newV: string | null,
      note: string | null,
      ago: string,
      by = admin.id,
    ) =>
      client.query(
        `INSERT INTO asset_audit_log (asset_id, action_type, field_name, old_value, new_value, note, performed_by, performed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() - $8::interval)`,
        [ids[tag], action, field, oldV, newV, note, by, ago],
      );

    // Repairs: status_change -> in_repair plus an in_progress maintenance record each.
    const activeId = String(byName(statuses, "active"));
    const inRepairId = String(byName(statuses, "in_repair"));
    for (const [tag, ago, vendor, type] of [
      ["DEMO-006", "3 days", 0, "repair"],
      ["DEMO-007", "9 hours", 1, "service"],
    ] as const) {
      await audit(
        tag,
        "status_change",
        "status_id",
        activeId,
        inRepairId,
        null,
        ago,
      );
      await client.query(
        `INSERT INTO asset_maintenance (asset_id, maintenance_type, vendor_id, scheduled_date, status, notes, created_by, updated_at)
         VALUES ($1,$2,$3, CURRENT_DATE - 3, 'in_progress', 'Demo record: awaiting parts', $4, now() - $5::interval)`,
        [ids[tag], type, vendorIds[vendor], admin.id, ago],
      );
    }
    // A finished maintenance record and a scheduled one, for the asset detail tab.
    await client.query(
      `INSERT INTO asset_maintenance (asset_id, maintenance_type, vendor_id, scheduled_date, completed_date, cost, status, notes, created_by)
       VALUES ($1,'service',$2, CURRENT_DATE - 40, CURRENT_DATE - 38, 4500, 'completed', 'Demo record: annual service', $3)`,
      [ids["DEMO-003"], vendorIds[1], admin.id],
    );
    await client.query(
      `INSERT INTO asset_maintenance (asset_id, maintenance_type, scheduled_date, status, notes, created_by)
       VALUES ($1,'inspection', CURRENT_DATE + 14, 'scheduled', 'Demo record: quarterly inspection', $2)`,
      [ids["DEMO-004"], admin.id],
    );

    // A transfer and an owner change to a *system user* (exercises the timeline's name resolution).
    await audit(
      "DEMO-001",
      "location_change",
      "location_id",
      String(locations[1 % locations.length].id),
      String(locations[0].id),
      null,
      "6 days",
    );
    if (sysUser) {
      await audit(
        "DEMO-002",
        "owner_change",
        "assigned_user_id",
        null,
        sysUser.id,
        null,
        "2 days",
      );
    }
    await audit(
      "DEMO-004",
      "condition_change",
      "condition_id",
      String(byName(conditions, "good")),
      String(byName(conditions, "bad")),
      null,
      "5 hours",
    );
    await audit(
      "DEMO-009",
      "status_change",
      "status_id",
      activeId,
      String(byName(statuses, "lost")),
      "Demo: last seen at the airport",
      "1 day",
    );

    // Disposals: one sold with a value, one scrapped, each with the disposed status change.
    const disposedId = String(byName(statuses, "disposed"));
    for (const [tag, method, value, daysAgo, notes] of [
      ["DEMO-012", "scrapped", null, 20, "Demo: beyond economical repair"],
      ["DEMO-013", "sold", 18000, 10, "Demo: sold to staff member"],
    ] as const) {
      await client.query(
        `INSERT INTO asset_disposals (asset_id, disposal_date, disposal_method, disposal_value, approved_by, notes)
         VALUES ($1, CURRENT_DATE - $2::int, $3, $4, $5, $6)`,
        [ids[tag], daysAgo, method, value, admin.id, notes],
      );
      await audit(
        tag,
        "disposed",
        "status_id",
        activeId,
        disposedId,
        notes,
        `${daysAgo} days`,
      );
    }

    await client.query("COMMIT");
    console.log(
      `Seeded ${ASSETS.length} demo assets (DEMO-001 to DEMO-${String(ASSETS.length).padStart(3, "0")}).`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
