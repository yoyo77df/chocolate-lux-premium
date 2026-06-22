import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Layout } from "../components/Layout";
import { ProductCard, type Product } from "../components/ProductCard";
import { getFirebase } from "../lib/firebase";
import { Search } from "lucide-react";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — ChocoLux" }, { name: "description", content: "Browse our full collection of premium handcrafted chocolates." }] }),
  component: Shop,
});

function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
        setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])), [products]);

  const filtered = useMemo(() => {
    let r = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== "all") r = r.filter((p) => p.category === category);
    if (sort === "price-asc") r = [...r].sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    if (sort === "price-desc") r = [...r].sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    return r;
  }, [products, search, category, sort]);

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <span className="text-xs uppercase tracking-[0.3em] text-primary">Collection</span>
          <h1 className="text-5xl font-bold mt-2">All Chocolates</h1>
          <p className="text-muted-foreground mt-2">Explore our complete range of handcrafted luxury chocolates.</p>
        </div>

        <div className="glass rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chocolates…"
              className="w-full bg-transparent border border-white/10 rounded-lg pl-11 pr-4 py-3 outline-none focus:border-primary"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-card border border-white/10 rounded-lg px-4 py-3 outline-none">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-card border border-white/10 rounded-lg px-4 py-3 outline-none">
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No chocolates match your filters.</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </Layout>
  );
}