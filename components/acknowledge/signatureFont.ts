import localFont from "next/font/local";

/** The same face the PDF signs with, so what's previewed is what gets printed. */
export const signatureFont = localFont({
  src: "../../public/fonts/dancing-script-latin-600-normal.woff",
  weight: "600",
  display: "swap",
});
