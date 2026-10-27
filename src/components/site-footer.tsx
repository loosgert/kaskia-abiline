"use client";

import { usePathname } from "next/navigation";

// Shown on every page except /widget, which is embedded in kaskia.ee.
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/widget") return null;
  return (
    <footer className="shrink-0 border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
      © 2026 Kaskia Goods OÜ. Built with Claude Code
    </footer>
  );
}
