import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Layout } from "../components/Layout";
import { getFirebase } from "../lib/firebase";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { SafeImage } from "../components/SafeImage";
import { toast } from "sonner";
import type { Product } from "../components/ProductCard";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";

async function fetchProductMeta(id: string): Promise<{ name?: string; description?: string; image?: string; price?: number; stock?: number } | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/chocolate-lux/databases/(default)/documents/products/${encodeURIComponent(id)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json: any = await res.json();
    const f = json.fields ?? {};
    const v = (x: any) => x?.stringValue ?? x?.integerValue ?? x?.doubleValue ?? x?.booleanValue;
    return {
      name: v(f.name),
      description: v(f.description),
      image: v(f.image),
      price: f.price ? Number(v(f.price)) : undefined,
      stock: f.stock ? Number(v(f.stock)) : undefined,
    };
  } catch { return null; }
}

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => ({ meta: await fetchProductMeta(params.id) }),
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const name = m?.name ?? `Product ${params.id}`;
    const title = `${name} ChocoLux`;
    const desc = (m?.description && m.description.slice(0, 160)) || `Discover ${name} — handcrafted luxury chocolate from ChocoLux.`;
    const url = `https://web-muse-fix.lovable.app/product/${params.id}`;
    const ogImage = m?.image;
    const productLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description: desc,
      ...(ogImage ? { image: ogImage } : {}),
      ...(m?.price != null ? {
        offers: {
          "@type": "Offer",
          price: m.price,
          priceCurrency: "USD",
          availability: (m.stock ?? 0) > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url,
        },
      } : {}),
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(productLd) }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = useParams({ from: "/product/$id" });
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const snap = await getDoc(doc(db, "products", id));
        if (snap.exists()) setP({ id: snap.id, ...(snap.data() as any) });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Layout><div className="container mx-auto px-4 py-20">{t("loading")}</div></Layout>;
  if (!p) return <Layout><div className="container mx-auto px-4 py-20 text-center"><h1 className="text-3xl font-bold">{t("product_not_found")}</h1><Link to="/shop" className="text-primary underline mt-4 inline-block">{t("back_to_shop")}</Link></div></Layout>;

  const hasDiscount = p.discountPrice != null && p.discountPrice < p.price;
  const display = hasDiscount ? p.discountPrice! : p.price;

  function add(navigateToCheckout: boolean) {
    if (!p) return;
    cart.add({ id: p.id, name: p.name, price: display, image: p.image, stock: p.stock }, qty);
    if (navigateToCheckout) router.navigate({ to: "/checkout" });
    else toast.success(`${p.name} → ${t("add_to_cart")}`);
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12 grid md:grid-cols-2 gap-12">
        <div className="glass rounded-3xl overflow-hidden aspect-square">
          <SafeImage src={p.image} alt={p.name} className="w-full h-full object-cover" fallback={<span className="text-9xl">🍫</span>} />
        </div>
        <div>
          {p.category && <div className="text-xs uppercase tracking-[0.3em] text-primary">{p.category}</div>}
          <h1 className="text-5xl font-bold mt-3">{p.name}</h1>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-bold gold-text">${display.toFixed(2)}</span>
            {hasDiscount && <span className="text-lg text-muted-foreground line-through">${p.price.toFixed(2)}</span>}
          </div>
          <p className="mt-6 text-muted-foreground leading-relaxed">{p.description || "A premium handcrafted chocolate experience."}</p>
          <div className="mt-6 text-sm">
            {p.stock > 0 ? <span className="text-green-400">● {t("in_stock")} ({p.stock})</span> : <span className="text-destructive">● {t("sold_out")}</span>}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="glass rounded-full flex items-center">
              <button aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:text-primary"><Minus className="w-4 h-4" aria-hidden="true"/></button>
              <span className="px-4 font-semibold" aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" onClick={() => setQty(Math.min(p.stock, qty + 1))} className="p-3 hover:text-primary"><Plus className="w-4 h-4" aria-hidden="true"/></button>
            </div>
            <button
              disabled={p.stock === 0}
              onClick={() => add(false)}
              className="px-6 py-3 rounded-full gold-border hover:bg-primary/10 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4"/> {t("add_to_cart")}
            </button>
            <button
              disabled={p.stock === 0}
              onClick={() => add(true)}
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              <Zap className="w-4 h-4"/> {t("buy_now")}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
