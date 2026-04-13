# Interface et Design (UI/UX) - Spécifications

## 1. Identité Visuelle
Basée sur les maquettes existantes :
- **Palette** : Noir profond (#050505), Or antique (#C5A059), Vert émeraude sombre pour la santé.
- **Typographie** : Serif élégante pour les titres (style médiéval), Sans-serif lisible pour le chat.
- **Effets** : Glassmorphism, bordures dorées fines, lueurs subtiles sur les éléments actifs.

## 2. Écran de Sélection de Campagne
- Affichage sous forme de cartes (Grid layout).
- État "Maj" (Mise à jour) visible.
- Bouton interactif "Entrer dans l'aventure".
- Section "Nouvelle Aventure" avec effet de surbrillance.

## 3. Écran Live (Table de Jeu)
- **Top Bar** : Emplacement actuel (Lieu), Heure du jour (Matin, Midi, Soir, Nuit), Session en cours, Bouton quitter.
- **Sidebar Gauche** : 
    - **Statut du groupe** : Portraits, barres de PV, barre d'XP (niveau actuel/prochain niveau).
    - **Le Journal de Quête** : Liste des objectifs actifs et terminés.
    - **Inventaire** : Accès aux objets portés et à la charge actuelle.
    - **Livre des Sorts** : Consultation des sorts connus/préparés et des emplacements de sorts restants.
    - **Journal des Rencontres** : Archive des PNJ croisés, lieux visités et rumeurs collectées.
- **Zone Centrale** : Image de la scène actuelle (gemini-2.5-flash-image) avec une légende contextuelle fine juste en dessous. Bloc narratif principal en bas de l'image.
- **Sidebar Droite (Chat)** : 
    - Indicateur "IA DM Active".
    - Flux de discussion avec bulles différenciées (Joueur vs MJ).
    - **Zone d'Action Contextuelle** : Apparition dynamique de boutons (Jets de dés, choix de dialogue) demandés par le MJ.
    - **Indicateurs de Santé Ennemis** : Affichage discret (tags de couleur : Indemne, Blessé, Sanglant, Agonisant) à côté du nom des ennemis cités dans le chat.
    - Champ de saisie avec support des Slash Commands.

## 4. Composants Interactifs
- **Modale de Carte** : Affichage d'une carte du monde interactive.
- **Fiches de Personnage** : Détails accessibles en cliquant sur les portraits de la sidebar.
- **Grimoire de Sorts** : Modale détaillée affichant les descriptions des sorts et le suivi des ressources magiques.
