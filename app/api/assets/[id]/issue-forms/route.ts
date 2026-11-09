import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import {
  IssueFormError,
  createIssueForm,
  listIssueFormsForAsset,
} from "@/lib/db/issueForms";
import { getHodDirectory } from "@/lib/issueForms/hods";
import { deliverIssueFormRequest } from "@/lib/issueForms/notify";
import { validateIssueFormInput } from "@/lib/validation/issueForms";

const ROLES = ["admin", "asset_manager"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, [...ROLES]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ forms: await listIssueFormsForAsset(id) });
}

/** Triggers a form. It's saved first and emailed after, so a mail failure leaves a form the admin
 * can re-send, and the response says which happened. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, [...ROLES]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const validated = validateIssueFormInput(
    await request.json().catch(() => null),
  );
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  // Resolved here, not trusted from the client, so only a listed HOD can be named.
  const { hods } = await getHodDirectory();
  const approver = hods.find(
    (h) => h.email.toLowerCase() === validated.data.approverEmail.toLowerCase(),
  );
  if (!approver) {
    return NextResponse.json(
      { error: "Choose an approver from the list" },
      { status: 400 },
    );
  }

  try {
    const created = await createIssueForm(
      id,
      validated.data,
      approver,
      session.userId,
    );
    if (!created) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const emailSent = await deliverIssueFormRequest(
      created.form,
      created.token,
    );
    return NextResponse.json(
      { form: created.form, emailSent },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof IssueFormError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
