import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { withBasePath } from "@/lib/basePath";

/** The frame for links emailed to asset owners, who usually have no account. Company-branded
 * rather than app-branded, and `.scroll-native` like every other public page. */
export default function AcknowledgeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background scroll-native flex h-dvh flex-col overflow-y-auto">
      <header className="flex items-center justify-between gap-2 p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- plain SVG, swapped by theme */}
        <img
          src={withBasePath("/logo-dark.svg")}
          alt="Hotpoint"
          className="h-8 w-auto dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- plain SVG, swapped by theme */}
        <img
          src={withBasePath("/logo-white.svg")}
          alt="Hotpoint"
          className="hidden h-8 w-auto dark:block"
        />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-10 sm:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
