import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IT Asset Manager",
  description: "Internal IT asset tracking and lifecycle management",
};

export const viewport: Viewport = {
  // Lets the on-screen keyboard shrink the layout viewport on mobile
  // (Chrome Android), so `dvh`-sized dialogs keep their footer reachable
  // instead of the keyboard covering it.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers
          session={
            session
              ? {
                  userId: session.userId,
                  fullName: session.fullName,
                  email: session.email,
                  roleName: session.roleName,
                  departmentId: session.departmentId,
                }
              : null
          }
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
