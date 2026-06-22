import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const { t } = useLang();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { db } = getFirebase();
    try {
      const snap = await getDocs(query(collection(db, "categories"), orderBy("name", "asc")));
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch {
      const snap = await getDocs(collection(db, "categories"));
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    try {
      const { db } = getFirebase();
      await addDoc(collection(db, "categories"), { name: v, createdAt: serverTimestamp() });
      setName("");
      toast.success("Added");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function del(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      const { db } = getFirebase();
      await deleteDoc(doc(db, "categories", id));
      toast.success("Deleted");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t("categories")}</h1>
      <p className="text-sm text-muted-foreground mb-6">Create categories here, then pick them when adding/editing a product.</p>
      <form onSubmit={add} className="glass rounded-2xl p-4 flex gap-3 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("new_category")} className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm"/>
        <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm">{t("add")}</button>
      </form>
      {loading ? <div>{t("loading")}</div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5"><tr><th className="p-3">{t("category")}</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="p-3">{c.name}</td>
                  <td className="text-right pr-3"><button onClick={() => del(c.id)} className="p-2 hover:text-destructive"><Trash2 className="w-4 h-4"/></button></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">No categories yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}