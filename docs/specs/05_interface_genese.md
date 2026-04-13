# Interface de Genèse (World Builder) - Spécifications

## 1. Vision : L'IA "Architecte"
Le World Builder (Interface de Genèse) n'est pas un simple formulaire, mais une **compétence IA (Skill)** active qui guide l'utilisateur pour transformer une idée vague en un univers complet, prêt à jouer. L'expérience doit ressembler à une collaboration avec un "Lead Designer" numérique.

## 2. Le Pipeline d'Automatisation (Flux de Génération)
La genèse se déroule en cycles automatisés où l'IA propose et l'utilisateur valide ou ajuste.

### Étape 1 : L'Étincelle (The Seed)
- **Input Utilisateur** : Une phrase ou des mots-clés (ex: "Pirates dans un monde d'îles volantes et magie de vapeur").
- **Action IA** : Analyse du genre et proposition de **3 Archétypes de Monde** (ex: Steampunk Celeste, Mythe d'Icare, Flotte Obscure). Chaque archétype inclut un ton, une palette de couleurs suggérée et un niveau de danger.

### Étape 2 : Le Grimoire de l'Univers (Data Core)
Une fois l'archétype choisi, l'IA automatise la création des piliers via Function Calling :
- **Géographie (Atlas)** : Création de 3 régions majeures avec leurs descriptions visuelles.
- **Lore (Chroniques)** : Un événement historique fondateur et un mystère central non résolu.
- **Factions (Échiquier)** : 2-3 organisations avec leurs motivations et leaders.
- **Cosmologie** : Définition des sources de magie ou des divinités.

### Étape 3 : Synthèse Visuelle (The Visual Hook)
L'IA génère automatiquement :
- **Une Cover Image** : Une illustration épique de l'univers.
- **Un Style Guide (DVC Monde)** : Une directive technique de prompt (ex: "Style aquarelle sombre, contrastes or et gris, brouillard omniprésent") qui sera utilisée pour toutes les futures images de la campagne.

### Étape 4 : Mise en Relation (The Hook)
L'IA génère le point d'entrée pour les joueurs :
- **Lieu de Départ** : Une auberge, une prison, une ruine...
- **Le Premier PNJ** : Celui qui donnera la quête initiale.
- **La Quête Zéro** : Un objectif immédiat pour lancer l'action.

## 3. Interface et Expérience (UI "Skill")
L'interface doit refléter la puissance de l'IA :

- **Console de Traitement** : Un panneau "Log technique" qui affiche les étapes en cours : 
    - `[INFO] Analyse de la structure sémantique de l'univers...`
    - `[PROCESS] Injection des factions dans le registre Supabase...`
    - `[GEN] Création de la palette visuelle "Nébuleuse de Sang"...`
- **Dashboard de Feedback** : Les propositions de l'IA apparaissent sous forme de **Cartes de Lore**. L'utilisateur a 3 options par carte :
    - **Valider (Keep)** : Enregistre définitivement en DB.
    - **Ajuster (Refine)** : Permet d'ajouter une précision (ex: "Plus de technologie, moins de magie").
    - **Régénérer (Reroll)** : L'IA propose une alternative radicale.
- **Prévisualisation "Live"** : Au fur et à mesure, une carte du monde stylisée ou une mosaïque d'images commence à se remplir sur le côté de l'écran.

## 4. Intégration Technique (Function Calling)
L'IA "Architecte" utilise des fonctions spécifiques pour structurer le monde en base de données :

```typescript
// Exemples de fonctions appelées par le World Builder
create_region(name: string, description: string, environment_dvc: string);
create_faction(name: string, alignment: string, secret_goal: string);
set_world_visual_style(style_prompt: string, color_palette: string[]);
generate_adventure_hook(title: string, trigger_event: string);
```

## 5. Transition vers la Création de Légendes
Une fois le monde validé, le World Builder se ferme et l'IA passe en mode **"Oracle de Création de Personnages"**. Elle utilise le contexte du monde nouvellement créé pour guider les joueurs dans des choix cohérents (ex: "Dans ce monde d'îles volantes, préférez-vous être un Navigateur des Vents ou un Pirate des Cieux ?").

## 6. Sécurité et Équilibre
- **Guardrails Narratifs** : L'IA refuse les concepts qui casseraient les mécaniques D&D 5e de base (sauf demande explicite) pour garantir que le jeu reste jouable via les fonctions de stats habituelles.
- **Cohérence Automatisée** : Si l'utilisateur change un élément du lore à l'étape 3, l'IA vérifie et propose des ajustements automatiques sur les étapes 1 et 2 pour éviter les contradictions.
