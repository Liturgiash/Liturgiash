import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategoryPickerProps {
  value: string;
  onChange: (v: string) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("categories")
        .insert({ name: name.trim(), created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewCat("");
      setAdding(false);
      toast.success("Categoria adicionada");
    },
    onError: (e: any) => {
      if (e.code === "23505") toast.error("Categoria já existe");
      else toast.error(e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      // deselect if deleted category was selected
      const cat = categories.find((c) => c.id === id);
      if (cat && cat.name === value) onChange("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!newCat.trim()) return;
    addMutation.mutate(newCat);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" />
        Categoria
      </Label>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <div key={cat.id} className="relative group">
            <button
              type="button"
              onClick={() => onChange(value === cat.name ? "" : cat.name)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 pr-7",
                value === cat.name
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/60 text-foreground border-border hover:border-primary/50 hover:bg-primary/8"
              )}
            >
              {cat.name}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(cat.id);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/15 hover:text-destructive"
              title="Remover categoria"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {adding ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                if (e.key === "Escape") { setAdding(false); setNewCat(""); }
              }}
              placeholder="Nome da categoria"
              className="h-8 text-sm w-40"
            />
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleAdd}
              disabled={addMutation.isPending || !newCat.trim()}
            >
              Adicionar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => { setAdding(false); setNewCat(""); }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova
          </button>
        )}
      </div>

      {value && (
        <p className="text-xs text-muted-foreground">
          Selecionada: <span className="font-medium text-foreground">{value}</span>
        </p>
      )}
    </div>
  );
}
