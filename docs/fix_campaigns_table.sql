-- SCRIPT DE MIGRATION POUR NARVALOU
-- Objectif : Ajouter la colonne map_url et les droits d'écriture sur la table campaigns

-- 1. Ajout de la colonne manquante
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS map_url TEXT;

-- 2. Ajout des politiques RLS pour permettre la création et la mise à jour des campagnes
-- (Nécessaire pour le bouton "Éveiller" et la sauvegarde des cartes)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'campaigns' AND policyname = 'Allow all INSERT campaigns'
    ) THEN
        CREATE POLICY "Allow all INSERT campaigns" ON public.campaigns FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'campaigns' AND policyname = 'Allow all UPDATE campaigns'
    ) THEN
        CREATE POLICY "Allow all UPDATE campaigns" ON public.campaigns FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END $$;
