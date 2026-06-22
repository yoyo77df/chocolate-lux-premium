import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/salary")({
  component: SalaryRules,
});

function SalaryRules() {
  const { t } = useLang();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: "", minOrderValue: "", maxOrderValue: "", salaryAmount: "" });

  async function load() {
    setLoading(true);
    const { db } = getFirebase();
    try {
      const snap = await getDocs(query(collection(db, "salaryRules"), orderBy("minOrderValue", "asc")));
      setRules(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch {
      const snap = await getDocs(collection(db, "salaryRules"));
      setRules(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { db } = getFirebase();
      await addDoc(collection(db, "salaryRules"), {
        label: form.label.trim() || `${form.minOrderValue}-${form.maxOrderValue}`,
        minOrderValue: Number(form.minOrderValue),
        maxOrderValue: Number(form.maxOrderValue),
        salaryAmount: Number(form.salaryAmount),
        createdAt: serverTimestamp(),
      });
      setForm({ label: "", minOrderValue: "", maxOrderValue: "", salaryAmount: "" });
      toast.success("Rule added");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function del(id: string) {
    if (!confirm("Delete this rule?")) return;
    const { db } = getFirebase();
    await deleteDoc(doc(db, "salaryRules", id));
    load();
  }

  const inputCls = "bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t("salary_rules")}</h1>
      <p className="text-sm text-muted-foreground mb-6">When a mod confirms an order whose total falls in a rule's range, that mod is automatically credited the rule's salary amount. Hidden from mods.</p>

      <form onSubmit={add} className="glass rounded-2xl p-4 grid sm:grid-cols-5 gap-3 mb-6">
        <input className={inputCls} placeholder="Label (e.g. Tier 1)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}/>
        <input className={inputCls} required type="number" placeholder="Min order ৳" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}/>
        <input className={inputCls} required type="number" placeholder="Max order ৳" value={form.maxOrderValue} onChange={(e) => setForm({ ...form, maxOrderValue: e.target.value })}/>
        <input className={inputCls} required type="number" placeholder="Salary ৳" value={form.salaryAmount} onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}/>
        <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm">Add Rule</button>
      </form>

      {loading ? <div>{t("loading")}</div> : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5">
              <tr><th className="p-3">Label</th><th>Order range</th><th>Salary</th><th></th></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3">{r.label}</td>
                  <td>৳ {r.minOrderValue} – ৳ {r.maxOrderValue}</td>
                  <td className="gold-text font-semibold">৳ {r.salaryAmount}</td>
                  <td className="text-right pr-3"><button onClick={() => del(r.id)} className="p-2 hover:text-destructive"><Trash2 className="w-4 h-4"/></button></td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No rules yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}