import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fragment } from "react";
import { collection, doc, getDocs, query, updateDoc, where, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/mod-payments")({
  component: ModPayments,
});

const STATUSES = ["pending", "paid", "hold"];

function ModPayments() {
  const { t } = useLang();
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { db } = getFirebase();
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "mod")));
      setMods(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(uid: string, status: string) {
    try {
      const { db } = getFirebase();
      await updateDoc(doc(db, "users", uid), { paymentStatus: status, paymentStatusAt: serverTimestamp() });
      toast.success("Payment status updated");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t("mod_payments")}</h1>
      {loading ? <div>{t("loading")}</div> : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5">
              <tr><th className="p-3">Name</th><th>Email</th><th>Earned</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {mods.map((m) => (
                <Fragment key={m.uid}>
                  <tr className="border-t border-white/5">
                    <td className="p-3 font-medium">{m.displayName ?? "—"}</td>
                    <td className="text-muted-foreground">{m.email}</td>
                    <td className="gold-text font-semibold">৳ {Number(m.earnedSalary ?? 0).toFixed(2)}</td>
                    <td>
                      <button onClick={() => setOpen(open === m.uid ? null : m.uid)} className="text-primary hover:underline text-xs">
                        {open === m.uid ? "Hide" : "View"} ({m.paymentMethods?.length ?? 0})
                      </button>
                    </td>
                    <td>
                      <select value={m.paymentStatus ?? "pending"} onChange={(e) => setStatus(m.uid, e.target.value)} className="bg-card border border-white/10 rounded px-2 py-1">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                  {open === m.uid && (
                    <tr className="border-t border-white/5 bg-white/[0.02]">
                      <td colSpan={5} className="p-4">
                        {(m.paymentMethods ?? []).length === 0 ? <div className="text-xs text-muted-foreground">This mod hasn't added a payment number yet.</div> : (
                          <ul className="text-sm space-y-1">
                            {m.paymentMethods.map((pm: any, i: number) => (
                              <li key={i} className="flex justify-between"><span className="capitalize">{pm.provider}</span><span className="font-mono">{pm.number}</span></li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {mods.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No mods yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}