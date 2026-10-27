"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/client";
import { Chat } from "@/components/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ANSWER_LENGTHS, EFFORTS, MODELS } from "@/lib/settings";
import { adminTexts as t } from "@/lib/texts";

type Settings = { model: string; effort: string; answerLength: string };
type Prompt = { id: string; name: string; content: string; isActive: boolean; createdAt: string };

export function TestTab({ onChanged }: { onChanged: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null; name: string; content: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api<Settings>("/api/admin/settings"), api<Prompt[]>("/api/admin/prompts")]);
      setSettings(s);
      setPrompts(p);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<Settings>("/api/admin/settings"), api<Prompt[]>("/api/admin/prompts")])
      .then(([s, p]) => {
        if (cancelled) return;
        setSettings(s);
        setPrompts(p);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : t.error));
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateSettings(change: Partial<Settings>) {
    try {
      setSettings(await api<Settings>("/api/admin/settings", { method: "PUT", body: JSON.stringify(change) }));
      toast.success(t.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function activate(id: string) {
    try {
      await api(`/api/admin/prompts/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: true }) });
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function savePrompt() {
    if (!editing) return;
    try {
      const body = JSON.stringify({ name: editing.name, content: editing.content });
      if (editing.id) await api(`/api/admin/prompts/${editing.id}`, { method: "PATCH", body });
      else await api("/api/admin/prompts", { method: "POST", body });
      setEditing(null);
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function deletePrompt(prompt: Prompt) {
    if (prompt.isActive) {
      toast.error(t.activeCantDelete);
      return;
    }
    if (!window.confirm(t.confirmDeletePrompt)) return;
    try {
      await api(`/api/admin/prompts/${prompt.id}`, { method: "DELETE" });
      toast.success(t.deleted);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  const activePrompt = prompts.find((p) => p.isActive);
  const promptItems = prompts.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t.model}>
            <Select items={MODELS} value={settings?.model ?? null} onValueChange={(v) => v && void updateSettings({ model: String(v) })}>
              <SelectTrigger className="h-10 min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t.prompts}>
            <div className="flex gap-2">
              <Select items={promptItems} value={activePrompt?.id ?? null} onValueChange={(v) => v && void activate(String(v))}>
                <SelectTrigger className="h-10 min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setManaging(true)} className="h-10">
                {t.managePrompts}
              </Button>
            </div>
          </Field>

          <Field label={t.effort}>
            <Select items={EFFORTS} value={settings?.effort ?? null} onValueChange={(v) => v && void updateSettings({ effort: String(v) })}>
              <SelectTrigger className="h-10 min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EFFORTS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t.answerLength}>
            <Select
              items={ANSWER_LENGTHS}
              value={settings?.answerLength ?? null}
              onValueChange={(v) => v && void updateSettings({ answerLength: String(v) })}
            >
              <SelectTrigger className="h-10 min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANSWER_LENGTHS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{t.settingsNote}</p>
      </div>

      <div className="h-[620px] overflow-hidden rounded-xl border border-border bg-background">
        <Chat source="owner" storageKey={null} onSent={onChanged} />
      </div>

      <Dialog open={managing} onOpenChange={setManaging}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.managePrompts}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="prompt-name">{t.promptName}</Label>
                <Input
                  id="prompt-name"
                  className="h-10"
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt-content">{t.promptContent}</Label>
                <Textarea
                  id="prompt-content"
                  rows={14}
                  className="font-mono text-xs"
                  value={editing.content}
                  onChange={(event) => setEditing({ ...editing, content: event.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)} className="h-10">
                  {t.cancel}
                </Button>
                <Button onClick={() => void savePrompt()} disabled={!editing.name.trim() || !editing.content.trim()} className="h-10">
                  {t.save}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {prompts.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    {p.isActive ? (
                      <Badge>{t.active}</Badge>
                    ) : (
                      <Button variant="outline" onClick={() => void activate(p.id)} className="h-9">
                        {t.activate}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing({ id: p.id, name: p.name, content: p.content })}
                      className="size-9"
                      aria-label={t.edit}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deletePrompt(p)}
                      className="size-9 text-muted-foreground hover:text-destructive"
                      aria-label={t.delete}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => setEditing({ id: null, name: t.newPrompt, content: activePrompt?.content ?? "" })}
                className="h-10"
              >
                <Plus />
                {t.newPrompt}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
