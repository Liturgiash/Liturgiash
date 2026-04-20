-- =========================================
-- Migration: Liturgia upgrade
-- =========================================

-- 1. Add code column to materials
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Auto-generate code for materials: MAT-XXXXXX
CREATE OR REPLACE FUNCTION public.generate_material_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    new_code := 'MAT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.materials WHERE code = new_code);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      new_code := 'MAT-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
      EXIT;
    END IF;
  END LOOP;
  NEW.code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_materials_code
  BEFORE INSERT ON public.materials
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_material_code();

-- 2. Add code column to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Auto-generate code for events: EVT-XXXXXX
CREATE OR REPLACE FUNCTION public.generate_event_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    new_code := 'EVT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.events WHERE code = new_code);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      new_code := 'EVT-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
      EXIT;
    END IF;
  END LOOP;
  NEW.code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_events_code
  BEFORE INSERT ON public.events
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_event_code();

-- 3. Categories table (user-managed)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view categories"
  ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert categories"
  ON public.categories FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete own categories"
  ON public.categories FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Seed some defaults (optional)
INSERT INTO public.categories (name) VALUES
  ('Áudio'), ('Iluminação'), ('Mobiliário'), ('Informática'), ('Papelaria')
ON CONFLICT (name) DO NOTHING;

-- 4. Safe event creation function (transactional)
CREATE OR REPLACE FUNCTION public.create_event_with_materials(
  p_name        TEXT,
  p_event_date  TIMESTAMPTZ,
  p_description TEXT,
  p_created_by  UUID,
  p_allocations JSONB  -- [{material_id, quantity}]
)
RETURNS TABLE(event_id UUID, event_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id   UUID;
  v_event_code TEXT;
  alloc        JSONB;
  v_mat_id     UUID;
  v_qty        NUMERIC;
  v_cur_qty    NUMERIC;
BEGIN
  -- Insert event (trigger will set code)
  INSERT INTO public.events (name, event_date, description, created_by)
  VALUES (p_name, p_event_date, p_description, p_created_by)
  RETURNING id, code INTO v_event_id, v_event_code;

  -- Process allocations
  FOR alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_mat_id := (alloc->>'material_id')::UUID;
    v_qty    := (alloc->>'quantity')::NUMERIC;

    -- Lock and check stock
    SELECT current_quantity INTO v_cur_qty
      FROM public.materials
      WHERE id = v_mat_id
      FOR UPDATE;

    IF v_cur_qty IS NULL THEN
      RAISE EXCEPTION 'Material % não encontrado', v_mat_id;
    END IF;

    IF v_cur_qty < v_qty THEN
      RAISE EXCEPTION 'Estoque insuficiente para o material %. Disponível: %, Solicitado: %',
        v_mat_id, v_cur_qty, v_qty;
    END IF;

    -- Insert allocation
    INSERT INTO public.event_materials (event_id, material_id, quantity)
    VALUES (v_event_id, v_mat_id, v_qty);

    -- Decrement stock
    UPDATE public.materials
      SET current_quantity = current_quantity - v_qty
      WHERE id = v_mat_id;

    -- Record movement
    INSERT INTO public.material_movements
      (material_id, event_id, type, quantity, notes, created_by)
    VALUES
      (v_mat_id, v_event_id, 'saida', v_qty,
       'Alocado para evento: ' || p_name, p_created_by);
  END LOOP;

  RETURN QUERY SELECT v_event_id, v_event_code;
END;
$$;
