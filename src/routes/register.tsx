import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useLang, type Lang } from "../context/LanguageContext";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const { register, loginGoogle } = useAuth();
  const { lang, setLang, t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [chosenLang, setChosenLang] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setLang(chosenLang);
      await register(email, password, name, chosenLang);
      toast.success(t("create_account"));
      router.navigate({ to: "/" });
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-20 max-w-md">
        <div className="glass rounded-3xl p-8">
          <h1 className="text-3xl font-bold mb-2">{t("join_chocolux")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("create_account_subtitle")}</p>
          <form onSubmit={submit} className="space-y-4">
            <input required placeholder={t("full_name")} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary"/>
            <input required type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary"/>
            <input required type="password" minLength={6} placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary"/>
            <div>
              <label className="text-xs text-muted-foreground">{t("preferred_language")}</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setChosenLang("en")} className={`px-4 py-2 rounded-lg border ${chosenLang === "en" ? "border-primary bg-primary/10 text-primary" : "border-white/10"}`}>{t("english")}</button>
                <button type="button" onClick={() => setChosenLang("bn")} className={`px-4 py-2 rounded-lg border ${chosenLang === "bn" ? "border-primary bg-primary/10 text-primary" : "border-white/10"}`}>{t("bangla")}</button>
              </div>
            </div>
            <button disabled={busy} className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">{busy ? t("creating") : t("create_account")}</button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-white/10"/>OR<div className="flex-1 h-px bg-white/10"/></div>
          <button onClick={async () => { try { setLang(chosenLang); await loginGoogle(); router.navigate({ to: "/" }); } catch (e: any) { toast.error(e.message); } }} className="w-full px-6 py-3 rounded-full gold-border hover:bg-primary/10 font-medium">{t("continue_with_google")}</button>
          <p className="mt-6 text-sm text-center text-muted-foreground">{t("already_have_account")} <Link to="/login" className="text-primary hover:underline">{t("login")}</Link></p>
        </div>
      </section>
    </Layout>
  );
}
