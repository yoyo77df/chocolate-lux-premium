import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Layout } from "../components/Layout";
import { ProductCard, type Product } from "../components/ProductCard";
import { getFirebase } from "../lib/firebase";
import { Sparkles, Truck, ShieldCheck, Award } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChocoLux — Premium Handcrafted Chocolate" },
      { name: "description", content: "Discover ChocoLux — luxury handcrafted chocolates and gourmet gift boxes delivered worldwide." },
    ],
  }),
  component: Home,
});

function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(8));
        const snap = await getDocs(q);
        setFeatured(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary mb-6">
              <Sparkles className="w-3 h-3" /> Handcrafted Luxury
            </span>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05]">
              Indulge in <span className="gold-text">pure</span><br/> chocolate luxury
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Single-origin cacao, master chocolatiers, and obsessive attention to detail. Every bite is a moment of pure decadence.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/shop" className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                Shop Collection
              </Link>
              <Link to="/register" className="px-8 py-3 rounded-full gold-border hover:bg-primary/10 transition">
                Join ChocoLux
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-full glass gold-border overflow-hidden">
              <img src="https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=900&q=80" alt="Premium chocolate" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 gold-border">
              <div className="text-3xl font-bold gold-text">100+</div>
              <div className="text-xs text-muted-foreground">Unique flavors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12 grid md:grid-cols-4 gap-4">
        {[
          { icon: Award, t: "Award-Winning", d: "Recognized worldwide" },
          { icon: Truck, t: "Free Shipping", d: "On orders over $75" },
          { icon: ShieldCheck, t: "Quality Guarantee", d: "100% satisfaction" },
          { icon: Sparkles, t: "Handcrafted", d: "Made fresh daily" },
        ].map((f) => (
          <div key={f.t} className="glass rounded-2xl p-6 text-center">
            <f.icon className="w-8 h-8 mx-auto text-primary mb-3" />
            <div className="font-semibold">{f.t}</div>
            <div className="text-sm text-muted-foreground">{f.d}</div>
          </div>
        ))}
      </section>

      {/* Featured products */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary">Collection</span>
            <h2 className="text-4xl font-bold mt-2">Featured Chocolates</h2>
          </div>
          <Link to="/shop" className="text-sm text-primary hover:underline hidden md:block">View all →</Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
            No products yet. <Link to="/admin" className="text-primary underline">Admin</Link> can add products.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </Layout>
  );
}
