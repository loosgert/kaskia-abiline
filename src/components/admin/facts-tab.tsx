"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/admin/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseFactsCsv, type FactRow } from "@/lib/csv";
import { adminTexts as t } from "@/lib/texts";

type Fact = FactRow & { id: string };
const EMPTY: FactRow = { topic: "", question: "", answer: "", source: "" };

export function FactsTab() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; fact: FactRow } | null>(null);
  const [upload, setUpload] = useState<{ name: string; facts: FactRow[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setFacts(await api<Fact[]>("/api/admin/facts"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<Fact[]>("/api/admin/facts")
      .then((data) => !cancelled && setFacts(data))
      .catch((error) => toast.error(error instanceof Error ? error.message : t.error));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!editing) return;
    try {
      if (editing.id) {
        await api(`/api/admin/facts/${editing.id}`, { method: "PATCH", body: JSON.stringify(editing.fact) });
      } else {
        await api("/api/admin/facts", { method: "POST", body: JSON.stringify(editing.fact) });
      }
      setEditing(null);
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirmDeleteFact)) return;
    try {
      await api(`/api/admin/facts/${id}`, { method: "DELETE" });
      toast.success(t.deleted);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const parsed = parseFactsCsv(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    if (!parsed) {
      toast.error(t.uploadInvalid);
      return;
    }
    setUpload({ name: file.name, facts: parsed });
  }

  async function confirmUpload() {
    if (!upload) return;
    try {
      await api("/api/admin/facts", { method: "PUT", body: JSON.stringify({ facts: upload.facts }) });
      setUpload(null);
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  }

  const field = (key: keyof FactRow) => ({
    value: editing?.fact[key] ?? "",
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditing((prev) => (prev ? { ...prev, fact: { ...prev.fact, [key]: event.target.value } } : prev)),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing({ id: null, fact: EMPTY })} className="h-10">
          <Plus />
          {t.addFact}
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="h-10">
          <Paperclip />
          {t.uploadFacts}
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void onFile(event.target.files?.[0])} />
      </div>

      {upload && (
        <div className="flex flex-col gap-2 rounded-xl border border-ember/40 bg-card p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm">
            <span className="font-medium">{upload.name}</span> · {t.uploadPreview(upload.facts.length)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUpload(null)} className="h-10">
              {t.cancel}
            </Button>
            <Button onClick={() => void confirmUpload()} className="h-10">
              {t.uploadConfirm}
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {facts.map((f) => (
          <li key={f.id} className="flex gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{f.topic}</p>
              {f.question && <p className="text-sm font-medium">{f.question}</p>}
              <p className="text-sm">{f.answer}</p>
              {f.source && <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.source}</p>}
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing({ id: f.id, fact: { topic: f.topic, question: f.question, answer: f.answer, source: f.source } })}
                className="size-10"
                aria-label={t.edit}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void remove(f.id)}
                className="size-10 text-muted-foreground hover:text-destructive"
                aria-label={t.delete}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t.edit : t.newFact}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fact-topic">{t.factCols.topic}</Label>
              <Input id="fact-topic" className="h-10" {...field("topic")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fact-question">{t.factCols.question}</Label>
              <Input id="fact-question" className="h-10" {...field("question")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fact-answer">{t.factCols.answer}</Label>
              <Textarea id="fact-answer" rows={4} {...field("answer")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fact-source">{t.factCols.source}</Label>
              <Input id="fact-source" className="h-10" {...field("source")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="h-10">
              {t.cancel}
            </Button>
            <Button onClick={() => void save()} disabled={!editing?.fact.topic.trim() || !editing?.fact.answer.trim()} className="h-10">
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
