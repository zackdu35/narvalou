# Vision Globale - Narvalou D&D

## 1. Objectif du Projet
Créer une plateforme de Jeu de Rôle (JdR) en ligne où l'intelligence artificielle (Gemini) occupe le rôle de Maître du Jeu (MJ). Le site doit permettre à un groupe d'amis de vivre une aventure immersive, visuelle et narrative sans intervention humaine pour la narration.

## 2. Piliers du Projet
- **Immersion Visuelle** : Génération automatique d'illustrations de scènes et de personnages en cohérence avec le récit.
- **Narrativité Augmentée** : Un MJ IA capable d'improviser, d'interpréter des PNJ et de réagir aux actions créatives des joueurs.
- **Accessibilité** : Une interface "premium" qui simplifie les règles complexes de D&D 5e pour se concentrer sur l'histoire.

## 3. Architecture Technique (Prévisionnelle)
- **Frontend** : React + Vite + Tailwind CSS (ou CSS custom pour le style premium).
- **Backend/Base de données** : Supabase (Authentification, Realtime, Database, Storage).
- **IA Narratrice** : gemini-2.5-flash-lite (via API).
- **IA Image** : gemini-2.5-flash-image (via API, avec injection DVC).
- **Source de Vérité** : Supabase (Stats, Inventaire, Logs, États du monde).

## 4. Flux de Jeu
1. **Genèse de l'Univers** : L'administrateur définit l'univers via l' **[Interface de Genèse](./05_interface_genese.md)** (Skill IA "Architecte"). L'IA génère un **"Grimoire de Monde"** et définit les identités visuelles des personnages.
2. **Création de Légende** : Chaque joueur crée son personnage. La **Description Visuelle Courte** (DVC) est enregistrée pour la cohérence des images.
3. **Lobby/Session** : Les joueurs rejoignent la partie en temps réel.
4. **Boucle de Gameplay (Cycles)** :
    - L'IA décrit la situation (Scene + Image cohérente).
    - Les joueurs coordonnent leur stratégie et accumulent leurs actions.
    - **Validation Collective** (100% de prêts) -> Résolution par l'IA.
    - L'IA met à jour Supabase via Function Calling (PV, Inventaire).
    - Session clôturée par `/save` pour l'archivage long terme.

