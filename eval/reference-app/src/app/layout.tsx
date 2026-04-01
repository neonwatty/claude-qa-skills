import type { Metadata } from "next";
import "@/lib/db-init";
import { getCurrentUser } from "@/lib/session";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskFlow",
  description: "Project and task management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <NavBar
          user={user ? { name: user.name, role: user.role } : null}
        />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
