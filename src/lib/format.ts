import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const fmtDate = (d: string | Date) =>
  format(new Date(d), "dd/MM/yyyy", { locale: ptBR });

export const fmtDateTime = (d: string | Date) =>
  format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export const fmtRelative = (d: string | Date) =>
  formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR });
