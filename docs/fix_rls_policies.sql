-- Exécuter dans l'éditeur SQL de Supabase Dashboard
-- Ajoute les policies manquantes pour INSERT, UPDATE et DELETE

-- game_state: permettre les écritures
CREATE POLICY "Allow all INSERT game_state" ON public.game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all UPDATE game_state" ON public.game_state FOR UPDATE USING (true) WITH CHECK (true);

-- game_logs: permettre les écritures (INSERT pour les messages)
CREATE POLICY "Allow all INSERT game_logs" ON public.game_logs FOR INSERT WITH CHECK (true);

-- characters: permettre les updates (pour les PV, inventaire, etc.)
CREATE POLICY "Allow all UPDATE characters" ON public.characters FOR UPDATE USING (true) WITH CHECK (true);

-- lore_entries: permettre les écritures
CREATE POLICY "Allow all INSERT lore_entries" ON public.lore_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all UPDATE lore_entries" ON public.lore_entries FOR UPDATE USING (true) WITH CHECK (true);

-- Unique constraint nécessaire pour les upserts sur lore_entries
ALTER TABLE public.lore_entries ADD CONSTRAINT lore_entries_world_key_unique UNIQUE (world_id, key);
