import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../backend";
import type { PartyPlan } from "./types";
const key = "origin-forge-party-v2";
function isPlan(p: unknown): p is PartyPlan {
  if (!p || typeof p !== "object") return false;
  const v = p as PartyPlan;
  return (
    v.version === 2 &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Array.isArray(v.heroes) &&
    v.heroes.length <= 4 &&
    v.heroes.every(
      (h) =>
        h.character?.slug &&
        h.style?.tipo_arma &&
        h.pieces &&
        Array.isArray(h.bonuses),
    )
  );
}
function readLocal(): PartyPlan[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v.filter(isPlan) : [];
  } catch {
    return [];
  }
}
export function usePlans() {
  const [plans, setPlans] = useState<PartyPlan[]>(supabase ? [] : readLocal);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const owner = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) return;
    owner.current = undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user || null;
      if (owner.current === (next?.id || null)) return;
      owner.current = next?.id || null;
      const e = ++epoch.current;
      setUser(next);
      setLoading(true);
      setError("");
      setPlans([]);
      if (!next) {
        setPlans(readLocal());
        setLoading(false);
        return;
      }
      setTimeout(() => {
        void (async () => {
          const rows: PartyPlan[] = [];
          for (let start = 0; ; start += 500) {
            const { data, error } = await supabase!
              .from("party_plans")
              .select("data")
              .eq("user_id", next.id)
              .order("id")
              .range(start, start + 499);
            if (error) throw error;
            rows.push(...data.map((r) => r.data).filter(isPlan));
            if (data.length < 500) break;
          }
          if (epoch.current === e) {
            setPlans(
              rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
            );
            setLoading(false);
          }
        })().catch((err) => {
          if (epoch.current === e) {
            setError(err.message);
            setLoading(false);
          }
        });
      }, 0);
    });
    return () => {
      epoch.current++;
      data.subscription.unsubscribe();
    };
  }, []);
  async function save(plan: PartyPlan) {
    if (loading || busy)
      throw new Error("Espera a que termine la operación actual");
    const e = epoch.current;
    setBusy(true);
    setError("");
    try {
      if (user) {
        const { error } = await supabase!.from("party_plans").upsert(
          {
            id: plan.id,
            user_id: user.id,
            data: plan,
            updated_at: plan.updatedAt,
          },
          { onConflict: "user_id,id" },
        );
        if (error) throw error;
      }
      if (epoch.current !== e) return;
      const next = plans.some((p) => p.id === plan.id)
        ? plans.map((p) => (p.id === plan.id ? plan : p))
        : [plan, ...plans];
      if (!user) localStorage.setItem(key, JSON.stringify(next));
      setPlans(next);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (loading || busy) return;
    const e = epoch.current;
    setBusy(true);
    try {
      if (user) {
        const { error } = await supabase!
          .from("party_plans")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      }
      if (epoch.current !== e) return;
      const next = plans.filter((p) => p.id !== id);
      if (!user) localStorage.setItem(key, JSON.stringify(next));
      setPlans(next);
    } finally {
      setBusy(false);
    }
  }
  return {
    plans,
    user,
    loading,
    error,
    busy,
    save,
    remove,
    epoch: epoch.current,
  };
}
