import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fragment } from "react";
import { collection, deleteDoc, doc, getDocs, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["pending", "processing", "confirmed", "shipped", "delivered", "cancelled"];

function AdminOrders() {
  const { profile, user, isAdmin, isMod } = useAuth();
  const { t } = useLang();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { db } = getFirebase();
    const snap = await getDocs(collection(db, "orders"));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    setOrders(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Find matching salary rule and credit mod balance
  async function applySalary(modUid: string, orderTotal: number) {
    try {
      const { db } = getFirebase();
      const rulesSnap = await getDocs(collection(db, "salaryRules"));
      const rules = rulesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // Find rule whose [minOrderValue, maxOrderValue] contains orderTotal
      const match = rules.find((r) =>
        typeof r.minOrderValue === "number" &&
        typeof r.maxOrderValue === "number" &&
        orderTotal >= r.minOrderValue &&
        orderTotal <= r.maxOrderValue,
      );
      if (!match) return 0;
      const amount = Number(match.salaryAmount) || 0;
      const userRef = doc(db, "users", modUid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        const cur = (snap.exists() ? (snap.data() as any).earnedSalary : 0) || 0;
        tx.update(userRef, { earnedSalary: cur + amount });
      });
      return amount;
    } catch (e) {
      console.error("applySalary", e);
      return 0;
    }
  }

  async function setStatus(o: any, status: string) {
    try {
      const { db } = getFirebase();
      const update: any = { status };
      const becomingConfirmed = status === "confirmed" && o.status !== "confirmed";
      if (becomingConfirmed && user && profile) {
        update.confirmedBy = {
          uid: user.uid,
          name: profile.displayName || user.email || "staff",
          role: profile.role,
        };
        update.confirmedAt = serverTimestamp();
      }
      await updateDoc(doc(db, "orders", o.id), update);

      if (becomingConfirmed && profile?.role === "mod" && user) {
        const credited = await applySalary(user.uid, o.total ?? 0);
        if (credited > 0) {
          await updateDoc(doc(db, "orders", o.id), { salaryCredited: credited });
        }
      }
      toast.success("Status updated");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteOrder(o: any) {
    if (!confirm(`Delete order #${o.id.slice(0,8).toUpperCase()}? This cannot be undone.`)) return;
    try {
      const { db } = getFirebase();
      await deleteDoc(doc(db, "orders", o.id));
      toast.success("Order deleted");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t("orders")}</h1>
      {loading ? <div>{t("loading")}</div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5">
                <tr>
                  <th className="p-3">Order</th>
                  <th>{t("customer")}</th>
                  <th>Phone</th>
                  <th>{t("items")}</th>
                  <th>{t("total")}</th>
                  <th>{t("confirmed_by")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const si = o.shipping_info || {};
                  const expanded = open === o.id;
                  return (
                    <Fragment key={o.id}>
                      <tr className="border-t border-white/5 align-top">
                        <td className="p-3 font-mono text-xs">
                          <div>#{o.id.slice(0, 8).toUpperCase()}</div>
                          <button onClick={() => setOpen(expanded ? null : o.id)} className="mt-1 p-1 -ml-1 hover:text-primary inline-flex items-center" aria-label="Toggle details">
                            {expanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                          </button>
                        </td>
                        <td className="max-w-[160px]">
                          <div className="font-medium truncate">{o.customerName || si.name || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">{o.userEmail}</div>
                        </td>
                        <td className="text-xs whitespace-nowrap">{o.phone || si.phone || "—"}</td>
                        <td>{o.items?.length ?? 0}</td>
                        <td className="gold-text font-semibold whitespace-nowrap">${Number(o.total ?? 0).toFixed(2)}</td>
                        <td className="text-xs">{o.confirmedBy ? <span><span className="font-medium">{o.confirmedBy.name}</span> <span className="text-muted-foreground">({o.confirmedBy.role})</span></span> : "—"}</td>
                        <td>
                          <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className="bg-card border border-white/10 rounded px-2 py-1">
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-t border-white/5 bg-white/[0.02]">
                          <td colSpan={7} className="p-4 text-xs">
                            <div className="rounded-xl border border-white/10 p-4 sm:p-5 bg-white/[0.02]">
                              <div className="text-sm font-semibold text-primary mb-3">{t("details")}</div>
                              <dl className="text-sm divide-y divide-white/5">
                                {[
                                  [t("your_name"), o.customerName || si.name],
                                  [t("mobile_number"), o.phone || si.phone],
                                  [t("mobile_number_2"), o.phone2 || si.phone2],
                                  [t("department"), o.division || si.division],
                                  [t("district"), o.district || si.district],
                                  [t("upazila"), o.upazila || si.upazila],
                                  [t("full_address"), o.fullAddress || si.address],
                                  [t("order_note"), o.orderNote || si.note],
                                  [t("payment_method"), si.payment],
                                  ...(isAdmin && o.salaryCredited != null ? [["Salary credited", `৳ ${Number(o.salaryCredited).toFixed(2)}`]] : []),
                                ].map(([label, val], i) => (
                                  <div key={i} className="grid grid-cols-[140px_auto_1fr] gap-2 py-2">
                                    <dt className="text-muted-foreground">{label}</dt>
                                    <dd className="text-muted-foreground">—</dd>
                                    <dd className="break-words whitespace-pre-wrap">{val || <span className="text-muted-foreground/60">—</span>}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                            <div className="mt-4">
                              <div className="text-muted-foreground mb-1">{t("items")}</div>
                              <ul className="space-y-1">
                                {(o.items ?? []).map((it: any) => (
                                  <li key={it.id} className="flex justify-between gap-2 border-t border-white/5 pt-1"><span className="truncate">{it.name} × {it.qty}</span><span className="shrink-0">${(it.price * it.qty).toFixed(2)}</span></li>
                                ))}
                              </ul>
                            </div>
                            {isAdmin && (
                              <div className="mt-4 flex justify-end">
                                <button onClick={() => deleteOrder(o)} className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-semibold">
                                  <Trash2 className="w-3.5 h-3.5"/>{t("delete_order")}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isMod && <p className="mt-4 text-xs text-muted-foreground">Confirm an order to record it under your name.</p>}
    </div>
  );
}
