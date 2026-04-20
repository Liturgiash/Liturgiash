import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Package, TrendingDown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { fmtRelative } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardStats,
  });

  const cards = [
    { label: "Materiais cadastrados", value: data?.totalMaterials ?? 0, icon: Package, to: "/materials", color: "text-primary bg-primary-soft" },
    { label: "Itens em estoque", value: data?.totalStock ?? 0, icon: TrendingUp, to: "/materials", color: "text-success bg-success-soft" },
    { label: "Próximos eventos", value: data?.upcomingEvents ?? 0, icon: CalendarDays, to: "/events", color: "text-warning bg-warning-soft" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral do estoque e atividades recentes" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="stat-card group">
            <div className="flex items-start justify-between mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-3xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-9 w-16" /> : c.value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Atividades recentes</h2>
            <p className="text-sm text-muted-foreground">Últimas 5 movimentações de estoque</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !data?.activities.length ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhuma movimentação registrada ainda.
          </div>
        ) : (
          <ul className="divide-y">
            {data.activities.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                  a.type === "entrada" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                }`}>
                  {a.type === "entrada" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {a.material?.name ?? "Material removido"}
                    {a.event?.name && <span className="text-muted-foreground font-normal"> · {a.event.name}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtRelative(a.movement_date)}</p>
                </div>
                <Badge variant={a.type === "entrada" ? "default" : "secondary"} className="tabular-nums">
                  {a.type === "entrada" ? "+" : "−"}{a.quantity}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
