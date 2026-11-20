import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  MinusIcon,
} from "@phosphor-icons/react/ssr";
import { AudienceBadges } from "@/components/guide/GuideText";
import { guideTopics } from "@/lib/guide/topics";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "How IT Asset Manager works: roles, the asset lifecycle and step-by-step workflows for admins, asset managers, viewers and equipment recipients.",
};

type Access = "yes" | "no" | string;

/** What each role can do. Mirrors the role checks in the API routes; keep it in step. */
const ACCESS: {
  task: string;
  admin: Access;
  manager: Access;
  viewer: Access;
}[] = [
  {
    task: "View assets, the dashboard and notifications",
    admin: "yes",
    manager: "yes",
    viewer: "Own department",
  },
  {
    task: "Export the asset register and audit trail",
    admin: "yes",
    manager: "yes",
    viewer: "Own department",
  },
  {
    task: "Register, import and edit assets",
    admin: "yes",
    manager: "yes",
    viewer: "no",
  },
  {
    task: "Transfer, change status or condition, log maintenance",
    admin: "yes",
    manager: "yes",
    viewer: "no",
  },
  {
    task: "Issue equipment forms",
    admin: "yes",
    manager: "yes",
    viewer: "no",
  },
  {
    task: "Dispose of assets; disposal and depreciation reports",
    admin: "yes",
    manager: "yes",
    viewer: "no",
  },
  {
    task: "Delete records entered by mistake",
    admin: "yes",
    manager: "no",
    viewer: "no",
  },
  {
    task: "Manage users and settings",
    admin: "yes",
    manager: "no",
    viewer: "no",
  },
];

function AccessCell({ value }: { value: Access }) {
  if (value === "yes")
    return (
      <>
        <CheckIcon weight="bold" className="text-success mx-auto h-4 w-4" />
        <span className="sr-only">Yes</span>
      </>
    );
  if (value === "no")
    return (
      <>
        <MinusIcon
          weight="bold"
          className="text-muted-foreground/60 mx-auto h-4 w-4"
        />
        <span className="sr-only">No</span>
      </>
    );
  return <span className="text-muted-foreground text-xs">{value}</span>;
}

const LIFECYCLE = [
  { label: "Register", text: "Added with a tag, in storage or active" },
  { label: "Assign", text: "Given to someone, with an issue form" },
  { label: "Maintain", text: "In repair while it's being fixed" },
  { label: "Dispose", text: "Sold, scrapped or written off, for good" },
];

export default function GuideOverviewPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How IT Asset Manager works
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          Step-by-step guides to every workflow, from adding an asset to
          disposing of it. Each section is labelled with the roles that can do
          it.
        </p>
      </header>

      <section aria-labelledby="lifecycle" className="flex flex-col gap-4">
        <h2 id="lifecycle" className="text-xl font-semibold tracking-tight">
          An asset&apos;s life
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {LIFECYCLE.map(({ label, text }, i) => (
            <li
              key={label}
              className="border-border flex gap-3 rounded-xl border p-4"
            >
              <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-muted-foreground text-sm">{text}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground text-sm">
          Along the way it can be transferred, change condition, or be marked
          lost or stolen. Every change is written to its audit log.
        </p>
      </section>

      <section aria-labelledby="roles" className="flex flex-col gap-4">
        <h2 id="roles" className="text-xl font-semibold tracking-tight">
          Who can do what
        </h2>
        <div className="border-border scroll-area-thin overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Task
                </th>
                <th
                  scope="col"
                  className="w-32 px-4 py-3 text-center font-medium whitespace-nowrap"
                >
                  Admin
                </th>
                <th
                  scope="col"
                  className="w-32 px-4 py-3 text-center font-medium whitespace-nowrap"
                >
                  Asset manager
                </th>
                <th
                  scope="col"
                  className="w-32 px-4 py-3 text-center font-medium whitespace-nowrap"
                >
                  Viewer
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {ACCESS.map((row) => (
                <tr key={row.task}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    {row.task}
                  </th>
                  <td className="px-4 py-3 text-center">
                    <AccessCell value={row.admin} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AccessCell value={row.manager} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AccessCell value={row.viewer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-sm">
          Recipients of equipment don&apos;t need an account: they acknowledge
          issue forms from an emailed link.
        </p>
      </section>

      <section aria-labelledby="topics" className="flex flex-col gap-4">
        <h2 id="topics" className="text-xl font-semibold tracking-tight">
          Topics
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {guideTopics.map(({ slug, title, summary, icon: Icon, who }) => (
            <li key={slug}>
              <Link
                href={`/guide/${slug}`}
                className="group border-border hover:border-primary/40 hover:bg-foreground/[0.02] focus-visible:ring-ring flex h-full flex-col gap-3 rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon weight="bold" className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">{title}</span>
                  <ArrowRightIcon
                    weight="bold"
                    className="text-muted-foreground group-hover:text-primary ml-auto h-4 w-4 transition-colors"
                  />
                </div>
                <p className="text-muted-foreground text-sm">{summary}</p>
                <AudienceBadges
                  who={who}
                  className="mt-auto flex flex-wrap gap-1.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
