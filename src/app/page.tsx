import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
      <Chat
        source="site"
        storageKey="kaskia-abiline:site"
        header={
          <header className="flex items-center gap-3 border-b border-border px-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kaskia-logo.svg" alt="Kaskia" width={74} height={24} className="h-6 w-auto" />
            <span className="text-sm text-muted-foreground">abiline</span>
          </header>
        }
      />
    </main>
  );
}
