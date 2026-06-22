import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { Layout } from "../components/Layout";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { getFirebase } from "../lib/firebase";
import { BD_LOCATIONS, getDistricts, getUpazilas, DIVISIONS } from "../lib/bd-locations";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const cart = useCart();
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    phone2: "",
    division: "",
    district: "",
    upazila: "",
    address: "",
    note: "",
    payment: "cod",
  });

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/login" });
  }, [loading, user, router]);

  const districts = useMemo(() => getDistricts(form.division), [form.division]);
  const upazilas = useMemo(() => getUpazilas(form.division, form.district), [form.division, form.district]);

  const subtotal = cart.total;
  const shipping = subtotal >= 75 || subtotal === 0 ? 0 : 7.99;
  const total = subtotal + shipping;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (cart.items.length === 0) { toast.error(t("cart_empty")); return; }
    setSubmitting(true);
    try {
      const { db } = getFirebase();
      // Recompute prices server-trusted: read each product price from Firestore
      // inside the transaction and validate stock. Never trust client prices.
      const verified = await runTransaction(db, async (tx) => {
        const lines: { id: string; name: string; qty: number; price: number; image?: string }[] = [];
        for (const it of cart.items) {
          const ref = doc(db, "products", it.id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error(`Product ${it.name} not found`);
          const data = snap.data() as any;
          const stock = data.stock ?? 0;
          if (stock < it.qty) throw new Error(`Insufficient stock for ${it.name}`);
          const price = Number(data.price);
          if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid price for ${it.name}`);
          tx.update(ref, { stock: stock - it.qty });
          lines.push({ id: it.id, name: data.name ?? it.name, qty: it.qty, price, image: data.image ?? it.image });
        }
        const serverSubtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
        const serverShipping = serverSubtotal >= 75 || serverSubtotal === 0 ? 0 : 7.99;
        const serverTotal = serverSubtotal + serverShipping;
        return { lines, serverSubtotal, serverShipping, serverTotal };
      });
      const order = {
        userId: user.uid,
        userEmail: user.email,
        items: verified.lines,
        subtotal: verified.serverSubtotal,
        shipping: verified.serverShipping,
        total: verified.serverTotal,
        shipping_info: form,
        // also flatten common fields for admin order list display
        customerName: form.name,
        phone: form.phone,
        phone2: form.phone2,
        division: form.division,
        district: form.district,
        upazila: form.upazila,
        fullAddress: form.address,
        orderNote: form.note,
        status: "pending",
        confirmedBy: null,
        confirmedAt: null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "orders"), order);
      cart.clear();
      toast.success(t("order_placed"));
      router.navigate({ to: "/orders" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to place order");
    }
    setSubmitting(false);
  }

  const inputCls = "w-full mt-1 bg-transparent border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary";
  const selectCls = "w-full mt-1 bg-card border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary";

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">{t("checkout")}</h1>
        <form onSubmit={placeOrder} className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">{t("shipping_info")}</h2>

            <div>
              <label className="text-sm text-muted-foreground">{t("your_name")}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls}/>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">{t("mobile_number")}</label>
                <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls}/>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{t("mobile_number_2")}</label>
                <input type="tel" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} className={inputCls}/>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">{t("department")}</label>
                <select required value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value, district: "", upazila: "" })} className={selectCls}>
                  <option value="">{t("select_division")}</option>
                  {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{t("district")}</label>
                <select required disabled={!form.division} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, upazila: "" })} className={selectCls}>
                  <option value="">{t("select_district")}</option>
                  {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{t("upazila")}</label>
                <select required disabled={!form.district} value={form.upazila} onChange={(e) => setForm({ ...form, upazila: e.target.value })} className={selectCls}>
                  <option value="">{t("select_upazila")}</option>
                  {upazilas.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">{t("full_address")}</label>
              <textarea required rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls}/>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">{t("order_note")}</label>
              <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls}/>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">{t("payment_method")}</label>
              <select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} className={selectCls}>
                <option value="cod">{t("cod")}</option>
                <option value="card">{t("card")}</option>
              </select>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">{t("summary")}</h2>
            <div className="space-y-2 text-sm max-h-60 overflow-auto">
              {cart.items.map((it) => (
                <div key={it.id} className="flex justify-between gap-2"><span className="truncate min-w-0">{it.name} × {it.qty}</span><span className="shrink-0">${(it.price * it.qty).toFixed(2)}</span></div>
              ))}
            </div>
            <div className="border-t border-white/10 mt-4 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>{t("subtotal")}</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>{t("shipping")}</span><span>{shipping === 0 ? t("free") : `$${shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>{t("total")}</span><span className="gold-text">${total.toFixed(2)}</span></div>
            </div>
            <button disabled={submitting || cart.items.length === 0} className="mt-6 w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
              {submitting ? t("placing") : t("place_order")}
            </button>
          </div>
        </form>
      </section>
    </Layout>
  );
}
