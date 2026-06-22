import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { toast } from "sonner";
import { friendlyError } from "../lib/errors";
import { Trash2, Plus, Save } from "lucide-react";

const head = () => ({ meta: [
  { title: "Admin Support — ChocoLux" },
  { name: "description", content: "Manage ChocoLux support page social media links and contact info." },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:title", content: "Admin Support — ChocoLux" },
  { property: "og:description", content: "Manage support page social links." },
] });
export const Route = createFileRoute("/admin/support")({ head, component: AdminSupport });

type Social = { platform: string; label: string; url: string };

const PLATFORMS = ["facebook", "instagram", "twitter", "youtube", "whatsapp", "telegram", "phone", "email", "website"];

function AdminSupport() {
  const [socials, setSocials] = useState<Social[]>([]);
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const snap = await getDoc(doc(db, "settings", "support"));
        if (snap.exists()) {
          const d = snap.data() as any;
          setSocials(Array.isArray(d.socials) ? d.socials : []);
          setInfo(d.info ?? "");
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  function update(i: number, patch: Partial<Social>) {
    setSocials((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function add() {
    setSocials((s) => [...s, { platform: "facebook", label: "", url: "" }]);
  }
  function remove(i: number) {
    setSocials((s) => s.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    try {
      const { db } = getFirebase();
      const clean = socials.filter((s) => s.url.trim());
      await setDoc(doc(db, "settings", "support"), { socials: clean, info }, { merge: true });
      toast.success("Support settings saved");
    } catch (e: any) { toast.error(friendlyError(e)); }
    setSaving(false);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support page</h1>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-2">
          <Save className="w-4 h-4"/>{saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="glass rounded-2xl p-5">
        <label htmlFor="support-info" className="block text-sm font-medium mb-2">Intro text (shown above social links)</label>
        <textarea
          id="support-info"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          rows={3}
          placeholder="e.g. We're here Mon–Fri 9am–6pm…"
          className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary"
        />
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Social media links</h2>
          <button onClick={add} className="text-sm px-3 py-1.5 rounded-full gold-border hover:bg-primary/10 flex items-center gap-1">
            <Plus className="w-4 h-4"/> Add link
          </button>
        </div>
        {socials.length === 0 && <p className="text-sm text-muted-foreground">No links yet. Click "Add link" to start.</p>}
        <ul className="space-y-3">
          {socials.map((s, i) => (
            <li key={i} className="grid grid-cols-1 md:grid-cols-[140px_1fr_2fr_auto] gap-2 items-center">
              <select
                value={s.platform}
                onChange={(e) => update(i, { platform: e.target.value })}
                aria-label="Platform"
                className="bg-transparent border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary"
              >
                {PLATFORMS.map((p) => <option key={p} value={p} className="bg-background">{p}</option>)}
              </select>
              <input
                value={s.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Label (e.g. @chocolux)"
                aria-label="Label"
                className="bg-transparent border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary"
              />
              <input
                value={s.url}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="URL (https://…) or mailto:/tel:"
                aria-label="URL"
                className="bg-transparent border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary"
              />
              <button onClick={() => remove(i)} aria-label="Remove" className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 justify-self-end">
                <Trash2 className="w-4 h-4"/>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
