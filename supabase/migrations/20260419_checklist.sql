-- =========================================
-- Migration: Checklist de separação por evento
-- =========================================

-- Tabela que guarda o estado de cada item do checklist por evento
CREATE TABLE IF NOT EXISTS public.event_checklist (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id            UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_material_id   UUID        NOT NULL REFERENCES public.event_materials(id) ON DELETE CASCADE,
  checked             BOOLEAN     NOT NULL DEFAULT false,
  checked_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, event_material_id)
);

ALTER TABLE public.event_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view checklist"
  ON public.event_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert checklist"
  ON public.event_checklist FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update checklist"
  ON public.event_checklist FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete checklist"
  ON public.event_checklist FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_checklist_event ON public.event_checklist(event_id);
CREATE INDEX idx_checklist_material ON public.event_checklist(event_material_id);

-- Trigger para manter updated_at
CREATE TRIGGER trg_checklist_updated_at
  BEFORE UPDATE ON public.event_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Função: toggle de item no checklist (upsert atômico)
-- =========================================
CREATE OR REPLACE FUNCTION public.toggle_checklist_item(
  p_event_id           UUID,
  p_event_material_id  UUID,
  p_checked            BOOLEAN,
  p_user_id            UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_checklist
    (event_id, event_material_id, checked, checked_by, checked_at)
  VALUES (
    p_event_id,
    p_event_material_id,
    p_checked,
    CASE WHEN p_checked THEN p_user_id ELSE NULL END,
    CASE WHEN p_checked THEN now() ELSE NULL END
  )
  ON CONFLICT (event_id, event_material_id)
  DO UPDATE SET
    checked    = EXCLUDED.checked,
    checked_by = EXCLUDED.checked_by,
    checked_at = EXCLUDED.checked_at,
    updated_at = now();
END;
$$;
