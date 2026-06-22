import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { ShoppingBag, User, LogOut, LayoutDashboard, Menu, X, Globe } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isStaff, logout } = useAuth();
  const { count } = useCart();
  const { lang, setLang, t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const snap = await getDoc(doc(db, "settings", "site"));
        if (snap.exists()) setLogoUrl((snap.data() as any).logoUrl ?? null);
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="ChocoLux" className="h-8 md:h-10 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xl">🍫</span>
            )}
            <span className="text-base md:text-lg font-bold gold-text tracking-wide truncate">ChocoLux</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link to="/" className="hover:text-primary transition">{t("home")}</Link>
            <Link to="/shop" className="hover:text-primary transition">{t("shop")}</Link>
            <Link to="/orders" className="hover:text-primary transition">{t("orders")}</Link>
            {isStaff && <Link to="/admin" className="hover:text-primary transition">{t("admin")}</Link>}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              title={t("language")}
              className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-md gold-border hover:bg-primary/10"
            >
              <Globe className="w-3.5 h-3.5"/> {lang === "en" ? "EN" : "বাংলা"}
            </button>
            <Link to="/cart" className="relative p-2 rounded-md hover:bg-white/5">
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <button
                onClick={async () => { await logout(); router.navigate({ to: "/" }); }}
                className="hidden md:flex items-center gap-2 text-sm hover:text-primary max-w-[160px]"
                title={t("logout")}
              >
                <LogOut className="w-4 h-4 shrink-0" /> <span className="truncate">{user.displayName || t("logout")}</span>
              </button>
            ) : (
              <Link to="/login" className="hidden md:flex items-center gap-2 text-sm px-4 py-2 rounded-md gold-border hover:bg-primary/10">
                <User className="w-4 h-4" /> {t("login")}
              </Link>
            )}
            <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/5 px-4 py-4 flex flex-col gap-3 text-sm">
            <Link to="/" onClick={() => setOpen(false)}>{t("home")}</Link>
            <Link to="/shop" onClick={() => setOpen(false)}>{t("shop")}</Link>
            <Link to="/orders" onClick={() => setOpen(false)}>{t("orders")}</Link>
            {isStaff && <Link to="/admin" onClick={() => setOpen(false)}><LayoutDashboard className="inline w-4 h-4 mr-1"/>{t("admin")}</Link>}
            <button onClick={() => setLang(lang === "en" ? "bn" : "en")} className="text-left">
              <Globe className="inline w-4 h-4 mr-1"/> {lang === "en" ? "English" : "বাংলা"}
            </button>
            {user ? (
              <button onClick={async () => { await logout(); setOpen(false); }} className="text-left">{t("logout")}</button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)}>{t("login")}</Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/5 mt-20">
        <div className="container mx-auto px-4 py-10 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-xl font-bold gold-text mb-2">ChocoLux</div>
            <p className="text-muted-foreground">Handcrafted premium chocolate, delivered with luxury.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t("shop")}</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/shop">{t("shop")}</Link></li>
              <li><Link to="/cart">{t("cart")}</Link></li>
              <li><Link to="/orders">{t("orders")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/login">{t("login")}</Link></li>
              <li><Link to="/register">{t("register")}</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-white/5">
          © {new Date().getFullYear()} ChocoLux. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
