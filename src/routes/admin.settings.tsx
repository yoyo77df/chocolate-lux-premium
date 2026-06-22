import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { uploadImageWithFallback } from "../lib/uploadImage";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { t } = useLang();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { db } = getFirebase();
      const snap = await getDoc(doc(db, "settings", "site"));
      if (snap.exists()) setLogoUrl((snap.data() as any).logoUrl ?? "");
    })();
  }, []);

  async function uploadLogo(file: File) {
    try {
      setUploading(true);
      const url = await uploadImageWithFallback(file, "settings");
      setLogoUrl(url);
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  }

  async function save() {
    try {
      const { db } = getFirebase();
      await setDoc(doc(db, "settings", "site"), { logoUrl, updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Saved — refresh to see new logo");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t("settings")}</h1>
      <div className="glass rounded-2xl p-6 max-w-xl">
        <h2 className="text-lg font-semibold mb-2">Site logo</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload a logo image — it will appear in the navbar.</p>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
            {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer"/> : <span className="text-2xl">🍫</span>}
          </div>
          <label className="cursor-pointer px-4 py-2 rounded-lg gold-border hover:bg-primary/10 inline-flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4"/>{uploading ? "Uploading…" : "Upload logo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}/>
          </label>
        </div>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="or paste image URL" className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm mb-4"/>
        <button onClick={save} className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold">{t("save")}</button>
      </div>
    </div>
  );
}