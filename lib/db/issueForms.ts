import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./query";
import { toDateOnlyString, toIsoString } from "./dates";
import {
  DISCLAIMER,
  LINK_TTL_DAYS,
  REMINDER_DAYS,
  RESEND_COOLDOWN_SECONDS,
  UNRECORDED_SPECIFICATIONS,
  VOIDING_STATUSES,
  canIssueForm,
  deriveMakeAndModel,
  formatIssueFormNumber,
  issuableStatusMessage,
  normalizeName,
} from "@/lib/issueForms/rules";
import { formatLookupName, statusKey } from "@/lib/badgeVariants";
import { todayIso } from "@/lib/format";
import type { Asset } from "@/types/asset";
import type {
  Hod,
  IssueForm,
  IssueFormAccessory,
  IssueFormInput,
  IssueFormPrefill,
} from "@/types/issueForm";

// Equipment issue forms. The rules agreed for them:
//  - Admins and asset managers trigger them, for active or reserved assets only.
//  - One open (pending or disputed) form per asset. A pending form can be re-sent; changing its
//    details means voiding it and triggering a new one.
//  - A form that repeats what the same person already acknowledged needs a stated reason.
//  - A pending or disputed form is voided if the owner, department or condition changes, or the
//    asset is disposed, lost, stolen or deleted. That happens in the same transaction as the change.
//  - Everything printed is frozen at trigger time. Acknowledged forms keep their evidence forever.

/** A request that breaks one of the rules above; `status` is the HTTP status for the route. */
export class IssueFormError extends Error {
  constructor(
    message: string,
    readonly status: number = 409,
  ) {
    super(message);
    this.name = "IssueFormError";
  }
}

// ---------------------------------------------------------------------------------------------
// Link tokens
// ---------------------------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Derived rather than random so the daily reminder can link to the form again without the raw
 * token ever being stored: a leaked database alone can't produce a working link. */
function deriveToken(formId: string, nonce: string): string {
  return createHmac("sha256", process.env.JWT_SECRET!)
    .update(`issue-form:${formId}:${nonce}`)
    .digest("base64url");
}

function newLink(formId: string): {
  token: string;
  nonce: string;
  hash: string;
} {
  const nonce = randomBytes(16).toString("hex");
  const token = deriveToken(formId, nonce);
  return { token, nonce, hash: hashToken(token) };
}

// ---------------------------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------------------------

interface IssueFormRow {
  id: string;
  form_number: string;
  asset_id: string;
  status: IssueForm["status"];
  issue_date: Date | string;
  equipment_type: string;
  make: string;
  model: string;
  specifications: string;
  serial_number: string;
  finance_asset_no: string;
  physical_condition: string;
  condition_comment: string | null;
  accessories: IssueFormAccessory[];
  department: string;
  location: string;
  issued_to_name: string;
  issued_to_user_id: string | null;
  recipient_email: string;
  payroll_number: string;
  approved_by_name: string;
  approved_by_email: string;
  remarks: string | null;
  reissue_reason: string | null;
  disclaimer: string[];
  content_hash: string;
  expires_at: Date | string;
  last_sent_at: Date | string | null;
  email_status: IssueForm["emailStatus"];
  acknowledged_at: Date | string | null;
  acknowledged_name: string | null;
  disputed_at: Date | string | null;
  dispute_reason: string | null;
  voided_at: Date | string | null;
  void_reason: string | null;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  created_at: Date | string;
}

/** Deliberately leaves out the token columns and the signer's IP and browser. */
const FORM_COLUMNS = `f.id, f.form_number, f.asset_id, f.status, f.issue_date, f.equipment_type,
  f.make, f.model, f.specifications, f.serial_number, f.finance_asset_no, f.physical_condition, f.condition_comment,
  f.accessories, f.department, f.location, f.issued_to_name, f.issued_to_user_id, f.recipient_email,
  f.payroll_number, f.approved_by_name, f.approved_by_email, f.remarks, f.reissue_reason,
  f.disclaimer, f.content_hash, f.expires_at, f.last_sent_at, f.email_status, f.acknowledged_at,
  f.acknowledged_name, f.disputed_at, f.dispute_reason, f.voided_at, f.void_reason, f.created_by,
  creator.full_name AS created_by_name, creator.email AS created_by_email, f.created_at`;
const FORM_FROM = `equipment_issue_forms f JOIN users creator ON creator.id = f.created_by`;

function mapForm(row: IssueFormRow): IssueForm {
  return {
    id: row.id,
    formNumber: formatIssueFormNumber(row.form_number),
    assetId: row.asset_id,
    status: row.status,
    issueDate: toDateOnlyString(row.issue_date)!,
    equipmentType: row.equipment_type,
    make: row.make,
    model: row.model,
    specifications: row.specifications,
    serialNumber: row.serial_number,
    financeAssetNo: row.finance_asset_no,
    physicalCondition: row.physical_condition,
    conditionComment: row.condition_comment,
    accessories: row.accessories,
    department: row.department,
    location: row.location,
    issuedToName: row.issued_to_name,
    issuedToUserId: row.issued_to_user_id,
    recipientEmail: row.recipient_email,
    payrollNumber: row.payroll_number,
    approvedByName: row.approved_by_name,
    approvedByEmail: row.approved_by_email,
    remarks: row.remarks,
    reissueReason: row.reissue_reason,
    disclaimer: row.disclaimer,
    contentHash: row.content_hash,
    expiresAt: toIsoString(row.expires_at)!,
    lastSentAt: toIsoString(row.last_sent_at),
    emailStatus: row.email_status,
    acknowledgedAt: toIsoString(row.acknowledged_at),
    acknowledgedName: row.acknowledged_name,
    disputedAt: toIsoString(row.disputed_at),
    disputeReason: row.dispute_reason,
    voidedAt: toIsoString(row.voided_at),
    voidReason: row.void_reason,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: toIsoString(row.created_at)!,
  };
}

async function audit(
  client: PoolClient,
  assetId: string,
  actionType: string,
  formNumber: string,
  performedBy: string,
  note: string | null = null,
): Promise<void> {
  await client.query(
    `INSERT INTO asset_audit_log (asset_id, action_type, field_name, new_value, note, performed_by)
     VALUES ($1, $2, 'issue_form', $3, $4, $5)`,
    [assetId, actionType, formNumber, note, performedBy],
  );
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

export async function listIssueFormsForAsset(
  assetId: string,
): Promise<IssueForm[]> {
  const result = await query<IssueFormRow>(
    `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM}
     WHERE f.asset_id = $1 ORDER BY f.created_at DESC, f.form_number DESC`,
    [assetId],
  );
  return result.rows.map(mapForm);
}

export async function getIssueForm(
  assetId: string,
  formId: string,
): Promise<IssueForm | null> {
  const result = await query<IssueFormRow>(
    `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM}
     WHERE f.asset_id = $1 AND f.id::text = $2`,
    [assetId, formId],
  );
  return result.rows[0] ? mapForm(result.rows[0]) : null;
}

/** What the emailed link may show. Voided, superseded and expired forms show nothing. */
export async function getIssueFormByToken(
  token: string,
): Promise<IssueForm | null> {
  const result = await query<IssueFormRow>(
    `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM}
     WHERE f.token_hash = $1 AND f.expires_at > now()
       AND f.status IN ('pending', 'acknowledged', 'disputed')`,
    [hashToken(token)],
  );
  return result.rows[0] ? mapForm(result.rows[0]) : null;
}

/** The link for a pending form, for the emails that follow the first one. */
export function issueFormToken(formId: string, nonce: string): string {
  return deriveToken(formId, nonce);
}

// ---------------------------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------------------------

interface ContextRow {
  id: string;
  asset_tag: string;
  name: string;
  model_number: string | null;
  serial_number: string;
  notes: string | null;
  assigned_user_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  category_name: string;
  location_name: string;
  department_name: string;
  condition_name: string;
  status_name: string;
  user_name: string | null;
  user_email: string | null;
}

const CONTEXT_SQL = `SELECT a.id, a.asset_tag, a.name, a.model_number, a.serial_number, a.notes,
    a.assigned_user_id, a.owner_name, a.owner_email, c.name AS category_name,
    l.name AS location_name, d.name AS department_name, ac.name AS condition_name,
    st.name AS status_name, u.full_name AS user_name, u.email AS user_email
  FROM assets a
  JOIN categories c ON c.id = a.category_id
  JOIN locations l ON l.id = a.location_id
  JOIN departments d ON d.id = a.department_id
  JOIN asset_conditions ac ON ac.id = a.condition_id
  JOIN asset_statuses st ON st.id = a.status_id
  LEFT JOIN users u ON u.id = a.assigned_user_id
  WHERE a.id = $1 AND a.deleted_at IS NULL`;

const ACCESSORIES_SQL = `SELECT x.name, aa.quantity, aa.notes
  FROM asset_accessories aa JOIN accessories x ON x.id = aa.accessory_id
  WHERE aa.asset_id = $1 ORDER BY x.sort_order, x.name`;

function issuedToName(ctx: ContextRow): string {
  return ctx.user_name ?? ctx.owner_name ?? "";
}

function capitalize(value: string): string {
  const text = formatLookupName(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** SQL matching forms issued to this asset's current owner. */
function samePersonClause(
  ctx: ContextRow,
  email: string,
  start: number,
  alias = "",
): { sql: string; params: unknown[] } {
  return ctx.assigned_user_id
    ? {
        sql: `${alias}issued_to_user_id = $${start}`,
        params: [ctx.assigned_user_id],
      }
    : {
        sql: `lower(${alias}recipient_email) = lower($${start})`,
        params: [email],
      };
}

/** The most recent payroll number on any form issued to this person, so it's typed only once. */
async function lastPayrollNumber(
  ctx: ContextRow,
  email: string,
): Promise<string> {
  if (!ctx.assigned_user_id && !email) return "";
  const person = samePersonClause(ctx, email, 1);
  const result = await query<{ payroll_number: string }>(
    `SELECT payroll_number FROM equipment_issue_forms
     WHERE ${person.sql} ORDER BY created_at DESC LIMIT 1`,
    person.params,
  );
  return result.rows[0]?.payroll_number ?? "";
}

export async function getIssueFormPrefill(
  assetId: string,
  hodDirectory: { hods: Hod[]; stale: boolean },
): Promise<IssueFormPrefill | null> {
  const ctx = (await query<ContextRow>(CONTEXT_SQL, [assetId])).rows[0];
  if (!ctx) return null;

  const email = ctx.user_email ?? ctx.owner_email ?? "";
  const person = email ? samePersonClause(ctx, email, 2) : null;
  const [accessories, open, prior, payrollNumber, lastForm] = await Promise.all(
    [
      query<IssueFormAccessory>(ACCESSORIES_SQL, [assetId]),
      query<{ form_number: string; status: string }>(
        `SELECT form_number, status FROM equipment_issue_forms
       WHERE asset_id = $1
         AND (status = 'disputed' OR (status = 'pending' AND expires_at > now()))`,
        [assetId],
      ),
      person
        ? query(
            `SELECT 1 FROM equipment_issue_forms
           WHERE asset_id = $1 AND status = 'acknowledged' AND ${person.sql} LIMIT 1`,
            [assetId, ...person.params],
          )
        : Promise.resolve({ rowCount: 0 }),
      lastPayrollNumber(ctx, email),
      query<{ specifications: string }>(
        `SELECT specifications FROM equipment_issue_forms
       WHERE asset_id = $1 AND specifications <> $2
       ORDER BY created_at DESC, form_number DESC LIMIT 1`,
        [assetId, UNRECORDED_SPECIFICATIONS],
      ),
    ],
  );

  const lastSpecifications = lastForm.rows[0]?.specifications;
  const notes = ctx.notes?.trim() ?? "";
  const openForm = open.rows[0];
  const blockedReason = !canIssueForm(ctx.status_name)
    ? issuableStatusMessage(ctx.status_name)
    : openForm
      ? `${formatIssueFormNumber(openForm.form_number)} is still ${openForm.status}. Re-send or void it from the Issue Forms tab first.`
      : null;

  const { make, model } = deriveMakeAndModel(ctx.name, ctx.model_number);
  const department = normalizeName(ctx.department_name);
  return {
    blockedReason,
    issueDate: todayIso(),
    equipmentType: ctx.category_name,
    make,
    model,
    specifications: lastSpecifications ?? notes,
    specificationsSource: lastSpecifications ? "form" : notes ? "notes" : null,
    serialNumber: ctx.serial_number,
    financeAssetNo: ctx.asset_tag,
    physicalCondition: capitalize(ctx.condition_name),
    accessories: accessories.rows,
    department: ctx.department_name,
    location: ctx.location_name,
    issuedToName: issuedToName(ctx),
    recipientEmail: email,
    recipientEmailLocked: Boolean(ctx.user_email),
    payrollNumber,
    hods: hodDirectory.hods,
    hodsStale: hodDirectory.stale,
    defaultHodEmail:
      hodDirectory.hods.find(
        (h) => h.department && normalizeName(h.department) === department,
      )?.email ?? "",
    hasPriorAcknowledgement: Boolean(prior.rowCount),
  };
}

/** Pending forms past their link's life become expired. Scoped to one asset while triggering (so
 * it can't block a new form); unscoped from the daily job. */
export async function expireStaleForms(
  client: PoolClient,
  assetId?: string,
): Promise<IssueForm[]> {
  const result = await client.query<IssueFormRow>(
    `WITH expired AS (
       UPDATE equipment_issue_forms SET status = 'expired'
       WHERE status = 'pending' AND expires_at <= now()
         AND ($1::uuid IS NULL OR asset_id = $1)
       RETURNING *
     )
     SELECT ${FORM_COLUMNS} FROM expired f JOIN users creator ON creator.id = f.created_by`,
    [assetId ?? null],
  );
  const forms = result.rows.map(mapForm);
  for (const form of forms) {
    await audit(
      client,
      form.assetId,
      "issue_form_expired",
      form.formNumber,
      form.createdBy,
      "The link expired without a response.",
    );
  }
  return forms;
}

function contentHash(fields: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

/** The details that make a form "the same" as one already signed. */
function substance(form: {
  issuedToName: string;
  recipientEmail: string;
  make: string;
  model: string;
  specifications: string;
  serialNumber: string;
  department: string;
  location: string;
  physicalCondition: string;
  accessories: IssueFormAccessory[];
}): string {
  return JSON.stringify([
    normalizeName(form.issuedToName),
    form.recipientEmail.toLowerCase(),
    form.make,
    form.model,
    form.specifications,
    form.serialNumber,
    form.department,
    form.location,
    form.physicalCondition,
    form.accessories.map((a) => [a.name, a.quantity, a.notes]),
  ]);
}

/** Creates a pending form from the asset as it stands right now, with the caller's input. The
 * email goes out after this commits. */
export async function createIssueForm(
  assetId: string,
  input: IssueFormInput,
  approver: Hod,
  performedBy: string,
): Promise<{ form: IssueForm; token: string } | null> {
  return withTransaction(async (client) => {
    // FOR UPDATE: serializes with transfers and status changes, so a form can't be frozen from
    // details that are changing underneath it.
    const ctx = (
      await client.query<ContextRow>(`${CONTEXT_SQL} FOR UPDATE OF a`, [
        assetId,
      ])
    ).rows[0];
    if (!ctx) return null;
    if (!canIssueForm(ctx.status_name)) {
      throw new IssueFormError(issuableStatusMessage(ctx.status_name));
    }

    await expireStaleForms(client, assetId);
    const open = await client.query<{ form_number: string; status: string }>(
      `SELECT form_number, status FROM equipment_issue_forms
       WHERE asset_id = $1 AND status IN ('pending', 'disputed')`,
      [assetId],
    );
    if (open.rows[0]) {
      throw new IssueFormError(
        `${formatIssueFormNumber(open.rows[0].form_number)} is still ${open.rows[0].status}. Re-send or void it first.`,
      );
    }

    const recipientEmail = ctx.user_email ?? input.recipientEmail;
    if (!recipientEmail) {
      throw new IssueFormError("The owner's email address is required", 400);
    }

    const accessories = (
      await client.query<IssueFormAccessory>(ACCESSORIES_SQL, [assetId])
    ).rows;
    const frozen = {
      issueDate: todayIso(),
      equipmentType: ctx.category_name,
      make: input.make,
      model: input.model,
      specifications: input.specifications,
      serialNumber: ctx.serial_number,
      financeAssetNo: ctx.asset_tag,
      physicalCondition: capitalize(ctx.condition_name),
      accessories,
      department: ctx.department_name,
      location: ctx.location_name,
      issuedToName: issuedToName(ctx),
      recipientEmail,
      payrollNumber: input.payrollNumber,
      approvedByName: approver.name,
      approvedByEmail: approver.email,
      remarks: input.remarks,
    };

    const person = samePersonClause(ctx, recipientEmail, 2, "f.");
    const prior = await client.query<IssueFormRow>(
      `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM}
       WHERE f.asset_id = $1 AND f.status = 'acknowledged' AND ${person.sql}
       ORDER BY f.acknowledged_at DESC LIMIT 1`,
      [assetId, ...person.params],
    );
    const unchanged =
      prior.rows[0] && substance(mapForm(prior.rows[0])) === substance(frozen);
    if (unchanged && !input.reissueReason) {
      throw new IssueFormError(
        `${issuedToName(ctx)} already acknowledged these same details. Choose a re-issue reason to send another form.`,
      );
    }

    const id = randomUUID();
    const link = newLink(id);
    const hash = contentHash([id, ...Object.values(frozen), DISCLAIMER]);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO equipment_issue_forms (
         id, asset_id, issue_date, equipment_type, make, model, serial_number, finance_asset_no,
         physical_condition, accessories, department, location, issued_to_name,
         issued_to_user_id, recipient_email, payroll_number, approved_by_name, approved_by_email,
         remarks, reissue_reason, disclaimer, content_hash, token_hash, token_nonce, expires_at,
         created_by, specifications
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20, $21::jsonb, $22, $23, $24, now() + make_interval(days => $25), $26, $27
       ) RETURNING id`,
      [
        id,
        assetId,
        frozen.issueDate,
        frozen.equipmentType,
        frozen.make,
        frozen.model,
        frozen.serialNumber,
        frozen.financeAssetNo,
        frozen.physicalCondition,
        JSON.stringify(frozen.accessories),
        frozen.department,
        frozen.location,
        frozen.issuedToName,
        ctx.assigned_user_id,
        frozen.recipientEmail,
        frozen.payrollNumber,
        frozen.approvedByName,
        frozen.approvedByEmail,
        frozen.remarks,
        input.reissueReason,
        JSON.stringify(DISCLAIMER),
        hash,
        link.hash,
        link.nonce,
        LINK_TTL_DAYS,
        performedBy,
        frozen.specifications,
      ],
    );

    // An address supplied here fills the gap on the asset too, so it's only asked for once.
    if (!ctx.assigned_user_id && !ctx.owner_email) {
      await client.query(`UPDATE assets SET owner_email = $2 WHERE id = $1`, [
        assetId,
        recipientEmail,
      ]);
      await client.query(
        `INSERT INTO asset_audit_log (asset_id, action_type, field_name, new_value, performed_by)
         VALUES ($1, 'updated', 'owner_email', $2, $3)`,
        [assetId, recipientEmail, performedBy],
      );
    }

    const row = await client.query<IssueFormRow>(
      `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM} WHERE f.id = $1`,
      [inserted.rows[0].id],
    );
    const form = mapForm(row.rows[0]);
    await audit(
      client,
      assetId,
      "issue_form_sent",
      form.formNumber,
      performedBy,
      `Issued to ${form.issuedToName} (${form.recipientEmail}). Approved by ${form.approvedByName}.${input.reissueReason ? ` Re-issue reason: ${input.reissueReason}.` : ""}`,
    );
    return { form, token: link.token };
  });
}

export async function recordIssueFormEmail(
  formId: string,
  sent: boolean,
): Promise<void> {
  await query(
    `UPDATE equipment_issue_forms
     SET email_status = $2, last_sent_at = CASE WHEN $3 THEN now() ELSE last_sent_at END
     WHERE id = $1`,
    [formId, sent ? "sent" : "failed", sent],
  );
}

/** A fresh link for a pending form; the earlier link stops working and the 14 days restart. */
export async function prepareIssueFormResend(
  assetId: string,
  formId: string,
  performedBy: string,
): Promise<{ form: IssueForm; token: string } | null> {
  return withTransaction(async (client) => {
    const found = await client.query<{
      status: string;
      recent: boolean;
      form_number: string;
    }>(
      `SELECT status, form_number,
         last_sent_at IS NOT NULL AND last_sent_at > now() - make_interval(secs => $3) AS recent
       FROM equipment_issue_forms
       WHERE asset_id = $1 AND id::text = $2 FOR UPDATE`,
      [assetId, formId, RESEND_COOLDOWN_SECONDS],
    );
    const row = found.rows[0];
    if (!row) return null;
    if (row.status !== "pending") {
      throw new IssueFormError(`A ${row.status} form can't be re-sent.`);
    }
    if (row.recent) {
      throw new IssueFormError(
        "This form was sent less than a minute ago. Wait a moment and try again.",
        429,
      );
    }
    const link = newLink(formId);
    await client.query(
      `UPDATE equipment_issue_forms
       SET token_hash = $2, token_nonce = $3, reminder_count = 0, email_status = 'pending',
           expires_at = now() + make_interval(days => $4)
       WHERE id::text = $1`,
      [formId, link.hash, link.nonce, LINK_TTL_DAYS],
    );
    const updated = await client.query<IssueFormRow>(
      `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM} WHERE f.id::text = $1`,
      [formId],
    );
    const form = mapForm(updated.rows[0]);
    await audit(
      client,
      assetId,
      "issue_form_resent",
      form.formNumber,
      performedBy,
    );
    return { form, token: link.token };
  });
}

// ---------------------------------------------------------------------------------------------
// Voiding
// ---------------------------------------------------------------------------------------------

export async function voidIssueForm(
  assetId: string,
  formId: string,
  reason: string,
  performedBy: string,
): Promise<IssueForm | null> {
  return withTransaction(async (client) => {
    const found = await client.query<{ status: string; form_number: string }>(
      `SELECT status, form_number FROM equipment_issue_forms
       WHERE asset_id = $1 AND id::text = $2 FOR UPDATE`,
      [assetId, formId],
    );
    const row = found.rows[0];
    if (!row) return null;
    if (row.status !== "pending" && row.status !== "disputed") {
      throw new IssueFormError(`A ${row.status} form can't be voided.`);
    }
    await client.query(
      `UPDATE equipment_issue_forms
       SET status = 'voided', voided_at = now(), voided_by = $2, void_reason = $3
       WHERE id::text = $1`,
      [formId, performedBy, reason],
    );
    await audit(
      client,
      assetId,
      "issue_form_voided",
      formatIssueFormNumber(row.form_number),
      performedBy,
      reason,
    );
    const updated = await client.query<IssueFormRow>(
      `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM} WHERE f.id::text = $1`,
      [formId],
    );
    return mapForm(updated.rows[0]);
  });
}

/** Cancels the asset's open form, if any, inside the caller's transaction. */
export async function voidOpenIssueForm(
  client: PoolClient,
  assetId: string,
  reason: string,
  performedBy: string,
): Promise<void> {
  const result = await client.query<{ form_number: string }>(
    `UPDATE equipment_issue_forms
     SET status = 'voided', voided_at = now(), voided_by = $2, void_reason = $3
     WHERE asset_id = $1 AND status IN ('pending', 'disputed')
     RETURNING form_number`,
    [assetId, performedBy, reason],
  );
  for (const row of result.rows) {
    await audit(
      client,
      assetId,
      "issue_form_voided",
      formatIssueFormNumber(row.form_number),
      performedBy,
      reason,
    );
  }
}

/** Applies the auto-void rules to one committed-in-this-transaction asset write. */
export async function voidIssueFormAfterAssetChange(
  client: PoolClient,
  before: Asset,
  after: Asset,
  performedBy: string,
): Promise<void> {
  const ownerChanged =
    before.assignedUserId !== after.assignedUserId ||
    (before.ownerName ?? "") !== (after.ownerName ?? "");
  if (ownerChanged) {
    await voidOpenIssueForm(
      client,
      after.id,
      "The asset's owner changed.",
      performedBy,
    );
    return;
  }
  if (before.departmentId !== after.departmentId) {
    await voidOpenIssueForm(
      client,
      after.id,
      "The asset's department changed.",
      performedBy,
    );
    return;
  }
  if (before.statusId !== after.statusId) {
    const status = await client.query<{ name: string }>(
      `SELECT name FROM asset_statuses WHERE id = $1`,
      [after.statusId],
    );
    const name = status.rows[0]?.name ?? "";
    if (VOIDING_STATUSES.includes(statusKey(name))) {
      await voidOpenIssueForm(
        client,
        after.id,
        `The asset was marked ${formatLookupName(name)}.`,
        performedBy,
      );
      return;
    }
  }
  if (before.conditionId !== after.conditionId) {
    await voidOpenIssueForm(
      client,
      after.id,
      "The asset's condition changed.",
      performedBy,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// The recipient's response
// ---------------------------------------------------------------------------------------------

async function lockPendingByToken(
  client: PoolClient,
  token: string,
): Promise<IssueFormRow | null> {
  const result = await client.query<IssueFormRow>(
    `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM}
     WHERE f.token_hash = $1 AND f.status = 'pending' AND f.expires_at > now()
     FOR UPDATE OF f`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

/** Records the acknowledgement. Throws when the typed name doesn't match the form, and returns
 * null when the link is no longer open. */
export async function acknowledgeIssueForm(
  token: string,
  typedName: string,
  evidence: { ip: string | null; userAgent: string | null },
): Promise<IssueForm | null> {
  return withTransaction(async (client) => {
    const row = await lockPendingByToken(client, token);
    if (!row) return null;
    if (normalizeName(typedName) !== normalizeName(row.issued_to_name)) {
      throw new IssueFormError(
        `Type your full name exactly as it appears on the form: ${row.issued_to_name}.`,
        400,
      );
    }
    await client.query(
      `UPDATE equipment_issue_forms
       SET status = 'acknowledged', acknowledged_at = now(), acknowledged_name = $2,
           acknowledged_ip = $3, acknowledged_user_agent = $4
       WHERE id = $1`,
      // The printed name, now it's matched: the signature shouldn't carry typing slips in case.
      [row.id, row.issued_to_name, evidence.ip, evidence.userAgent],
    );
    await client.query(
      `UPDATE equipment_issue_forms SET status = 'superseded', superseded_by = $2
       WHERE asset_id = $1 AND status = 'acknowledged' AND id <> $2`,
      [row.asset_id, row.id],
    );
    const updated = await client.query<IssueFormRow>(
      `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM} WHERE f.id = $1`,
      [row.id],
    );
    const form = mapForm(updated.rows[0]);
    await audit(
      client,
      form.assetId,
      "issue_form_acknowledged",
      form.formNumber,
      form.createdBy,
      `Acknowledged by ${row.issued_to_name} through the emailed link${evidence.ip ? ` (IP ${evidence.ip})` : ""}.`,
    );
    return form;
  });
}

export async function disputeIssueForm(
  token: string,
  reason: string,
): Promise<IssueForm | null> {
  return withTransaction(async (client) => {
    const row = await lockPendingByToken(client, token);
    if (!row) return null;
    await client.query(
      `UPDATE equipment_issue_forms
       SET status = 'disputed', disputed_at = now(), dispute_reason = $2
       WHERE id = $1`,
      [row.id, reason],
    );
    const updated = await client.query<IssueFormRow>(
      `SELECT ${FORM_COLUMNS} FROM ${FORM_FROM} WHERE f.id = $1`,
      [row.id],
    );
    const form = mapForm(updated.rows[0]);
    await audit(
      client,
      form.assetId,
      "issue_form_disputed",
      form.formNumber,
      form.createdBy,
      `Reported by ${form.issuedToName}: ${reason}`,
    );
    return form;
  });
}

// ---------------------------------------------------------------------------------------------
// Daily job
// ---------------------------------------------------------------------------------------------

export async function expireAllStaleForms(): Promise<IssueForm[]> {
  return withTransaction((client) => expireStaleForms(client));
}

export interface ReminderDue {
  form: IssueForm;
  token: string;
}

/** Pending forms whose next reminder has come due, counted from the latest send. */
export async function listIssueFormRemindersDue(): Promise<ReminderDue[]> {
  const result = await query<IssueFormRow & { token_nonce: string }>(
    `SELECT ${FORM_COLUMNS}, f.token_nonce FROM ${FORM_FROM}
     WHERE f.status = 'pending' AND f.expires_at > now() AND f.last_sent_at IS NOT NULL
       AND (
         (f.reminder_count = 0 AND f.last_sent_at <= now() - make_interval(days => $1))
         OR (f.reminder_count = 1 AND f.last_sent_at <= now() - make_interval(days => $2))
       )`,
    REMINDER_DAYS,
  );
  return result.rows.map((row) => ({
    form: mapForm(row),
    token: issueFormToken(row.id, row.token_nonce),
  }));
}

export async function markIssueFormReminded(formId: string): Promise<void> {
  await query(
    `UPDATE equipment_issue_forms SET reminder_count = reminder_count + 1 WHERE id = $1`,
    [formId],
  );
}
