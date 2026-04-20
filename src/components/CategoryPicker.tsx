import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Tag, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategoryPickerProps { value: string; onChange: (v: string) => void; }

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert({ name: name.trim(), created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewCat(""); setAdding(false);
      toast.success("Categoria adicionada");
    },
    onError: (e: any) => {
      if (e.code === "23505") toast.error("Categoria já existe");
      else toast.error(e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Usa a função segura que verifica materiais vinculados
      const { error } = await supabase.rpc("delete_category_safe" as any, {
        p_category_id: id,
        p_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      const cat = categories.find((c) => c.id === id);
      if (cat && cat.name === value) onChange("");
      setDeleteTarget(null);
      toast.success("Categoria removida");
    },
    onError: (e: any) => {
      setDeleteTarget(null);
      // Extrai mensagem do erro Postgres
      const msg = e.message ?? "";
      const match = msg.match(/ERROR:\s*(.*)/);
      toast.error(match ? match[1] : msg);
    },
  });

  return (
    <>
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Categoria
        </Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="relative group">
              <button type="button" onClick={() => onChange(value === cat.name ? "" : cat.name)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 pr-7",
                  value === cat.name
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/60 text-foreground border-border hover:border-primary/50"
                )}>
                {cat.name}
              </button>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: cat.id, name: cat.name }); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/15 hover:text-destructive"
                title="Remover categoria">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex items-center gap-1.5">
              <Input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (newCat.trim()) addMutation.mutate(newCat); }
                  if (e.key === "Escape") { setAdding(false); setNewCat(""); }
                }}
                placeholder="Nome da categoria" className="h-8 text-sm w-40" />
              <Button type="button" size="sm" className="h-8" onClick={() => { if (newCat.trim()) addMutation.mutate(newCat); }} disabled={addMutation.isPending || !newCat.trim()}>Adicionar</Button>
              <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => { setAdding(false); setNewCat(""); }}>Cancelar</Button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nova
            </button>
          )}
        </div>
        {value && <p className="text-xs text-muted-foreground">Selecionada: <span className="font-medium text-foreground">{value}</span></p>}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir categoria?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A categoria <strong>"{deleteTarget?.name}"</strong> será removida permanentemente.
              Se houver materiais vinculados a ela, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
