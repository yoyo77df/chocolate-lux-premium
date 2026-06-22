import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { friendlyError } from "../lib/errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — ChocoLux" },
      { name: "description", content: "Sign in to your ChocoLux account to manage orders and continue shopping premium chocolates." },
      { property: "og:title", content: "Sign In — ChocoLux" },
      { property: "og:description", content: "Sign in to your ChocoLux account to manage orders and continue shopping." },
      { property: "og:url", content: "https://web-muse-fix.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://web-muse-fix.lovable.app/login" }],
  }),
  component: Login,
});

function Login() {
  const { login, loginGoogle, resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      router.navigate({ to: "/" });
    } catch (e: any) { toast.error(friendlyError(e)); }
    setBusy(false);
  }
  async function google() {
    try { await loginGoogle(); router.navigate({ to: "/" }); } catch (e: any) { toast.error(friendlyError(e)); }
  }
  async function reset() {
    if (!email) return toast.error("Enter your email first");
    try { await resetPassword(email); toast.success("Reset link sent"); } catch (e: any) { toast.error(friendlyError(e)); }
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-20 max-w-md">
        <div className="glass rounded-3xl p-8">
          <h1 className="text-3xl font-bold mb-2">Sign in to ChocoLux</h1>
          <p className="text-sm text-muted-foreground mb-6">Welcome back — access your account to manage orders.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="sr-only">Email</label>
              <input id="login-email" required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary"/>
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input id="login-password" required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-primary"/>
            </div>
            <button disabled={busy} className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">{busy ? "Signing in…" : "Sign In"}</button>
          </form>
          <button onClick={reset} className="mt-3 text-xs text-muted-foreground hover:text-primary">Forgot password?</button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-white/10"/>OR<div className="flex-1 h-px bg-white/10"/></div>
          <button onClick={google} className="w-full px-6 py-3 rounded-full gold-border hover:bg-primary/10 font-medium">Continue with Google</button>
          <p className="mt-6 text-sm text-center text-muted-foreground">No account? <Link to="/register" className="text-primary hover:underline">Register</Link></p>
        </div>
      </section>
    </Layout>
  );
}