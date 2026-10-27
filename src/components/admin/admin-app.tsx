"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, Menu, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatDateTime } from "@/components/admin/client";
import { FactsTab } from "@/components/admin/facts-tab";
import { TestTab } from "@/components/admin/test-tab";
import type { ChatMessage } from "@/components/chat";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { adminTexts as t } from "@/lib/texts";

type ChatSummary = { id: string; title: string; source: string; model: string; updatedAt: string; messages: number };
type Unanswered = { id: string; sessionId: string; question: string; createdAt: string };
type Inquiry = {
  id: string;
  sessionId: string | null;
  company: string;
  contactName: string;
  email: string;
  quantity: string;
  size: string;
  deadline: string;
  purpose: string;
  logoRequested: boolean;
  createdAt: string;
};
type Overview = {
  stats: { chats: number; chats7: number; sizes: Record<string, number>; inquiries: number };
  chats: ChatSummary[];
  unanswered: Unanswered[];
  inquiries: Inquiry[];
};
type ChatDetail = { id: string; title: string; source: string; model: string; createdAt: string; messages: ChatMessage[] };

export function AdminApp() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selected, setSelected] = useState<ChatDetail | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    try {
      setOverview(await api<Overview>("/api/admin/overview"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<Overview>("/api/admin/overview")
      .then((data) => !cancelled && setOverview(data))
      .catch((error) => toast.error(error instanceof Error ? error.message : t.error));
    return () => {
      cancelled = true;
    };
  }, []);

  async function openChat(id: string) {
    try {
      setSelected(await api<ChatDetail>(`/api/admin/chats/${id}`));
      setSidebarOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function deleteChat(id: string) {
    if (!window.confirm(t.confirmDeleteChat)) return;
    try {
      await api(`/api/admin/chats/${id}`, { method: "DELETE" });
      if (selected?.id === id) setSelected(null);
      toast.success(t.deleted);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function deleteInquiry(id: string) {
    if (!window.confirm(t.confirmDeleteInquiry)) return;
    try {
      await api(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      toast.success(t.deleted);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const sidebar = (
    <nav aria-label={t.chats} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{t.chats}</h2>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="size-11 md:hidden" aria-label={t.close}>
          <X />
        </Button>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {overview?.chats.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">{t.noChats}</li>}
        {overview?.chats.map((c) => (
          <li key={c.id} className="group relative">
            <button
              type="button"
              onClick={() => void openChat(c.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 pr-11 text-left transition-colors hover:bg-muted",
                selected?.id === c.id && "bg-muted",
              )}
            >
              <span className="line-clamp-2 text-sm">{c.title || "—"}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {formatDateTime(c.updatedAt)} · {t.sources[c.source] ?? c.source} · {t.messagesCount(c.messages)}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void deleteChat(c.id)}
              className="absolute top-1.5 right-1 size-9 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              aria-label={t.deleteChat}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-[280px] shrink-0 border-r border-border bg-card md:block">{sidebar}</aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-card shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:px-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="size-11 md:hidden" aria-label={t.chats}>
            <Menu />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaskia-logo.svg" alt="Kaskia" width={62} height={20} className="h-5 w-auto" />
          <h1 className="font-semibold">{t.title}</h1>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" onClick={() => void load()} className="h-11 px-3" aria-label={t.refresh}>
              <RefreshCw />
              <span className="hidden sm:inline">{t.refresh}</span>
            </Button>
            <Button variant="ghost" onClick={() => void logout()} className="h-11 px-3">
              <LogOut />
              <span className="hidden sm:inline">{t.logout}</span>
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {selected ? (
            <ChatViewer chat={selected} onClose={() => setSelected(null)} onDelete={() => void deleteChat(selected.id)} />
          ) : (
            <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="gap-4 p-3 md:p-6">
              <div className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="overview">{t.tabs.overview}</TabsTrigger>
                  <TabsTrigger value="unanswered">{t.tabs.unanswered}</TabsTrigger>
                  <TabsTrigger value="inquiries">{t.tabs.inquiries}</TabsTrigger>
                  <TabsTrigger value="facts">{t.tabs.facts}</TabsTrigger>
                  <TabsTrigger value="test">{t.tabs.test}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview">
                {overview && (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat label={t.stats.chats} value={overview.stats.chats} />
                    <Stat label={t.stats.chats7} value={overview.stats.chats7} />
                    <Stat
                      label={t.stats.sizes}
                      value={`${overview.stats.sizes["0,33"] ?? 0} / ${overview.stats.sizes["0,5"] ?? 0}`}
                      note="0,33 l / 0,5 l"
                    />
                    <Stat label={t.stats.inquiries} value={overview.stats.inquiries} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unanswered">
                {overview?.unanswered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noUnanswered}</p>
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                    {overview?.unanswered.map((u) => (
                      <li key={u.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <p className="text-sm">{u.question}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</p>
                        </div>
                        <Button variant="outline" onClick={() => void openChat(u.sessionId)} className="h-10 self-start sm:self-auto">
                          {t.openChat}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="inquiries" className="space-y-3">
                <div className="flex justify-end">
                  <a href="/api/admin/inquiries/csv" download className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
                    <Download />
                    {t.downloadCsv}
                  </a>
                </div>
                {overview?.inquiries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noInquiries}</p>
                ) : (
                  <div className="rounded-xl border border-border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.inquiryCols.created}</TableHead>
                          <TableHead>{t.inquiryCols.company}</TableHead>
                          <TableHead>{t.inquiryCols.contact}</TableHead>
                          <TableHead>{t.inquiryCols.email}</TableHead>
                          <TableHead>{t.inquiryCols.quantity}</TableHead>
                          <TableHead>{t.inquiryCols.size}</TableHead>
                          <TableHead>{t.inquiryCols.deadline}</TableHead>
                          <TableHead>{t.inquiryCols.purpose}</TableHead>
                          <TableHead>{t.inquiryCols.logo}</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overview?.inquiries.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell>{formatDateTime(i.createdAt)}</TableCell>
                            <TableCell>{i.company}</TableCell>
                            <TableCell>{i.contactName}</TableCell>
                            <TableCell>
                              <a href={`mailto:${i.email}`} className="text-ember underline underline-offset-2">
                                {i.email}
                              </a>
                            </TableCell>
                            <TableCell>{i.quantity}</TableCell>
                            <TableCell>{i.size}</TableCell>
                            <TableCell>{i.deadline}</TableCell>
                            <TableCell className="max-w-[240px] whitespace-normal">{i.purpose}</TableCell>
                            <TableCell>{i.logoRequested ? <Badge>{t.yes}</Badge> : t.no}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void deleteInquiry(i.id)}
                                className="size-9 text-muted-foreground hover:text-destructive"
                                aria-label={t.delete}
                              >
                                <Trash2 />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="facts">
                <FactsTab />
              </TabsContent>

              <TabsContent value="test">
                <TestTab onChanged={() => void load()} />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function ChatViewer({ chat, onClose, onDelete }: { chat: ChatDetail; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="mx-auto max-w-[760px] p-3 md:p-6">
      <div className="mb-4 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{chat.title || "—"}</h2>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(chat.createdAt)} · {t.sources[chat.source] ?? chat.source} · {chat.model}
          </p>
        </div>
        <Button variant="ghost" onClick={onDelete} className="h-10 text-muted-foreground hover:text-destructive">
          <Trash2 />
          {t.delete}
        </Button>
        <Button variant="outline" onClick={onClose} className="h-10">
          <X />
          {t.close}
        </Button>
      </div>
      <div className="space-y-3">
        {chat.messages.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap break-words",
                m.role === "user" ? "bg-ember text-primary-foreground" : "border border-border bg-card",
              )}
            >
              {m.content}
            </div>
            <span className="mt-1 px-1 text-[11px] text-muted-foreground">
              {formatDateTime(m.createdAt)}
              {m.waitlistSize ? ` · ${m.waitlistSize} l` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
