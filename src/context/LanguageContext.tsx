import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "../lib/i18n/en";
import { bn } from "../lib/i18n/bn";

export type Lang = "en" | "bn";
const DICTS = { en, bn } as const;
const KEY = "chocolux:lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const C = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Lang | null;
      if (saved === "en" || saved === "bn") setLangState(saved);
    } catch {}
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  }

  function t(key: string) {
    const dict = DICTS[lang] as Record<string, string>;
    return dict[key] ?? (DICTS.en as Record<string, string>)[key] ?? key;
  }

  return <C.Provider value={{ lang, setLang, t }}>{children}</C.Provider>;
}

export function useLang() {
  const v = useContext(C);
  if (!v) throw new Error("useLang must be inside LanguageProvider");
  return v;
}