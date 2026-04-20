import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Loader2, Package, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchMaterial, fetchMovements } from "@/lib/queries";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: material, isLoading: loadingMat } = useQuery({
    queryKey: ["material", id],
    queryFn: () => fetchMaterial(id!),
    enabled: !!id,
  });
  const { data: movements = [], isLoading: loadingMov } = useQuery({
    queryKey: ["movements", id],
    queryFn: () => fetchMovements(id!),
    enabled: !!id,
  });

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryQty, setEntryQty] = useState(0);
  const [entryNotes, setEntryNotes] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", description: "", category: "", responsible: "",
  });

  // Sync edit form when material loads
  if (material && editForm.name === "" && material.name) {
    setEditForm({
      name: material.name,
      description: material.description ?? "",
      category: material.category ?? "",
      responsible: material.responsible ?? "",
    });
  }

  const entryMutation = useMutation({
    mutationFn: async () => {
      if (!material || !user || entryQty <= 0) throw new Error("Dados inválidos");
      const newQty = Number(material.current_quantity) + entryQty;
      const [r1, r2] = await Promise.all([
        supabase.from("materials").update({ current_quantity: newQty }).eq("id", material.id),
        supabase.from("material_movements").insert({
          material_id: material.id, type: "entrada", quantity: entryQty,
          notes: entryNotes || null, created_by: user.id,
        }),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["material", id] });
      qc.invalidateQueries({ queryKey: ["movements", id] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Entrada de ${entryQty} unidade(s) registrada`);
      setEntryOpen(false); setEntryQty(0); setEntryNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!material) throw new Error("Material não encontrado");
      const { error } = await supabase.from("materials").update({
        name: editForm.name,
        description: editForm.description || null,
        category: editForm.category || null,
        responsible: editForm.responsible || null,
      }).eq("id", material.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["material", id] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material atualizado");
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const loading = loadingMat || loadingMov;

  if (loading) return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>;
  if (!material) return <p className="text-muted-foreground">Material não encontrado.</p>;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigate("/materials")} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Materiais
      </Button>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 mb-8">
        <div className="surface overflow-hidden">
          <div className="aspect-square bg-muted flex items-center justify-center">
            {material.image_url ? (
              <img src={material.image_url} alt={material.name} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold">{material.name}</h1>
                {material.code && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {material.code}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {material.category && <Badge variant="secondary">{material.category}</Badge>}
                {material.responsible && <Badge variant="outline">Resp: {material.responsible}</Badge>}
              </div>
            </div>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setEditForm({
                  name: material.name,
                  description: material.description ?? "",
                  category: material.category ?? "",
                  responsible: material.responsible ?? "",
                })}>
                  <Edit className="h-4 w-4 mr-1" />Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Editar material</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Nome</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Descrição</Label>
                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                  <CategoryPicker
                    value={editForm.category}
                    onChange={(v) => setEditForm({ ...editForm, category: v })}
                  />
                  <div className="space-y-2"><Label>Responsável</Label>
                    <Input value={editForm.responsible} onChange={(e) => setEditForm({ ...editForm, responsible: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
                  <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
                    {editMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {material.description && <p className="text-sm text-muted-foreground mb-6">{material.description}</p>}

          <div className="grid grid-cols-2 gap-3 mt-auto">
            <div className="surface p-4">
              <p className="text-xs text-muted-foreground">Saldo atual</p>
              <p className="text-3xl font-semibold tabular-nums text-primary">{material.current_quantity}</p>
            </div>
            <div className="surface p-4">
              <p className="text-xs text-muted-foreground">Quantidade inicial</p>
              <p className="text-3xl font-semibold tabular-nums">{material.initial_quantity}</p>
            </div>
          </div>

          <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Dar entrada no estoque</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Entrada de estoque</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Quantidade</Label>
                  <Input type="number" min={1} value={entryQty} onChange={(e) => setEntryQty(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Observação (opcional)</Label>
                  <Textarea value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Ex: Compra, devolução..." /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setEntryOpen(false)}>Cancelar</Button>
                <Button onClick={() => entryMutation.mutate()} disabled={entryMutation.isPending || entryQty <= 0}>
                  {entryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmar entrada
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="surface p-6">
        <h2 className="font-semibold mb-4">Histórico de movimentações</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma movimentação registrada.</p>
        ) : (
          <ul className="divide-y">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                  m.type === "entrada" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                }`}>
                  {m.type === "entrada" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {m.type === "entrada" ? "Entrada" : "Saída"}
                    {m.event && <span className="text-muted-foreground font-normal"> · {m.event.name}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(m.movement_date)}{m.notes && ` · ${m.notes}`}</p>
                </div>
                <Badge variant={m.type === "entrada" ? "default" : "secondary"} className="tabular-nums">
                  {m.type === "entrada" ? "+" : "−"}{m.quantity}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
