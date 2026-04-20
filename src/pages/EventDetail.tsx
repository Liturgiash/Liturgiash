import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, CheckSquare, ClipboardList,
  Download, Filter, Package, RotateCcw, Search,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchEvent, fetchEventItems, fetchChecklist } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  quantity: number;
  material: { id: string; name: string; category: string | null; responsible: string | null } | null;
};

type CheckMap = Record<string, { checked: boolean; checked_by: string | null; checked_at: string | null }>;

function FilterBar({
  items, search, setSearch, category, setCategory,
  responsible, setResponsible, showDone, setShowDone,
}: {
  items: Item[];
  search: string; setSearch: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  responsible: string; setResponsible: (v: string) => void;
  showDone: boolean; setShowDone: (v: boolean) => void;
}) {
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.material?.category).filter(Boolean))) as string[],
    [items]
  );
  const responsibles = useMemo(
    () => Array.from(new Set(items.map((i) => i.material?.responsible).filter(Boolean))) as string[],
    [items]
  );
  const hasFilter = !!(search || category || responsible || !showDone);

  return (
    <div className="space-y-3 mb-5">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..." className="pl-9 h-9" />
        </div>
        <button type="button" onClick={() => setShowDone(!showDone)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
            !showDone
              ? "bg-success/15 text-success border-success/40"
              : "bg-muted/60 border-border text-muted-foreground hover:border-success/30"
          )}>
          {!showDone ? "Mostrar todos" : "Ocultar separados"}
        </button>
        {hasFilter && (
          <button type="button"
            onClick={() => { setSearch(""); setCategory(""); setResponsible(""); setShowDone(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-dashed border-border transition-all">
            <RotateCcw className="h-3 w-3" /> Limpar filtros
          </button>
        )}
      </div>

      {(categories.length > 0 || responsibles.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Filter className="h-3.5 w-3.5" /> Filtrar:
          </span>
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(category === c ? "" : c)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                category === c
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/60 border-border hover:border-primary/40 text-foreground"
              )}>
              {c}
            </button>
          ))}
          {responsibles.length > 0 && categories.length > 0 && (
            <span className="w-px h-4 bg-border" />
          )}
          {responsibles.map((r) => (
            <button key={r} type="button" onClick={() => setResponsible(responsible === r ? "" : r)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                responsible === r
                  ? "bg-warning text-warning-foreground border-warning shadow-sm"
                  : "bg-muted/60 border-border hover:border-warning/40 text-foreground"
              )}>
              Resp: {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistTab({ eventId, items }: { eventId: string; items: Item[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [responsible, setResponsible] = useState("");
  const [showDone, setShowDone] = useState(true);

  const { data: checkMap = {}, isLoading } = useQuery<CheckMap>({
    queryKey: ["checklist", eventId],
    queryFn: () => fetchChecklist(eventId),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase.rpc("toggle_checklist_item" as any, {
        p_event_id: eventId,
        p_event_material_id: itemId,
        p_checked: checked,
        p_user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onMutate: async ({ itemId, checked }) => {
      await qc.cancelQueries({ queryKey: ["checklist", eventId] });
      const prev = qc.getQueryData<CheckMap>(["checklist", eventId]);
      qc.setQueryData<CheckMap>(["checklist", eventId], (old = {}) => ({
        ...old,
        [itemId]: {
          checked,
          checked_by: user?.id ?? null,
          checked_at: checked ? new Date().toISOString() : null,
        },
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["checklist", eventId], ctx.prev);
      toast.error("Erro ao atualizar item");
    },
  });

  const checkedCount = items.filter((i) => checkMap[i.id]?.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const filtered = useMemo(
    () => items.filter((item) => {
      const m = item.material;
      if (!m) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && m.category !== category) return false;
      if (responsible && m.responsible !== responsible) return false;
      if (!showDone && checkMap[item.id]?.checked) return false;
      return true;
    }),
    [items, search, category, responsible, showDone, checkMap]
  );

  const handleResetAll = async () => {
    const checked = items.filter((i) => checkMap[i.id]?.checked);
    await Promise.all(
      checked.map((item) => toggleMutation.mutateAsync({ itemId: item.id, checked: false }))
    );
    toast.success("Checklist reiniciado");
  };

  if (isLoading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="surface p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {checkedCount} de {totalCount} {totalCount === 1 ? "item separado" : "itens separados"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold tabular-nums text-primary">{progress}%</span>
            {checkedCount > 0 && (
              <button type="button" onClick={handleResetAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <RotateCcw className="h-3 w-3" /> Reiniciar
              </button>
            )}
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500",
              progress === 100 ? "bg-success" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && totalCount > 0 && (
          <p className="text-xs text-success font-medium mt-2 flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Todos os itens separados! Evento pronto.
          </p>
        )}
      </div>

      {/* Filters */}
      <FilterBar items={items} search={search} setSearch={setSearch}
        category={category} setCategory={setCategory}
        responsible={responsible} setResponsible={setResponsible}
        showDone={showDone} setShowDone={setShowDone} />

      {(search || category || responsible || !showDone) && (
        <p className="text-xs text-muted-foreground -mt-2">
          Mostrando <span className="font-medium">{filtered.length}</span> de{" "}
          <span className="font-medium">{totalCount}</span> itens
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="surface p-12 text-center text-sm text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum item corresponde aos filtros aplicados.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const isChecked = checkMap[item.id]?.checked ?? false;
            const checkedAt = checkMap[item.id]?.checked_at;
            return (
              <li key={item.id}>
                <button type="button"
                  onClick={() => toggleMutation.mutate({ itemId: item.id, checked: !isChecked })}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 group",
                    isChecked
                      ? "bg-success-soft border-success/25"
                      : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                  )}>
                  {/* Checkbox visual */}
                  <div className={cn(
                    "h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                    isChecked
                      ? "bg-success border-success"
                      : "border-border bg-background group-hover:border-primary/60"
                  )}>
                    {isChecked && (
                      <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm leading-snug transition-all",
                      isChecked && "line-through text-muted-foreground")}>
                      {item.material?.name ?? "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.material?.category && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          {item.material.category}
                        </span>
                      )}
                      {item.material?.responsible && (
                        <span className="text-xs text-muted-foreground">
                          Resp: {item.material.responsible}
                        </span>
                      )}
                      {isChecked && checkedAt && (
                        <span className="text-xs text-success font-medium">
                          ✓ Separado às{" "}
                          {new Date(checkedAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant={isChecked ? "outline" : "secondary"}
                    className={cn("tabular-nums shrink-0", isChecked && "opacity-50")}>
                    {item.quantity} un.
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ItemsTab({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="surface p-12 text-center text-sm text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Nenhum material vinculado a este evento.
      </div>
    );
  }
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b text-muted-foreground bg-muted/30">
              <th className="py-3 px-4 font-medium">Material</th>
              <th className="py-3 px-4 font-medium">Categoria</th>
              <th className="py-3 px-4 font-medium">Responsável</th>
              <th className="py-3 px-4 font-medium text-right">Qtd</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium">{it.material?.name ?? "—"}</td>
                <td className="py-3 px-4 text-muted-foreground">{it.material?.category ?? "—"}</td>
                <td className="py-3 px-4 text-muted-foreground">{it.material?.responsible ?? "—"}</td>
                <td className="py-3 px-4 text-right tabular-nums font-medium">{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id!),
    enabled: !!id,
  });
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["event-items", id],
    queryFn: () => fetchEventItems(id!),
    enabled: !!id,
  });

  const generatePDF = () => {
    if (!event) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(event.name, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Código: ${event.code ?? "—"}`, 14, 28);
    doc.text(`Data: ${fmtDateTime(event.event_date)}`, 14, 34);
    if (event.description) doc.text(`Descrição: ${event.description}`, 14, 40);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: event.description ? 48 : 42,
      head: [["Material", "Categoria", "Responsável", "Qtd"]],
      body: items.map((it) => [
        it.material?.name ?? "—",
        it.material?.category ?? "—",
        it.material?.responsible ?? "—",
        String(it.quantity),
      ]),
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 10 },
    });
    const total = items.reduce((s, it) => s + Number(it.quantity), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total de itens: ${total}`, 14, finalY);
    doc.save(`evento-${event.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF gerado!");
  };

  if (loadingEvent || loadingItems) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!event) return <p className="text-muted-foreground">Evento não encontrado.</p>;

  const isPast = new Date(event.event_date) < new Date();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Eventos
      </Button>

      <div className="surface p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shrink-0">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-semibold">{event.name}</h1>
                <Badge variant={isPast ? "secondary" : "default"}>
                  {isPast ? "Realizado" : "Próximo"}
                </Badge>
              </div>
              {event.code && (
                <p className="text-xs font-mono text-muted-foreground bg-muted inline-block px-2 py-0.5 rounded mb-1">
                  {event.code}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{fmtDateTime(event.event_date)}</p>
              {event.description && (
                <p className="text-sm mt-2 max-w-2xl text-muted-foreground">{event.description}</p>
              )}
            </div>
          </div>
          <Button onClick={generatePDF} disabled={items.length === 0} variant="outline">
            <Download className="h-4 w-4 mr-2" />Gerar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList className="mb-6">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Itens alocados
            <span className="ml-1 text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 tabular-nums">
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Checklist de separação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <ItemsTab items={items} />
        </TabsContent>

        <TabsContent value="checklist">
          {id && <ChecklistTab eventId={id} items={items} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
