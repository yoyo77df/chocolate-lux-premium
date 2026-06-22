import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  stock: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "chocolux:cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const value: CartCtx = {
    items,
    add(item, qty = 1) {
      setItems((prev) => {
        const ex = prev.find((p) => p.id === item.id);
        if (ex) {
          return prev.map((p) =>
            p.id === item.id ? { ...p, qty: Math.min(p.qty + qty, item.stock) } : p,
          );
        }
        return [...prev, { ...item, qty: Math.min(qty, item.stock) }];
      });
    },
    remove(id) { setItems((p) => p.filter((i) => i.id !== id)); },
    setQty(id, qty) {
      setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i)));
    },
    clear() { setItems([]); },
    get total() { return items.reduce((s, i) => s + i.price * i.qty, 0); },
    get count() { return items.reduce((s, i) => s + i.qty, 0); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}