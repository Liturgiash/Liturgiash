import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchMaterials } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function MaterialsList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });

  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category).filter(Boolean))) as string[],
    [materials]
  );

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.responsible?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.code?.toLowerCase().includes(q);
      const matchesCat = category === "all" || m.category === category;
      return matchesSearch && matchesCat;
    });
  }, [materials, search, category]);

  return (
    <>
      <PageHeader
        title="Materiais"
        description="Catálogo completo do inventário"
        actions={
          <Button asChild>
            <Link to="/materials/new"><Plus className="h-4 w-4 mr-2" />Novo material</Link>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código, descrição ou responsável..." className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="surface p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum material encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {materials.length === 0 ? "Cadastre seu primeiro material para começar." : "Ajuste os filtros."}
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <ul className="divide-y">
            {filtered.map((m) => (
              <li key={m.id}>
                <Link to={`/materials/${m.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                  <div className="h-14 w-14 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{m.name}</p>
                      {m.code && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          {m.code}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {m.category && <span>{m.category}</span>}
                      {m.responsible && <span> · {m.responsible}</span>}
                    </p>
                  </div>
                  <Badge variant={m.current_quantity > 0 ? "secondary" : "destructive"} className="tabular-nums">
                    {m.current_quantity} un.
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
