import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getFirebase } from "../lib/firebase";
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch,
} from "firebase/firestore";
import { Send, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "../lib/errors";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";

const head = () => ({ meta: [
  { title: "Admin Live Chat ChocoLux" },
  { name: "description", content: "ChocoLux live chat inbox — reply to customer support conversations in real time." },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:title", content: "Admin Live Chat ChocoLux" },
  { property: "og:description", content: "Reply to customer chats." },
] });
export const Route = createFileRoute("/admin/chats")({ head, component: AdminChats });

type Thread = {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  lastMessage?: string;
  lastFrom?: "user" | "admin";
  updatedAt?: any;
};
type Msg = { id: string; from: "user" | "admin"; text: string; senderUid: string; createdAt: any };

function shortId(id: string) { return id.slice(0, 8); }

function AdminChats() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // List all chat threads (rules allow mod/admin to read any chat doc, but
  // collection listing requires a list rule on the collection root —
  // we use collectionGroup-style listing by collection("chats").)
  useEffect(() => {
    const { db } = getFirebase();
    const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q,
      (snap) => setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (err) => { console.error(err); toast.error(friendlyError(err, "Could not load chats")); }
    );
    return unsub;
  }, []);

  // Subscribe to active thread messages
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const { db } = getFirebase();
    const q = query(collection(db, "chats", activeId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    });
    return unsub;
  }, [activeId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeId || !text.trim()) return;
    setSending(true);
    try {
      const { db } = getFirebase();
      const body = text.trim();
      await addDoc(collection(db, "chats", activeId, "messages"), {
        from: "admin",
        text: body,
        senderUid: user.uid,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "chats", activeId), {
        lastMessage: body,
        lastFrom: "admin",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setText("");
    } catch (e: any) { toast.error(friendlyError(e)); }
    setSending(false);
  }

  async function deleteChat(id: string) {
    try {
      const { db } = getFirebase();
      // Delete all messages in batches, then the thread doc itself.
      const msgsSnap = await getDocs(collection(db, "chats", id, "messages"));
      const docs = msgsSnap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, "chats", id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
      toast.success("Chat deleted");
    } catch (e: any) {
      toast.error(friendlyError(e, "Could not delete chat"));
    }
  }

  const active = threads.find((t) => t.id === activeId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-primary"/> Live chat
      </h1>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[60vh]">
        {/* Threads sidebar */}
        <aside className="glass rounded-2xl p-3 overflow-hidden">
          <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 py-2">
            Conversations ({threads.length})
          </div>
          <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
            {threads.length === 0 && (
              <li className="text-xs text-muted-foreground px-2 py-4 text-center">No chats yet.</li>
            )}
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition ${
                    activeId === t.id ? "bg-primary/10 border border-primary/30" : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{t.userName || "User"}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">#{shortId(t.userId)}</span>
                  </div>
                  {t.userEmail && <div className="text-xs text-muted-foreground truncate">{t.userEmail}</div>}
                  {t.lastMessage && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      <span className="opacity-70">{t.lastFrom === "admin" ? "You: " : ""}</span>{t.lastMessage}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Chat panel */}
        <section className="glass rounded-2xl p-4 flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
              <div className="pb-3 border-b border-white/5 mb-3">
                <div className="font-semibold">{active.userName || "User"}</div>
                <div className="text-xs text-muted-foreground">
                  ID: <span className="font-mono">{active.userId}</span>
                  {active.userEmail && <span> · {active.userEmail}</span>}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 min-h-[300px] max-h-[55vh] overflow-y-auto space-y-2 pr-1 mb-3">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No messages yet.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      m.from === "admin"
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
                  placeholder="Type a reply…"
                  aria-label="Reply"
                  className="flex-1 bg-transparent border border-white/10 rounded-full px-4 py-2 outline-none focus:border-primary"
                />
                <button
                  disabled={sending || !text.trim()}
                  aria-label="Send"
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="w-4 h-4"/>
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
