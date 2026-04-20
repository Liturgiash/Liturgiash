import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchMaterials } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Allocation { material_id: string; name: string; quantity: number; available: number; }

export default function EventNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [pickMat, setPickMat] = useState("");
  const [pickQty, setPickQty] = useState(1);

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });

  const availableMaterials = materials.filter((m) => m.current_quantity > 0);

  const addAllocation = () => {
    if (!pickMat || pickQty <= 0) return;
    if (allocations.some((a) => a.material_id === pickMat)) {
      toast.error("Material já adicionado"); return;
    }
    const m = availableMaterials.find((x) => x.id === pickMat);
    if (!m) return;
    if (pickQty > m.current_quantity) {
      toast.error(`Estoque insuficiente. Disponível: ${m.current_quantity}`); return;
    }
    setAllocations([...allocations, { material_id: m.id, name: m.name, quantity: pickQty, available: m.current_quantity }]);
    setPickMat(""); setPickQty(1);
  };

  const remove = (id: string) => setAllocations(allocations.filter((a) => a.material_id !== id));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Call the transactional RPC function
      const { data, error } = await supabase.rpc("create_event_with_materials", {
        p_name: name,
        p_event_date: new Date(eventDate).toISOString(),
        p_description: description || null,
        p_created_by: user.id,
        p_allocations: allocations.map((a) => ({
          material_id: a.material_id,
          quantity: a.quantity,
        })) as any,
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
      // Parse Postgres error messages for user-friendly display
      const msg = e.message ?? "";
      if (msg.includes("Estoque insuficiente")) toast.error(msg);
      else if (msg.includes("não encontrado")) toast.error("Material não encontrado no banco");
      else toast.error("Erro ao criar evento: " + msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <PageHeader title="Novo evento" description="Cadastre o evento e aloque os materiais" />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <div className="surface p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="name">Nome do evento *</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="date">Data *</Label>
              <Input id="date" type="datetime-local" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>

        <div className="surface p-6">
          <h3 className="font-semibold mb-4">Materiais alocados</h3>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Select value={pickMat} onValueChange={setPickMat}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um material" /></SelectTrigger>
              <SelectContent>
                {availableMaterials
                  .filter((m) => !allocations.some((a) => a.material_id === m.id))
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.code && ` (${m.code})`}
                      {" — disp.: "}{m.current_quantity}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input type="number" min={1} value={pickQty} onChange={(e) => setPickQty(Number(e.target.value))}
              className="sm:w-24" placeholder="Qtd" />
            <Button type="button" variant="outline" onClick={addAllocation}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>

          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum material adicionado ainda.</p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {allocations.map((a) => (
                <li key={a.material_id} className="flex items-center justify-between gap-3 p-3">
                  <span className="text-sm font-medium">{a.name}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="tabular-nums">{a.quantity} un.</Badge>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(a.material_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
