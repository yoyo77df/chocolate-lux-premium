import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { BD_LOCATIONS, DIVISIONS, getDistricts, getUpazilas } from "../lib/bd-locations";
import { toast } from "sonner";
import { friendlyError } from "../lib/errors";
import { Search, Truck } from "lucide-react";

const head = () => ({ meta: [
  { title: "Admin Delivery ChocoLux" },
  { name: "description", content: "Configure delivery charges per district and query delivery info for any location in Bangladesh." },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:title", content: "Admin Delivery ChocoLux" },
  { property: "og:description", content: "Configure delivery charges and query delivery info." },
] });

export const Route = createFileRoute("/admin/delivery")({ head, component: AdminDelivery });

type DeliveryDoc = {
  defaultCharge: number;
  perDistrict: Record<string, number>;
  freeAbove?: number;
};

function AdminDelivery() {
  const [doc1, setDoc1] = useState<DeliveryDoc>({ defaultCharge: 80, perDistrict: {}, freeAbove: 0 });
  const [saving, setSaving] = useState(false);

  // query tool state
  const [qDivision, setQDivision] = useState("");
  const [qDistrict, setQDistrict] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const snap = await getDoc(doc(db, "settings", "delivery"));
        if (snap.exists()) {
          const d = snap.data() as any;
          setDoc1({
            defaultCharge: Number(d.defaultCharge ?? 80),
            perDistrict: d.perDistrict ?? {},
            freeAbove: Number(d.freeAbove ?? 0),
          });
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { db } = getFirebase();
      await setDoc(doc(db, "settings", "delivery"), { ...doc1, updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Saved");
    } catch (e: any) { toast.error(friendlyError(e)); }
    setSaving(false);
  }

  const allDistricts = useMemo(
    () => BD_LOCATIONS.flatMap((dv) => dv.districts.map((d) => ({ division: dv.name, district: d.name }))),
    []
  );

  const qDistricts = useMemo(() => getDistricts(qDivision), [qDivision]);
  const qInfo = useMemo(() => {
    if (!qDistrict) return null;
    const div = BD_LOCATIONS.find((d) => d.districts.some((x) => x.name === qDistrict));
    const upazilas = div ? getUpazilas(div.name, qDistrict) : [];
    const charge = doc1.perDistrict[qDistrict] ?? doc1.defaultCharge;
    return { division: div?.name ?? "—", upazilas, charge };
  }, [qDistrict, doc1]);

  const inputCls = "w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary";
  const selectCls = "w-full bg-card border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2"><Truck className="w-7 h-7 text-primary"/>Delivery</h1>

      {/* Query tool */}
      <section className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Search className="w-5 h-5"/>Query delivery info</h2>
        <p className="text-sm text-muted-foreground mb-4">Select a division and district to see all info and the delivery charge customers will pay for that destination.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Division</label>
            <select value={qDivision} onChange={(e) => { setQDivision(e.target.value); setQDistrict(""); }} className={selectCls}>
              <option value="">Select division</option>
              {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">District</label>
            <select disabled={!qDivision} value={qDistrict} onChange={(e) => setQDistrict(e.target.value)} className={selectCls}>
              <option value="">Select district</option>
              {qDistricts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>
        {qInfo && (
          <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Division</div>
              <div className="text-lg font-semibold">{qInfo.division}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">District</div>
              <div className="text-lg font-semibold">{qDistrict}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Delivery charge</div>
              <div className="text-lg font-semibold gold-text">${qInfo.charge.toFixed(2)}</div>
            </div>
            <div className="glass rounded-xl p-4 sm:col-span-3">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Upazilas / Thanas ({qInfo.upazilas.length})</div>
              <div className="flex flex-wrap gap-2">
                {qInfo.upazilas.map((u) => (
                  <span key={u} className="px-2 py-1 rounded-full bg-white/5 text-xs">{u}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Default + free-above */}
      <section className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Default charges</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Default delivery charge ($)</label>
            <input type="number" min={0} value={doc1.defaultCharge}
              onChange={(e) => setDoc1({ ...doc1, defaultCharge: Number(e.target.value) || 0 })}
              className={inputCls}/>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Free delivery above subtotal ($) — 0 to disable</label>
            <input type="number" min={0} value={doc1.freeAbove ?? 0}
              onChange={(e) => setDoc1({ ...doc1, freeAbove: Number(e.target.value) || 0 })}
              className={inputCls}/>
          </div>
        </div>
      </section>

      {/* Per-district overrides */}
      <section className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-1">Per-district charges</h2>
        <p className="text-sm text-muted-foreground mb-4">Leave blank to use the default charge.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-auto pr-1">
          {allDistricts.map(({ division, district }) => (
            <div key={district} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{district}</div>
                <div className="text-xs text-muted-foreground truncate">{division}</div>
              </div>
              <input
                type="number"
                min={0}
                placeholder={`${doc1.defaultCharge}`}
                value={doc1.perDistrict[district] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = { ...doc1.perDistrict };
                  if (v === "") delete next[district];
                  else next[district] = Number(v) || 0;
                  setDoc1({ ...doc1, perDistrict: next });
                }}
                className="w-24 bg-transparent border border-white/10 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button onClick={save} disabled={saving} className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
    </div>
  );
}
