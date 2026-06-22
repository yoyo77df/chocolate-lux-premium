import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useLang } from "../context/LanguageContext";

const head = () => ({ meta: [
  { title: "Admin Staff — ChocoLux" },
  { name: "description", content: "Manage ChocoLux staff roles and admin/moderator assignments." },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:title", content: "Admin Staff — ChocoLux" },
  { property: "og:description", content: "Manage staff roles and assignments." },
] });
export const Route = createFileRoute("/admin/staff")({ head,
  component: StaffList,
});

function StaffList() {
  const { t } = useLang();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["admin", "mod"])));
        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map((d) => d.data() as any);
        const list = usersSnap.docs.map((d) => {
          const u = d.data() as any;
          const confirmed = orders.filter((o) => o.confirmedBy?.uid === d.id);
          const totalValue = confirmed.reduce((s, o) => s + (o.total ?? 0), 0);
          return {
            uid: d.id,
            name: u.displayName ?? "—",
            email: u.email,
            role: u.role,
            confirmedCount: confirmed.length,
            totalValue,
            earnedSalary: u.earnedSalary ?? 0,
          };
        });
        setRows(list);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t("staff")}</h1>
      {loading ? <div>{t("loading")}</div> : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5">
              <tr><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Confirmed</th><th>Total Value</th><th>Earned Salary</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uid} className="border-t border-white/5">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="text-muted-foreground">{r.email}</td>
                  <td><span className={r.role === "admin" ? "text-primary" : "text-amber-400"}>{r.role}</span></td>
                  <td>{r.confirmedCount}</td>
                  <td className="gold-text font-semibold">${r.totalValue.toFixed(2)}</td>
                  <td className="gold-text font-semibold">৳ {Number(r.earnedSalary).toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No staff yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}