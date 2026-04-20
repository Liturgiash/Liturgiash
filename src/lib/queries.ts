import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type Event    = Database["public"]["Tables"]["events"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Movement = Database["public"]["Tables"]["material_movements"]["Row"] & {
  event: { id: string; name: string } | null;
};

// ── Materials ──────────────────────────────────────────────
export const fetchMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
};

export const fetchMaterial = async (id: string): Promise<Material> => {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Material não encontrado");
  return data;
};

export const fetchMovements = async (materialId: string): Promise<Movement[]> => {
  const { data, error } = await supabase
    .from("material_movements")
    .select("*, event:events(id, name)")
    .eq("material_id", materialId)
    .order("movement_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movement[];
};

// ── Events ─────────────────────────────────────────────────
export const fetchEvents = async () => {
  const { data, error } = await supabase
    .from("events")
    .select("id, code, name, event_date, description, event_materials(id)")
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchEvent = async (id: string) => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Evento não encontrado");
  return data;
};

export const fetchEventItems = async (eventId: string) => {
  const { data, error } = await supabase
    .from("event_materials")
    .select("id, quantity, material:materials(id, name, category, responsible)")
    .eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    quantity: number;
    material: { id: string; name: string; category: string | null; responsible: string | null } | null;
  }[];
};

// ── Dashboard stats ────────────────────────────────────────
export const fetchDashboardStats = async () => {
  const [matsRes, evtsRes, actsRes] = await Promise.all([
    supabase.from("materials").select("current_quantity"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("event_date", new Date().toISOString()),
    supabase
      .from("material_movements")
      .select("id, type, quantity, movement_date, material:materials(name), event:events(name)")
      .order("movement_date", { ascending: false })
      .limit(5),
  ]);
  if (matsRes.error) throw matsRes.error;
  const totalStock = (matsRes.data ?? []).reduce(
    (s, m) => s + Number(m.current_quantity),
    0
  );
  return {
    totalMaterials: matsRes.data?.length ?? 0,
    totalStock,
    upcomingEvents: evtsRes.count ?? 0,
    activities: (actsRes.data ?? []) as {
      id: string;
      type: "entrada" | "saida";
      quantity: number;
      movement_date: string;
      material: { name: string } | null;
      event: { name: string } | null;
    }[],
  };
};

// ── Categories ─────────────────────────────────────────────
export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
};

// ── Checklist ──────────────────────────────────────────────
export const fetchChecklist = async (eventId: string) => {
  const { data, error } = await supabase
    .from("event_checklist")
    .select("event_material_id, checked, checked_by, checked_at")
    .eq("event_id", eventId);
  if (error) throw error;
  // Return as a map: event_material_id -> row
  const map: Record<string, { checked: boolean; checked_by: string | null; checked_at: string | null }> = {};
  for (const row of data ?? []) {
    map[row.event_material_id] = {
      checked: row.checked,
      checked_by: row.checked_by,
      checked_at: row.checked_at,
    };
  }
  return map;
};
