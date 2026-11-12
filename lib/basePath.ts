/** The app's sub-path (`/itam`), or "" at the root. `next.config.ts` validates its shape. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes an app-relative path (`/api/...`, `/logo.svg`) for the places Next doesn't do it
 * itself: plain `<a href>`, `<img src>`, `fetch` and `window.location`. `<Link>`, `router.push`
 * and `redirect()` already add it, so don't wrap their hrefs. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
