import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2, Search, Package, Image } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchMaterials } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Allocation { material_id: string; name: string; quantity: number; available: number; image_url?: string | null; category?: string | null; }

export default function EventNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [matSearch, setMatSearch] = useState("");
  const [pickQty, setPickQty] = useState<Record<string, number>>({});

  const { data: materials = [] } = useQuery({ queryKey: ["materials"], queryFn: fetchMaterials });

  const availableMaterials = useMemo(() =>
    materials
      .filter((m) => m.current_quantity > 0 && !allocations.some((a) => a.material_id === m.id))
      .filter((m) => !matSearch || m.name.toLowerCase().includes(matSearch.toLowerCase()) || m.category?.toLowerCase().includes(matSearch.toLowerCase())),
    [materials, allocations, matSearch]
  );

  const addAllocation = (matId: string) => {
    const m = materials.find((x) => x.id === matId);
    if (!m) return;
    const qty = pickQty[matId] ?? 1;
    if (qty <= 0) { toast.error("Quantidade inválida"); return; }
    if (qty > m.current_quantity) { toast.error(`Estoque insuficiente. Disponível: ${m.current_quantity}`); return; }
    setAllocations([...allocations, { material_id: m.id, name: m.name, quantity: qty, available: m.current_quantity, image_url: m.image_url, category: m.category }]);
    setPickQty((prev) => { const n = { ...prev }; delete n[matId]; return n; });
  };

  const remove = (id: string) => setAllocations(allocations.filter((a) => a.material_id !== id));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.rpc("create_event_with_materials", {
        p_name: name,
        p_event_date: new Date(eventDate).toISOString(),
        p_description: description || null,
        p_created_by: user.id,
        p_allocations: allocations.map((a) => ({ material_id: a.material_id, quantity: a.quantity })) as any,
      });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Evento criado com sucesso!");
      if (result?.event_id) navigate(`/events/${result.event_id}`);
      else navigate("/events");
    },
    onError: (e: any) => {
      const msg = e.message ?? "";
      if (msg.includes("Estoque insuficiente")) toast.error(msg);
      else toast.error("Erro ao criar evento: " + msg);
    },
  });

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <PageHeader title="Novo evento" description="Cadastre o evento e aloque os materiais" />

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-6 max-w-3xl">
        {/* Dados básicos */}
        <div className="surface p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do evento *</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              {/* type="date" — apenas data, sem hora */}
              <Input id="date" type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {/* Seleção de materiais */}
        <div className="surface p-6">
          <h3 className="font-semibold mb-4">Materiais alocados</h3>

          {/* Busca */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={matSearch} onChange={(e) => setMatSearch(e.target.value)}
              placeholder="Buscar material por nome ou categoria..." className="pl-9" />
          </div>

          {/* Cards de materiais disponíveis */}
          {availableMaterials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
              {availableMaterials.map((m) => (
                <div key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  {/* Imagem */}
                  <div className="h-14 w-14 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    {m.category && <p className="text-xs text-muted-foreground">{m.category}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Disponível: <span className="font-medium text-foreground">{m.current_quantity}</span>
                    </p>
                  </div>

                  {/* Qty + botão */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="number" min={1} max={m.current_quantity}
                      value={pickQty[m.id] ?? 1}
                      onChange={(e) => setPickQty((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <Button type="button" size="sm" className="h-8 px-2"
                      onClick={() => addAllocation(m.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6 mb-4">
              {matSearch ? "Nenhum material encontrado para esta busca." : "Todos os materiais disponíveis já foram adicionados."}
            </p>
          )}

          {/* Lista de alocados */}
          {allocations.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium">Alocados neste evento</h4>
                <Badge variant="secondary">{allocations.length}</Badge>
              </div>
              <ul className="divide-y border rounded-xl overflow-hidden">
                {allocations.map((a) => (
                  <li key={a.material_id} className="flex items-center gap-3 p-3 bg-card">
                    <div className="h-10 w-10 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                      {a.image_url ? (
                        <img src={a.image_url} alt={a.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      {a.category && <p className="text-xs text-muted-foreground">{a.category}</p>}
                    </div>
                    <Badge variant="secondary" className="tabular-nums shrink-0">{a.quantity} un.</Badge>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(a.material_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar evento
          </Button>
        </div>
      </form>
    </>
  );
}
