import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getFirebase } from "../lib/firebase";

function getSavedOrderIds(uid: string) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`chocolux_order_ids_${uid}`) || "[]");
    return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders ChocoLux" },
      { name: "description", content: "View your ChocoLux order history and track recent chocolate purchases." },
      { property: "og:title", content: "My Orders ChocoLux" },
      { property: "og:description", content: "View your ChocoLux order history and track recent chocolate purchases." },
      { property: "og:url", content: "https://web-muse-fix.lovable.app/orders" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://web-muse-fix.lovable.app/orders" }],
  }),
  component: Orders,
});

function Orders() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.navigate({ to: "/login" }); return; }
    (async () => {
      try {
        const { db } = getFirebase();
        const map = new Map<string, any>();
        try {
          const byUid = await getDocs(query(collection(db, "orders"), where("userId", "==", user.uid), limit(1000)));
          const byEmail = user.email
            ? await getDocs(query(collection(db, "orders"), where("userEmail", "==", user.email), limit(1000)))
            : null;
          [...byUid.docs, ...(byEmail?.docs ?? [])].forEach((d) => map.set(d.id, { id: d.id, ...(d.data() as any) }));
        } catch (e) {
          console.warn("order query skipped, loading saved order ids", e);
        }
        if (map.size === 0) {
          const profileSnap = await getDoc(doc(db, "users", user.uid));
          const profileOrderIds = profileSnap.exists() && Array.isArray((profileSnap.data() as any).orderIds)
            ? (profileSnap.data() as any).orderIds.slice(-1000)
            : [];
          const orderIds = Array.from(new Set([...profileOrderIds, ...getSavedOrderIds(user.uid)])).slice(-1000);
          const savedOrders = await Promise.all(
            orderIds.map(async (id: string) => {
              try {
                const snap = await getDoc(doc(db, "orders", id));
                return snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null;
              } catch {
                return null;
              }
            }),
          );
          savedOrders.forEach((o) => { if (o) map.set(o.id, o); });
        }
        const list = Array.from(map.values());
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setOrders(list);
      } catch (e) { console.error(e); }
      setBusy(false);
    })();
  }, [user, loading, router]);

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">My Orders</h1>
        {busy ? <div>Loading…</div> : orders.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-muted-foreground mb-4">No orders yet.</p>
            <Link to="/shop" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold inline-block">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const status = (o.status || "pending") as string;
              const statusClass =
                status === "delivered" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                status === "cancelled" ? "bg-destructive/20 text-destructive border-destructive/30" :
                status === "shipped" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                status === "confirmed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                status === "processing" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
              const si = o.shipping_info || {};
              const customerName = o.customerName || si.name || user?.displayName || user?.email || "—";
              const orderName = (o.items?.[0]?.name) ? (o.items.length > 1 ? `${o.items[0].name} +${o.items.length - 1} more` : o.items[0].name) : "Order";
              return (
                <div key={o.id} className="glass rounded-2xl p-6">
                  <div className="flex justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-lg font-semibold truncate">{orderName}</div>
                      <div className="text-sm text-muted-foreground">Customer: <span className="text-foreground">{customerName}</span></div>
                      <div className="text-xs text-muted-foreground">{o.createdAt?.toDate?.().toLocaleString?.() ?? ""}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${statusClass}`}>{status}</span>
                      <span className="font-bold gold-text">${Number(o.total ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {o.items?.map((it: any) => (
                      <div key={it.id} className="flex gap-2 items-center">
                        <div className="w-12 h-12 rounded overflow-hidden">{it.image && <img src={it.image} className="w-full h-full object-contain"/>}</div>
                        <div className="truncate min-w-0"><div className="truncate">{it.name}</div><div className="text-muted-foreground">× {it.qty}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
}