import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { uploadImageWithFallback } from "../lib/uploadImage";
import type { Product } from "../components/ProductCard";
import { SafeImage } from "../components/SafeImage";
import { toast } from "sonner";
import { friendlyError } from "../lib/errors";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";

const head = () => ({ meta: [
  { title: "Admin Products — ChocoLux" },
  { name: "description", content: "Manage ChocoLux product catalog: create, edit and remove premium chocolate listings." },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:title", content: "Admin Products — ChocoLux" },
  { property: "og:description", content: "Manage the ChocoLux product catalog." },
] });
export const Route = createFileRoute("/admin/products")({ head,
  component: AdminProducts,
});

type Form = {
  name: string; description: string; price: string; discountPrice: string;
  stock: string; category: string; image: string; featured: boolean;
};
const empty: Form = { name: "", description: "", price: "", discountPrice: "", stock: "", category: "", image: "", featured: false };

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [uploading, setUploading] = useState(false);
  const [show, setShow] = useState(false);

  async function load() {
    setLoading(true);
    const { db } = getFirebase();
    const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
    setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    try {
      const cs = await getDocs(collection(db, "categories"));
      setCategories(cs.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadImageWithFallback(file, "products");
      setForm((f) => ({ ...f, image: url }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(friendlyError(e)); }
    setUploading(false);
  }

  function startNew() { setEditing(null); setForm(empty); setShow(true); }
  function startEdit(p: Product) {
    setEditing(p.id);
    setForm({
      name: p.name, description: p.description ?? "", price: String(p.price),
      discountPrice: p.discountPrice != null ? String(p.discountPrice) : "",
      stock: String(p.stock), category: p.category ?? "", image: p.image ?? "", featured: !!p.featured,
    });
    setShow(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { db } = getFirebase();
    const data: any = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      stock: Number(form.stock),
      category: form.category.trim() || null,
      image: form.image,
      featured: form.featured,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, "products", editing), data);
        toast.success("Updated");
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
        toast.success("Created");
      }
      setShow(false);
      load();
    } catch (e: any) { toast.error(friendlyError(e)); }
  }

  async function del(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      const { db } = getFirebase();
      await deleteDoc(doc(db, "products", p.id));
      toast.success("Deleted");
      load();
    } catch (e: any) { toast.error(friendlyError(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <button onClick={startNew} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>New</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5"><tr><th className="p-3">Image</th><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="p-3"><div className="w-12 h-12 rounded bg-muted overflow-hidden"><SafeImage src={p.image} alt={p.name} className="w-full h-full object-cover"/></div></td>
                  <td>{p.name}</td>
                  <td>${(p.discountPrice ?? p.price).toFixed(2)}</td>
                  <td>{p.stock}</td>
                  <td className="text-right pr-3">
                    <button onClick={() => startEdit(p)} className="p-2 hover:text-primary"><Pencil className="w-4 h-4"/></button>
                    <button onClick={() => del(p)} className="p-2 hover:text-destructive"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No products yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShow(false)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? "Edit Product" : "New Product"}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-transparent border border-white/10 rounded-lg px-3 py-2"/>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-card border border-white/10 rounded-lg px-3 py-2">
                <option value="">— Select category —</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input required type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-transparent border border-white/10 rounded-lg px-3 py-2"/>
              <input type="number" step="0.01" placeholder="Discount price (optional)" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} className="bg-transparent border border-white/10 rounded-lg px-3 py-2"/>
              <input required type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-transparent border border-white/10 rounded-lg px-3 py-2"/>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}/>Featured</label>
            </div>
            <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-3 w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"/>
            <div className="mt-3">
              <label className="text-sm text-muted-foreground">Product image</label>
              <div className="mt-2 flex items-center gap-3">
                {form.image && <SafeImage src={form.image} alt="" className="w-20 h-20 rounded-lg object-cover"/>}
                <label className="cursor-pointer px-4 py-2 rounded-lg gold-border hover:bg-primary/10 inline-flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4"/>{uploading ? "Uploading…" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}/>
                </label>
                <input placeholder="or paste image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm"/>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-lg hover:bg-white/5">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold">{editing ? "Save" : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}