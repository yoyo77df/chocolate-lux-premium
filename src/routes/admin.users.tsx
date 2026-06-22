import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { getFirebase } from "../lib/firebase";
import { toast } from "sonner";
import { friendlyError } from "../lib/errors";

const head = () => ({ meta: [
  { title: "Admin Users — ChocoLux" },
  { name: "description", content: "Manage registered ChocoLux customer accounts and account-level access." },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:title", content: "Admin Users — ChocoLux" },
  { property: "og:description", content: "Manage registered customer accounts." },
] });
export const Route = createFileRoute("/admin/users")({ head,
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { db } = getFirebase();
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setRole(uid: string, role: string) {
    try {
      const { db } = getFirebase();
      await updateDoc(doc(db, "users", uid), { role });
      toast.success("Role updated");
      load();
    } catch (e: any) { toast.error(friendlyError(e)); }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      {loading ? <div>Loading…</div> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground bg-white/5"><tr><th className="p-3">Email</th><th>Name</th><th>Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="p-3">{u.email}</td>
                  <td className="text-muted-foreground">{u.displayName ?? "—"}</td>
                  <td>
                    <select value={u.role ?? "user"} onChange={(e) => setRole(u.id, e.target.value)} className="bg-card border border-white/10 rounded px-2 py-1">
                      <option value="user">user</option>
                      <option value="mod">mod</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}