import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getFirebase } from "../lib/firebase";
import {
  doc, getDoc, collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc,
} from "firebase/firestore";
import {
  Facebook, Instagram, Twitter, Youtube, MessageCircle, Send, Phone, Mail, Globe,
} from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — ChocoLux" },
      { name: "description", content: "Contact ChocoLux support — reach us on social media or chat live with our team." },
      { property: "og:title", content: "Support — ChocoLux" },
      { property: "og:description", content: "Contact ChocoLux support via social media or live chat." },
      { property: "og:url", content: "https://web-muse-fix.lovable.app/support" },
    ],
    links: [{ rel: "canonical", href: "https://web-muse-fix.lovable.app/support" }],
  }),
  component: Support,
});

type Social = { platform: string; label: string; url: string };
type Msg = { id: string; from: "user" | "admin"; text: string; senderUid: string; createdAt: any };

const ICONS: Record<string, any> = {
  facebook: Facebook, instagram: Instagram, twitter: Twitter, youtube: Youtube,
  whatsapp: MessageCircle, telegram: Send, phone: Phone, email: Mail, website: Globe,
};

function SocialIcon({ platform }: { platform: string }) {
  const Icon = ICONS[platform.toLowerCase()] || Globe;
  return <Icon className="w-5 h-5" aria-hidden="true" />;
}

function Support() {
  const { user, profile } = useAuth();
  const [socials, setSocials] = useState<Social[]>([]);
  const [info, setInfo] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { db } = getFirebase();
        const snap = await getDoc(doc(db, "settings", "support"));
        if (snap.exists()) {
          const d = snap.data() as any;
          setSocials(Array.isArray(d.socials) ? d.socials : []);
          setInfo(d.info ?? "");
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    const q = query(collection(db, "chats", user.uid, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    });
    return unsub;
  }, [user]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      const { db } = getFirebase();
      const body = text.trim();
      // Upsert chat thread metadata
      await setDoc(doc(db, "chats", user.uid), {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || "User",
        userEmail: profile?.email || user.email || "",
        lastMessage: body,
        lastFrom: "user",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await addDoc(collection(db, "chats", user.uid, "messages"), {
        from: "user",
        text: body,
        senderUid: user.uid,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (e) { console.error(e); }
    setSending(false);
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12 max-w-5xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold gold-text mb-3">Support</h1>
          <p className="text-muted-foreground">We're here to help — reach us on social media or chat live with our team.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Social contacts */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Reach us on social media</h2>
            {info && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{info}</p>}
            {socials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No social links configured yet.</p>
            ) : (
              <ul className="space-y-2">
                {socials.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:bg-primary/10 hover:border-primary/40 transition"
                    >
                      <span className="text-primary"><SocialIcon platform={s.platform}/></span>
                      <span className="flex-1">
                        <div className="font-medium">{s.label || s.platform}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.url}</div>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live chat */}
          <div className="glass rounded-2xl p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" aria-hidden="true"/> Live chat
            </h2>
            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-8">
                <p className="mb-3">Please sign in to start a live chat with our support team.</p>
                <Link to="/login" className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-medium">Sign in</Link>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 min-h-[280px] max-h-[420px] overflow-y-auto space-y-2 pr-1 mb-3">
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Say hi 👋 — our team usually replies within a few hours.</p>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        m.from === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-white/5 border border-white/10 rounded-bl-sm"
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message…"
                    aria-label="Message"
                    className="flex-1 bg-transparent border border-white/10 rounded-full px-4 py-2 outline-none focus:border-primary"
                  />
                  <button
                    disabled={sending || !text.trim()}
                    aria-label="Send message"
                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <Send className="w-4 h-4" aria-hidden="true"/>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
