-- Schema SQL pour Narvalou D&D
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Campagnes
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'genesis', -- 'genesis', 'lobby', 'active', 'finished'
    admin_id UUID -- Optionnel: pour lier à un créateur spécifique
);

-- 2. Mondes (Détails de l'univers)
CREATE TABLE IF NOT EXISTS public.worlds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    archetype TEXT,
    style_guide_dvc TEXT, -- Guide pour les prompts d'IA Image
    color_palette JSONB DEFAULT '[]'::jsonb,
    cover_image_url TEXT,
    lore_summary TEXT, -- Résumé global du lore
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Régions
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    environment_dvc TEXT, -- DVC spécifique à la région
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Factions
CREATE TABLE IF NOT EXISTS public.factions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    alignment TEXT,
    secret_goal TEXT,
    description TEXT,
    leader_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Personnages (PJ & PNJ Majeurs)
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID, -- L'ID de l'utilisateur Supabase si c'est un PJ
    name TEXT NOT NULL,
    role TEXT DEFAULT 'player', -- 'player', 'npc', 'boss'
    class TEXT,
    race TEXT,
    level INTEGER DEFAULT 1,
    stats JSONB DEFAULT '{}'::jsonb, -- STR, DEX, CON, INT, WIS, CHA
    inventory JSONB DEFAULT '[]'::jsonb,
    hp_current INTEGER DEFAULT 10,
    hp_max INTEGER DEFAULT 10,
    dvc TEXT, -- Description Visuelle Courte pour les images
    is_dead BOOLEAN DEFAULT false,
    death_saves_success INTEGER DEFAULT 0,
    death_saves_failure INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Logs de Game (Historique du Chat et Actions)
CREATE TABLE IF NOT EXISTS public.game_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'narration', 'action', 'system', 'chat', 'dice'
    sender_name TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Pour stocker les détails du jet, l'image_url, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Journal de Bord / Lore (Entrées débloquées)
CREATE TABLE IF NOT EXISTS public.lore_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE,
    category TEXT, -- 'history', 'location', 'bestiary', 'items'
    key TEXT NOT NULL,
    details TEXT,
    image_url TEXT,
    is_discovered BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. État de la Session (GameState)
CREATE TABLE IF NOT EXISTS public.game_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
    current_turn INTEGER DEFAULT 0,
    phase TEXT DEFAULT 'creation', -- 'creation', 'combat', 'exploration', 'rest'
    active_combat_order JSONB DEFAULT '[]'::jsonb, -- ID des personnages dans l'ordre d'initiative
    last_action_timestamp TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enabling Realtime for specific tables (à configurer aussi dans la dashboard Supabase)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;

-- RLS (Row Level Security) - Modèles de base (à affiner selon les besoins d'auth)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pour les campagnes" ON public.campaigns FOR SELECT USING (true);
-- Pour l'instant on permet tout en lecture pour simplifier le dev (A changer en prod !)
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public SELECT worlds" ON public.worlds FOR SELECT USING (true);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public SELECT characters" ON public.characters FOR SELECT USING (true);
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public SELECT logs" ON public.game_logs FOR SELECT USING (true);
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public SELECT state" ON public.game_state FOR SELECT USING (true);
