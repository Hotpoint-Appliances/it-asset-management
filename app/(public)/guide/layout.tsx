import type { ReactNode } from "react";
import { GuideNav } from "@/components/guide/GuideNav";

/** The guide's two columns: topics on the left from `lg` up, the page beside them. */
export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:py-12">
      <GuideNav />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
