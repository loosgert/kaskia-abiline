import type { Metadata } from "next";
import { Chat } from "@/components/chat";

export const metadata: Metadata = { title: "Kaskia abiline" };

// Compact chat for the iframe that public/embed.js opens on kaskia.ee.
export default function Widget() {
  return (
    <main className="flex h-dvh w-full flex-col">
      <Chat
        source="widget"
        storageKey="kaskia-abiline:widget"
        compact
        header={
          <header className="flex items-center gap-2 border-b border-border px-3 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kaskia-logo.svg" alt="Kaskia" width={62} height={20} className="h-5 w-auto" />
            <span className="text-sm text-muted-foreground">abiline</span>
          </header>
        }
      />
    </main>
  );
}
