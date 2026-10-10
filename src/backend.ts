import { createClient } from "@supabase/supabase-js";
import type { Entry, Team } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
async function loadAll(table: "teams" | "catalog_entries", userId: string) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const rows: { data: Team | Entry }[] = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase
      .from(table)
      .select("data")
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + size - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
export async function loadCloud(userId: string) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const [teams, catalog] = await Promise.all([
    loadAll("teams", userId),
    loadAll("catalog_entries", userId),
  ]);
  return {
    teams: teams
      .map((r) => r.data as Team)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    catalog: catalog.map((r) => r.data as Entry),
  };
}
export async function saveCloud(
  table: "teams" | "catalog_entries",
  data: Team | Entry,
  userId: string,
) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const { error } = await supabase.from(table).upsert(
    {
      id: data.id,
      user_id: userId,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,id" },
  );
  if (error) throw error;
}
export async function deleteCloud(
  table: "teams" | "catalog_entries",
  id: string,
  userId: string,
) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
