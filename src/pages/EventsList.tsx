import { Link } from "react-router-dom";
import { CalendarDays, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";

export default function EventsList() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Planeje eventos e aloque os materiais necessários"
        actions={<Button asChild><Link to="/events/new"><Plus className="h-4 w-4 mr-2" />Novo evento</Link></Button>}
      />

      {isLoading ? (
        <div className="grid gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : events.length === 0 ? (
        <div className="surface p-12 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum evento cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Comece criando seu primeiro evento.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((e) => {
            const isPast = new Date(e.event_date) < now;
            return (
              <Link key={e.id} to={`/events/${e.id}`}
                className="surface p-5 hover:shadow-elevated hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary shrink-0">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {e.code && (
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {e.code}
                      </span>
                    )}
                    <Badge variant={isPast ? "secondary" : "default"}>{isPast ? "Realizado" : "Próximo"}</Badge>
                  </div>
                </div>
                <h3 className="font-semibold leading-tight mb-1">{e.name}</h3>
                <p className="text-sm text-muted-foreground">{fmtDate(e.event_date)}</p>
                {e.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>}
                <p className="text-xs text-muted-foreground mt-3">{(e.event_materials as any)?.length ?? 0} item(ns) alocado(s)</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
