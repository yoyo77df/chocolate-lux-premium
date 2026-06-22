import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useLang } from "../context/LanguageContext";
import { DollarSign, Package, ShoppingBag, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useLang();
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, users: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const [p, o, u] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "users")),
        ]);
        const orders = o.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const revenue = orders.reduce((s, x) => s + (x.total ?? 0), 0);
        setStats({ products: p.size, orders: o.size, revenue, users: u.size });
        orders.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setRecent(orders.slice(0, 5));
      } catch (e) { console.error(e); }
    })();
  }, []);

  const cards = [
    { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign },
    { label: "Orders", value: stats.orders, icon: ShoppingBag },
    { label: "Products", value: stats.products, icon: Package },
    { label: "Users", value: stats.users, icon: Users },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t("dashboard")}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <c.icon className="w-5 h-5 text-primary mb-3"/>
            <div className="text-2xl font-bold gold-text">{c.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{t("recent_orders")}</h2>
        {recent.length === 0 ? <div className="text-muted-foreground text-sm">No orders yet.</div> : (
          <ul className="divide-y divide-white/5 text-sm">
            {recent.map((o) => (
              <li key={o.id} className="py-3 flex items-center gap-3 min-w-0">
                <div className="font-mono text-xs shrink-0 w-20 truncate">#{o.id.slice(0, 8).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{o.customerName || o.shipping_info?.name || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{o.phone || o.shipping_info?.phone || o.userEmail}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">{o.status}</div>
                <div className="gold-text font-semibold shrink-0 whitespace-nowrap">${Number(o.total ?? 0).toFixed(2)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
