import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import { Footer } from "@/components/layout/Footer";
import { PublicHeader } from "@/components/layout/PublicHeader";

/** Frame for the pages anyone can open: the signed-out homepage (served at `/` by proxy.ts) and
 * the guide. Scrolls inside its own `h-dvh` container with the public pages' native scrollbar,
 * like the `(auth)` layout, since `html` never scrolls. */
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  return (
    <div className="bg-background scroll-native flex h-dvh flex-col overflow-y-auto">
      <PublicHeader signedIn={Boolean(session)} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer className="border-border border-t" />
    </div>
  );
}
