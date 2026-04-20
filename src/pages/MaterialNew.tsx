import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MaterialNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", category: "", responsible: "", initial_quantity: 0,
  });

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else setPreview(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file);
        if (upErr) throw new Error("Erro ao enviar imagem: " + upErr.message);
        image_url = supabase.storage.from("materials").getPublicUrl(path).data.publicUrl;
      }

      const { data: mat, error } = await supabase
        .from("materials")
        .insert({
          name: form.name,
          description: form.description || null,
          category: form.category || null,
          responsible: form.responsible || null,
          initial_quantity: form.initial_quantity,
          current_quantity: form.initial_quantity,
          image_url,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (form.initial_quantity > 0 && mat) {
        await supabase.from("material_movements").insert({
          material_id: mat.id,
          type: "entrada",
          quantity: form.initial_quantity,
          notes: "Saldo inicial do cadastro",
          created_by: user.id,
        });
      }
      return mat;
    },
    onSuccess: (mat) => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Material cadastrado com sucesso!");
      navigate(`/materials/${mat.id}`);
    },
    onError: (e: any) => toast.error(e.message),
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
      <PageHeader title="Novo material" description="Adicione um item ao inventário" />

      <form onSubmit={handleSubmit} className="surface p-6 space-y-6 max-w-3xl">
        <div className="grid sm:grid-cols-[200px_1fr] gap-6">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Foto</Label>
            <label className="block aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer overflow-hidden bg-muted/40 transition-colors">
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Enviar imagem</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Category picker — button cards */}
            <CategoryPicker
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input id="responsible" value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                placeholder="Ex: João" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantidade inicial *</Label>
              <Input id="qty" type="number" min={0} required value={form.initial_quantity}
                onChange={(e) => setForm({ ...form, initial_quantity: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cadastrar material
          </Button>
        </div>
      </form>
    </>
  );
}
