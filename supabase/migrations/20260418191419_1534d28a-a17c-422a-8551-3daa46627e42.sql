
-- =========================================
-- Utility: updated_at trigger function
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================
-- profiles
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- materials
-- =========================================
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  responsible TEXT,
  category TEXT,
  initial_quantity NUMERIC NOT NULL DEFAULT 0,
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view materials"
  ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert materials"
  ON public.materials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update materials"
  ON public.materials FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete materials"
  ON public.materials FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_responsible ON public.materials(responsible);

-- =========================================
-- events
-- =========================================
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view events"
  ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert events"
  ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update events"
  ON public.events FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete events"
  ON public.events FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_events_date ON public.events(event_date);

-- =========================================
-- event_materials
-- =========================================
CREATE TABLE public.event_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view event_materials"
  ON public.event_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert event_materials"
  ON public.event_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update event_materials"
  ON public.event_materials FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can delete event_materials"
  ON public.event_materials FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_event_materials_event ON public.event_materials(event_id);
CREATE INDEX idx_event_materials_material ON public.event_materials(material_id);

-- =========================================
-- material_movements
-- =========================================
CREATE TABLE public.material_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view movements"
  ON public.material_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert movements"
  ON public.material_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_movements_material ON public.material_movements(material_id);
CREATE INDEX idx_movements_date ON public.material_movements(movement_date DESC);

-- =========================================
-- Storage bucket: material images
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true);

CREATE POLICY "Material images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'materials');

CREATE POLICY "Auth users can upload material images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials');

CREATE POLICY "Auth users can update material images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'materials');

CREATE POLICY "Auth users can delete material images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials');
