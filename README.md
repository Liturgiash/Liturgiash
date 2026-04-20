# Liturgia — Sistema de Gestão de Materiais e Eventos

Stack: React 18 + Vite + TypeScript + Supabase + React Query + shadcn/ui

## Antes de rodar

1. Copie `.env.example` para `.env` e preencha as variáveis do Supabase
2. Execute a migration SQL no Supabase Studio:
   - `supabase/migrations/20260418191419_...sql` (schema original)
   - `supabase/migrations/20260418_liturgia_upgrade.sql` (códigos + categorias + RPC transacional)
3. `bun install && bun dev`

## Funcionalidades

- Materiais com código automático (MAT-XXXXXX)
- Eventos com código automático (EVT-XXXXXX)
- Categorias gerenciadas pelo usuário (botões clicáveis)
- Criação de eventos com alocação transacional de materiais (sem risco de estoque inconsistente)
- React Query para cache e invalidação automática
- Histórico de movimentações por material
- Geração de PDF por evento
