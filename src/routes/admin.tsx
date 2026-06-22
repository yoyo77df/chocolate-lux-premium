import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { LayoutDashboard, Package, ShoppingBag, Users, Settings as SettingsIcon, Coins, BadgeDollarSign, CreditCard, Tags } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading, isAdmin, isMod } = useAuth();
  const { t } = useLang();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.navigate({ to: "/login" });
  }, [user, loading, router]);

  if (loading) return <Layout><div className="container mx-auto px-4 py-20">{t("loading")}</div></Layout>;
  if (!user) return null;
  if (!isAdmin && !isMod) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">{t("access_denied")}</h1>
          <p className="text-muted-foreground mt-2">Your account does not have admin privileges.</p>
          <p className="text-xs text-muted-foreground mt-4">Set <code className="text-primary">role: "admin"</code> on <code className="text-primary">users/{user.uid}</code> in Firestore to unlock.</p>
        </div>
      </Layout>
    );
  }

  const linkCls = "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5";
  const activeCls = { className: "bg-primary/10 text-primary" };

  return (
    <Layout>
      <section className="container mx-auto px-4 py-8 grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="glass rounded-2xl p-4 h-fit">
          <div className="text-xs uppercase tracking-widest text-muted-foreground px-3 mb-3">{t("admin")}</div>
          <nav className="space-y-1 text-sm">
            {isAdmin && <Link to="/admin" activeOptions={{ exact: true }} activeProps={activeCls} className={linkCls}><LayoutDashboard className="w-4 h-4"/>{t("dashboard")}</Link>}
            {isAdmin && <Link to="/admin/products" activeProps={activeCls} className={linkCls}><Package className="w-4 h-4"/>{t("products")}</Link>}
            {isAdmin && <Link to="/admin/categories" activeProps={activeCls} className={linkCls}><Tags className="w-4 h-4"/>{t("categories")}</Link>}
            <Link to="/admin/orders" activeProps={activeCls} className={linkCls}><ShoppingBag className="w-4 h-4"/>{t("orders")}</Link>
            {isAdmin && <Link to="/admin/users" activeProps={activeCls} className={linkCls}><Users className="w-4 h-4"/>{t("users")}</Link>}
            {isAdmin && <Link to="/admin/staff" activeProps={activeCls} className={linkCls}><Users className="w-4 h-4"/>{t("staff")}</Link>}
            {isAdmin && <Link to="/admin/salary" activeProps={activeCls} className={linkCls}><Coins className="w-4 h-4"/>{t("salary_rules")}</Link>}
            {isAdmin && <Link to="/admin/mod-payments" activeProps={activeCls} className={linkCls}><BadgeDollarSign className="w-4 h-4"/>{t("mod_payments")}</Link>}
            {isMod && <Link to="/admin/payment-method" activeProps={activeCls} className={linkCls}><CreditCard className="w-4 h-4"/>{t("payment_methods")}</Link>}
            {isAdmin && <Link to="/admin/settings" activeProps={activeCls} className={linkCls}><SettingsIcon className="w-4 h-4"/>{t("settings")}</Link>}
          </nav>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </section>
    </Layout>
  );
}
