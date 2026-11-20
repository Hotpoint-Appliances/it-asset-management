import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ArrowsLeftRightIcon,
  BellIcon,
  ChartBarIcon,
  GearIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  RepeatIcon,
  SignatureIcon,
  SignInIcon,
  WarningOctagonIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";
import type { RoleName } from "@/lib/auth/session";

// The content of the public guide (/guide). Keep it in step with the app: when a workflow,
// screen, rule or role permission changes, update the topic that describes it here (see
// CLAUDE.md). Wording follows the UI's own labels so readers can find what's described.
//
// Inline `**text**` renders bold: use it for the names of buttons, menus, tabs and fields.

/** Who a section applies to. `recipient` is someone issued equipment, who may have no account. */
export type GuideAudience = RoleName | "recipient";

export interface GuideSection {
  /** Anchor id, unique within its topic. */
  id: string;
  title: string;
  /** Omit when everyone who can open the topic's screens can do this. */
  who?: GuideAudience[];
  intro?: string;
  /** Numbered steps. */
  steps?: string[];
  /** Rules and things worth knowing, as a bulleted list. */
  notes?: string[];
}

export interface GuideTopic {
  slug: string;
  title: string;
  /** One sentence, shown on the overview card and under the title. */
  summary: string;
  icon: PhosphorIcon;
  who: GuideAudience[];
  sections: GuideSection[];
}

export const AUDIENCE_LABELS: Record<GuideAudience, string> = {
  admin: "Admin",
  asset_manager: "Asset manager",
  viewer: "Viewer",
  recipient: "Recipient",
};

const EVERYONE: GuideAudience[] = ["admin", "asset_manager", "viewer"];
const MANAGERS: GuideAudience[] = ["admin", "asset_manager"];

export const guideTopics: GuideTopic[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary:
      "Signing in, managing your password and finding your way around the app.",
    icon: SignInIcon,
    who: EVERYONE,
    sections: [
      {
        id: "accounts",
        title: "Getting an account",
        intro:
          "There's no self sign-up. An admin creates your account with your work email, a starting password, your role and your department, then shares the password with you.",
      },
      {
        id: "sign-in",
        title: "Signing in",
        steps: [
          "Open the app and select **Sign in**.",
          "Enter your email and password, then select **Sign in**.",
          "You land on the dashboard, or on the page you were trying to open before you signed in.",
        ],
        notes: [
          "Sessions last 8 hours. After that you're asked to sign in again.",
          "If an admin deactivates your account or changes your role, it takes effect on your next click.",
        ],
      },
      {
        id: "passwords",
        title: "Changing or resetting your password",
        steps: [
          "To change it, open the user menu (your initial, top right) and choose **Change password**.",
          "If you've forgotten it, select **Forgot password?** on the sign-in page and enter your email. A reset link is emailed to you if the account exists.",
          "An admin can also set a new password for you from **Settings → Users**.",
        ],
        notes: [
          "Changing or resetting a password signs that account out everywhere else.",
          "Passwords must be at least 8 characters.",
        ],
      },
      {
        id: "around",
        title: "Finding your way around",
        notes: [
          "The sidebar holds **Dashboard**, **Assets**, **Issue forms** (admins and asset managers), **Reports** and **Settings** (admins). On phones and small tablets it opens from the menu button at the top left.",
          "On desktop, press **/** or select the bar at the top to open quick actions: jump to a page or start a common task.",
          "Press **D** anywhere, or use the sun/moon button, to switch between light and dark themes.",
          "The bell shows your notifications. The back arrow in the top bar returns to the previous page.",
          "Signing out (user menu → **Sign out**) returns you to the homepage.",
        ],
      },
    ],
  },
  {
    slug: "finding-assets",
    title: "Finding and viewing assets",
    summary:
      "Search, filter and sort the asset list, and read an asset's full record.",
    icon: MagnifyingGlassIcon,
    who: EVERYONE,
    sections: [
      {
        id: "list",
        title: "The asset list",
        steps: [
          "Open **Assets** from the sidebar.",
          "Search by tag, name, serial number or owner, or narrow the list with the status, category, department, location and condition filters.",
          "Select a column heading to sort by it. Select it again to reverse the order, and a third time to go back to the default.",
          "Use the columns menu to choose which columns show, and **Export** to download the filtered list to Excel.",
          "Select any row to open that asset.",
        ],
        notes: [
          "Viewers only see assets in their own department. Admins and asset managers see every department.",
          "**Clear filters** resets the filters but keeps your sort.",
        ],
      },
      {
        id: "detail",
        title: "An asset's record",
        intro:
          "The asset page shows its status and condition, owner, location, purchase and warranty details, and these tabs:",
        notes: [
          "**Overview**: the asset's details.",
          "**Accessories**: chargers, bags and other items that go with it.",
          "**Audit Log**: every change ever made to it, who made it and when.",
          "**Attachments**: invoices, photos and other files.",
          "**Maintenance**: past and scheduled repairs, services and inspections.",
          "**Issue Forms** (admins and asset managers): the equipment issue forms sent for it.",
        ],
      },
      {
        id: "labels",
        title: "Printing a QR label",
        steps: [
          "On the asset page, select **Print label**.",
          "Print the page. The QR code opens the asset's record when scanned with a phone camera (after signing in).",
        ],
      },
    ],
  },
  {
    slug: "registering-assets",
    title: "Registering assets",
    summary:
      "Add assets one at a time or in bulk from Excel, with accessories and attachments.",
    icon: PlusCircleIcon,
    who: MANAGERS,
    sections: [
      {
        id: "new",
        title: "Adding a single asset",
        who: MANAGERS,
        steps: [
          "Go to **Assets** and select **New asset** (or use quick actions).",
          "Fill in the asset tag, name, category, location, department, condition and status. Purchase, warranty, depreciation and owner details are optional but feed the reports and alerts.",
          "Optionally add an image and accessories, then save.",
        ],
        notes: [
          "Asset tags must be unique.",
          "Status defaults to **In storage**, or **Active** once you set an owner. You can pick any other status except **Disposed**, which only the dispose action sets.",
          "Creating the asset writes the first entry in its audit log. If you set an owner who has an account, they're notified.",
        ],
      },
      {
        id: "import",
        title: "Importing from Excel",
        who: MANAGERS,
        steps: [
          "Go to **Assets → Import** and select **Download template**.",
          "Fill in one asset per row on the template's Assets sheet. Its Instructions sheet explains each column and the allowed values.",
          "Choose the file and select **Check file**. Every row is checked and any problems are listed by row and column.",
          "Fix the problems in Excel, save, and select **Check again**. When the whole file passes, review the preview and select **Import**.",
        ],
        notes: [
          "It's all or nothing: nothing is saved until every row passes.",
          "Asset tags must be new, not already in the system and not repeated within the file.",
          "Each row needs an owner: an assigned user's email (someone with an account) or an owner name, not both.",
          "Images, attachments and accessories aren't imported. Add them on each asset afterwards.",
          "Imported assets don't send assignment notifications.",
        ],
      },
      {
        id: "edit",
        title: "Editing, accessories and attachments",
        who: MANAGERS,
        notes: [
          "**Edit** on the asset page changes any detail. Owner, location and department changes are logged the same way as a transfer.",
          "Add, change or remove accessories from the **Accessories** tab or the edit form. They can't be changed while the asset is disposed, lost or stolen.",
          "Upload and remove files from the **Attachments** tab.",
          "Disposed assets can't be edited.",
        ],
      },
    ],
  },
  {
    slug: "assigning-and-transferring",
    title: "Assigning and transferring",
    summary:
      "Give an asset to someone, or move it between people, departments and locations.",
    icon: ArrowsLeftRightIcon,
    who: MANAGERS,
    sections: [
      {
        id: "transfer",
        title: "Transferring an asset",
        who: MANAGERS,
        steps: [
          "Open the asset and choose **Actions → Transfer** (also in the row menu on the asset list).",
          "Choose the new owner: a **System user** (someone with an account) or **External / no login** (a name and optional email).",
          "Change the location and department as needed, then save. Any combination can change in one transfer.",
        ],
        notes: [
          "Each changed field is written to the audit log with its old and new values.",
          "Accessories move with the asset.",
          "The new owner is told by email (and in the app, if they have an account). The previous owner is told it was unassigned, and you get an emailed receipt of what changed and who was told.",
        ],
      },
      {
        id: "after",
        title: "Recording the handover",
        who: MANAGERS,
        intro:
          "For a laptop, phone or other equipment someone takes away, follow the transfer with an equipment issue form, so the recipient confirms what they received.",
        notes: ["See **Equipment issue forms** for how."],
      },
    ],
  },
  {
    slug: "issue-forms",
    title: "Equipment issue forms",
    summary:
      "Hand over equipment with a form the recipient acknowledges or disputes online.",
    icon: SignatureIcon,
    who: [...MANAGERS, "recipient"],
    sections: [
      {
        id: "issue",
        title: "Issuing a form",
        who: MANAGERS,
        steps: [
          "Make sure the asset is **Active** or **Reserved** and its owner has an email address.",
          "Open the asset and choose **Actions → Issue form**.",
          "Check the prefilled details: make, model, specifications, the owner's email and payroll number. Choose the head of department under **Approved by**, and add remarks if needed.",
          "Send it. The owner gets an emailed link to review and acknowledge the form, and the head of department and you are copied.",
        ],
        notes: [
          "Forms are numbered EIF-000001, EIF-000002 and so on.",
          "An asset can only have one pending form at a time. Re-send or void it before issuing another.",
          "The list of heads of department comes from the requisitions system. If that system can't be reached, the last list fetched is used.",
          "If the email fails, the form stays open: re-send it, or download the PDF and hand it over.",
        ],
      },
      {
        id: "follow-up",
        title: "Following up",
        who: MANAGERS,
        notes: [
          "The asset's **Issue Forms** tab, and **Issue forms** in the sidebar (every form across all assets, with **Export**), show each form's status.",
          "The link stays open for 14 days from the latest send. Unsigned forms get reminders 3 and 7 days after sending.",
          "**Re-send email** sends the link again and restarts the 14 days. It can't be used more than once a minute.",
          "**Void form** cancels a pending form with a reason. Disposing of an asset, or marking it lost or stolen, voids its open form automatically.",
          "Issuing a new form for an asset that already has a signed one supersedes the old one. If the details haven't changed since it was signed, choose a re-issue reason (replacement equipment, lost copy, correction or other).",
          "**Download PDF** gives a printable copy of any form.",
        ],
      },
      {
        id: "statuses",
        title: "What each status means",
        notes: [
          "**Pending**: sent and waiting for a signature.",
          "**Acknowledged**: the recipient signed it.",
          "**Disputed**: the recipient reported a problem. Their reason is shown, and you're notified.",
          "**Voided**: cancelled by an admin or asset manager, or by a status change.",
          "**Superseded**: a later form replaced this signed one.",
          "**Expired**: the link closed after 14 days without a signature.",
        ],
      },
      {
        id: "recipient",
        title: "If you've been issued equipment",
        who: ["recipient"],
        intro:
          "You don't need an account. Everything happens from the emailed link.",
        steps: [
          "Open the link in the email titled “Please acknowledge your IT equipment”.",
          "Check the equipment, its details and the terms.",
          "If everything is right, add any comments, type your full name exactly as it appears on the form, tick the confirmation box and submit. You're emailed a signed copy as a PDF.",
          "If something is wrong (the details are incorrect or you didn't receive the equipment), choose **Report a problem**, explain what's wrong and send it. The ICT team follows up.",
        ],
        notes: [
          "The link works for 14 days. If it has expired, ask the ICT team to re-send it.",
        ],
      },
    ],
  },
  {
    slug: "status-and-condition",
    title: "Status and condition",
    summary:
      "Record what state an asset is in, and what happens when that changes.",
    icon: RepeatIcon,
    who: MANAGERS,
    sections: [
      {
        id: "statuses",
        title: "Asset statuses",
        notes: [
          "**Active**: in use, assigned or in general circulation.",
          "**In storage**: spare stock, not deployed.",
          "**Reserved**: set aside for someone, not handed over yet.",
          "**In repair**: away for maintenance.",
          "**Lost** / **Stolen**: missing, unresolved. Recovered assets go back to active.",
          "**Disposed**: sold, scrapped, donated or written off. This is final.",
          "Admins can add other statuses in **Settings → Statuses**.",
        ],
      },
      {
        id: "change-status",
        title: "Changing status",
        who: MANAGERS,
        steps: [
          "Open the asset and choose **Actions → Change status**.",
          "Pick the new status, add a note and save.",
        ],
        notes: [
          "A note is required when marking an asset lost or stolen.",
          "**Disposed** isn't offered here. Use **Dispose** so the disposal is recorded properly.",
          "Lost, stolen and disposed assets can't have an issue form, and any open form is voided.",
        ],
      },
      {
        id: "change-condition",
        title: "Changing condition",
        who: MANAGERS,
        steps: [
          "Choose **Actions → Change condition**, pick the new condition and save.",
        ],
        notes: [
          "Condition (good, fair, bad, worse, or whatever your admin has set up) is separate from status. An asset in bad condition can still be active.",
          "Admins manage the list in **Settings → Conditions**.",
        ],
      },
    ],
  },
  {
    slug: "maintenance",
    title: "Maintenance",
    summary:
      "Schedule and log repairs, services and inspections, and keep status in step.",
    icon: WrenchIcon,
    who: MANAGERS,
    sections: [
      {
        id: "log",
        title: "Logging maintenance",
        who: MANAGERS,
        steps: [
          "Open the asset's **Maintenance** tab and select **Log maintenance**.",
          "Choose the type (**Repair**, **Service** or **Inspection**), the scheduled date, the vendor if any, and notes.",
          "Select **Start** when work begins, and **Mark completed** when it's done.",
        ],
      },
      {
        id: "status",
        title: "How it affects the asset's status",
        notes: [
          "Starting a **repair** sets the asset to **In repair** automatically. Completing the last open repair restores its previous status.",
          "For a **service** or **inspection** you're asked whether to set the asset to in repair on start, and whether to restore its status on completion.",
          "Completion never moves an asset back into lost, stolen or disposed.",
          "Logging maintenance on its own doesn't change the status.",
        ],
      },
      {
        id: "due",
        title: "Due and overdue maintenance",
        notes: [
          "When scheduled maintenance reaches its date without being started, admins, asset managers and whoever scheduled it get a **Maintenance due** notification.",
        ],
      },
    ],
  },
  {
    slug: "disposal",
    title: "Disposal and deletion",
    summary: "Retire an asset for good, or remove a record entered by mistake.",
    icon: WarningOctagonIcon,
    who: MANAGERS,
    sections: [
      {
        id: "dispose",
        title: "Disposing of an asset",
        who: MANAGERS,
        steps: [
          "Open the asset and choose **Actions → Dispose**.",
          "Enter the disposal date, method (sold, scrapped, donated, lost, stolen or other), disposal value and notes, and attach supporting paperwork if you have it.",
          "Confirm. You're recorded as the approver.",
        ],
        notes: [
          "Disposal is final: the asset becomes read-only and drops out of active dashboards and reports.",
          "Its history is kept, and it appears in the **Disposal register** report.",
        ],
      },
      {
        id: "delete",
        title: "Deleting a record",
        who: ["admin"],
        intro:
          "**Actions → Delete (data-entry correction)** is only for records created by mistake, such as a duplicate. Never use it to retire a real asset.",
        notes: [
          "The asset disappears from every list and search. The record is kept for audit purposes but can't be reached in the app.",
        ],
      },
    ],
  },
  {
    slug: "dashboard-and-reports",
    title: "Dashboard and reports",
    summary:
      "See the fleet at a glance and export registers for finance and audit.",
    icon: ChartBarIcon,
    who: EVERYONE,
    sections: [
      {
        id: "dashboard",
        title: "The dashboard",
        notes: [
          "Totals by status, category, department and location.",
          "Assets added and disposed per month, asset age and refresh due.",
          "Assets in repair, warranties expiring soon and recent activity.",
          "Viewers see their own department only. **Refresh** reloads the figures.",
        ],
      },
      {
        id: "reports",
        title: "Excel reports",
        intro: "Open **Reports** and download any of these:",
        notes: [
          "**Asset register**: every asset with its full details. For a filtered subset, filter on the Assets page and use **Export** there.",
          "**Audit trail**: every recorded change, optionally between two dates.",
          "**Disposal register** (admins and asset managers): disposed assets with method, value, approver and date.",
          "**Depreciation summary** (admins and asset managers): current book value using straight-line depreciation, floored at salvage value. Assets missing a purchase date, cost or useful life are listed with a note.",
          "Viewers' exports include their own department only.",
        ],
      },
    ],
  },
  {
    slug: "notifications",
    title: "Notifications",
    summary: "What you're alerted about, in the app and by email.",
    icon: BellIcon,
    who: EVERYONE,
    sections: [
      {
        id: "what",
        title: "What triggers a notification",
        notes: [
          "An asset is assigned to you, taken off you, or changed while it's yours (moved, updated, sent for maintenance, disposed).",
          "A warranty is about to expire (admins and asset managers, at each configured look-ahead window).",
          "Scheduled maintenance is due (admins, asset managers and whoever scheduled it).",
          "An issue form you're involved with is acknowledged, disputed or expires.",
          "When you make a change that affects someone else's asset, you get an emailed receipt of what changed and who was told.",
        ],
      },
      {
        id: "reading",
        title: "Reading them",
        notes: [
          "The bell in the top bar shows the latest. Open **Notifications** for the full list, and mark them read one by one or all at once.",
          "Most notifications are also emailed. If you have several waiting, they're combined into one email.",
          "Warranty and maintenance checks run once a day.",
        ],
      },
    ],
  },
  {
    slug: "administration",
    title: "Administration",
    summary:
      "Manage users, roles and the lists the asset register is built on.",
    icon: GearIcon,
    who: ["admin"],
    sections: [
      {
        id: "users",
        title: "Users and roles",
        who: ["admin"],
        steps: [
          "Go to **Settings → Users** and select **New User**.",
          "Enter their full name, email, role, department and a starting password (at least 8 characters), then share the password with them securely.",
          "Edit a user to change their role or department, or set a new password.",
          "Deactivate someone who leaves instead of deleting them. They're signed out at once and their history is kept. Reactivate them at any time.",
        ],
        notes: [
          "**Admin**: everything, including users and settings.",
          "**Asset manager**: every asset action, in every department.",
          "**Viewer**: read-only, own department only. Give viewers a department, or they'll see no assets.",
        ],
      },
      {
        id: "lists",
        title: "Lookup lists",
        who: ["admin"],
        intro:
          "Under **Settings** you manage the lists that the asset form and filters use:",
        notes: [
          "**Categories** and **Locations**: nested lists (for example site → building → floor → room).",
          "**Departments**, **Vendors**, **Conditions** and **Statuses**.",
          "**Accessories**: the catalog of items that can be attached to assets. An accessory that has ever been attached can't be deleted, only retired.",
          "Entries already in use can't be removed, so existing records stay valid.",
        ],
      },
    ],
  },
];

export function findGuideTopic(slug: string): GuideTopic | undefined {
  return guideTopics.find((t) => t.slug === slug);
}
