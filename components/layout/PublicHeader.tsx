import Link from "next/link";
import { ArrowRightIcon, BookOpenTextIcon } from "@phosphor-icons/react/ssr";
import { AppLogo } from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Top bar of the public pages (the signed-out homepage and the guide). The logo goes home: the
 * dashboard when signed in, the homepage otherwise, since both live at `/`. */
export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="focus-visible:ring-ring flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <AppLogo />
          {/* Too wide beside the buttons on the narrowest phones; still the link's name there. */}
          <span className="text-sm font-semibold whitespace-nowrap max-[359px]:sr-only">
            IT Asset Manager
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Button asChild variant="ghost" className="px-3">
            <Link href="/guide">
              <BookOpenTextIcon weight="bold" />
              <span className="hidden sm:inline">Guide</span>
              <span className="sr-only sm:hidden">Guide</span>
            </Link>
          </Button>
          <ThemeToggle />
          <Button asChild>
            {signedIn ? (
              <Link href="/">
                Dashboard
                <ArrowRightIcon weight="bold" />
              </Link>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
