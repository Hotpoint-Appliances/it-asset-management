"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDownIcon, HouseIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { guideTopics } from "@/lib/guide/topics";

function NavLinks({ pathname }: { pathname: string }) {
  const items = [
    { href: "/guide", title: "Overview", icon: HouseIcon },
    ...guideTopics.map((t) => ({
      href: `/guide/${t.slug}`,
      title: t.title,
      icon: t.icon,
    })),
  ];
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, title, icon: Icon }) => {
        const active = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              <Icon weight="bold" className="h-4 w-4 shrink-0" />
              {title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The guide's topic list: a sticky side column from `lg` up, a collapsible list above the
 * content below it. `pathname` is app-relative, so it matches the hrefs under a base path too. */
export function GuideNav() {
  const pathname = usePathname();
  const current =
    guideTopics.find((t) => pathname === `/guide/${t.slug}`)?.title ??
    "Overview";

  return (
    <>
      <nav aria-label="Guide topics" className="hidden lg:block">
        {/* Scrolls by itself when taller than the window, or the last topics couldn't be reached
            while it sticks. */}
        <div className="scroll-area-thin sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-2">
          <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wide uppercase">
            Guide
          </p>
          <NavLinks pathname={pathname} />
        </div>
      </nav>
      {/* Keyed by path so it closes again after a topic is picked. */}
      <details
        key={pathname}
        className="group border-border rounded-xl border lg:hidden"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted-foreground">Guide: </span>
            <span className="font-medium">{current}</span>
          </span>
          <CaretDownIcon
            weight="bold"
            className="h-4 w-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <nav aria-label="Guide topics" className="border-border border-t p-2">
          <NavLinks pathname={pathname} />
        </nav>
      </details>
    </>
  );
}
