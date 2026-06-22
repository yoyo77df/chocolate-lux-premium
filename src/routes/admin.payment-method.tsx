import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payment-method")({
  component: PaymentMethodPage,
});

const PROVIDERS = ["bKash", "Nagad", "Rocket", "Upay", "Bank"];

function PaymentMethodPage() {
  const { user, profile, reloadProfile } = useAuth();
  const { t } = useLang();
  const [provider, setProvider] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !provider) return;
    setBusy(true);
    try {
      const { db } = getFirebase();
      await updateDoc(doc(db, "users", user.uid), {
        paymentMethods: arrayUnion({ provider, number, addedAt: new Date().toISOString() }),
        paymentUpdatedAt: serverTimestamp(),
      });
      toast.success("Submitted");
      setProvider(""); setNumber("");
      await reloadProfile();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t("payment_methods")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("add_payment_number")}</p>

      <form onSubmit={submit} className="glass rounded-2xl p-6 max-w-lg space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">{t("provider")}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button type="button" key={p} onClick={() => setProvider(p)}
                className={`px-4 py-2 rounded-full text-sm border ${provider === p ? "border-primary bg-primary/10 text-primary" : "border-white/10 hover:bg-white/5"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {provider && (
          <div>
            <label className="text-sm text-muted-foreground">{provider} {t("account_number")}</label>
            <input required value={number} onChange={(e) => setNumber(e.target.value)} className="w-full mt-1 bg-transparent border border-white/10 rounded-lg px-4 py-3"/>
          </div>
        )}
        <button disabled={busy || !provider || !number} className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50">{t("submit")}</button>
      </form>

      <div className="mt-6 glass rounded-2xl p-6 max-w-lg">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Your saved methods</h2>
        {(profile?.paymentMethods ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No payment methods yet.</div>
        ) : (
          <ul className="text-sm space-y-2">
            {profile!.paymentMethods!.map((pm, i) => (
              <li key={i} className="flex justify-between border-t border-white/5 pt-2 first:border-0 first:pt-0"><span className="capitalize">{pm.provider}</span><span className="font-mono">{pm.number}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}