import { Link, useRouter } from "@tanstack/react-router";
import { ShoppingBag, Zap } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { SafeImage } from "./SafeImage";
import { toast } from "sonner";

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  image: string;
  category?: string;
  featured?: boolean;
};

export function ProductCard({ p }: { p: Product }) {
  const cart = useCart();
  const router = useRouter();
  const { t } = useLang();
  const stock = Number(p.stock ?? 0);
  const isSoldOut = !Number.isFinite(stock) || stock <= 1;
  const hasDiscount = p.discountPrice != null && p.discountPrice < p.price;
  const display = hasDiscount ? p.discountPrice! : p.price;

  function addToCart(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (isSoldOut) return;
    cart.add({ id: p.id, name: p.name, price: display, image: p.image, stock }, 1);
    toast.success(`${p.name} → ${t("add_to_cart")}`);
  }
  function buyNow(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (isSoldOut) return;
    cart.add({ id: p.id, name: p.name, price: display, image: p.image, stock }, 1);
    router.navigate({ to: "/checkout" });
  }

  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group glass rounded-2xl overflow-hidden hover:border-primary/40 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 flex flex-col"
    >
      <div className="aspect-square overflow-hidden relative">
        <SafeImage
          src={p.image}
          alt={p.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
            -{Math.round((1 - p.discountPrice! / p.price) * 100)}%
          </span>
        )}
        {isSoldOut && (
          <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">{t("sold_out")}</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          {p.category && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.category}</div>}
          <h3 className="font-semibold mt-1 line-clamp-1">{p.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold gold-text">${display.toFixed(2)}</span>
            {hasDiscount && <span className="text-xs text-muted-foreground line-through">${p.price.toFixed(2)}</span>}
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <button
            type="button"
            onClick={addToCart}
            disabled={isSoldOut}
            className="flex-1 px-3 py-2 rounded-full gold-border text-xs font-semibold hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5"/>{t("add_to_cart")}
          </button>
          <button
            type="button"
            onClick={buyNow}
            disabled={isSoldOut}
            className="flex-1 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Zap className="w-3.5 h-3.5"/>{t("buy_now")}
          </button>
        </div>
      </div>
    </Link>
  );
}
