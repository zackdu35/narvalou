# Mécaniques de Jeu et IA - Spécifications

## 1. Le Maître du Jeu (gemini-3-flash-preview)
L'IA doit agir selon un profil **"Hardcore & RAW"** :
- **Narrateur** : Décrit l'environnement selon le mode "Théâtre de l'esprit". Pas de grille de combat. Les distances et positions sont gérées narrativement par l'IA.
- **Arbitre Technique (Délégation Supabase)** : Pour éviter les hallucinations de calcul, l'IA ne gère pas les stocks (PV, flèches, or, emplacements de sorts) de tête. Elle effectue des **Function Calls** pour lire/modifier l'état dans Supabase. Si l'IA dit "Tu n'as plus de sorts de niveau 2", c'est parce que la DB affiche 0.
- **Narration Sécurisée (Bypass Safety)** : Pour éviter les refus de l'API lors de scènes de combat ou thématiques D&D sombres, l'IA adopte un ton "épique-factuel". Si un blocage survient, un middleware de "sanitisation" simplifie le prompt pour débloquer la génération sans perdre le sens.
- **PNJ (Personnages Non Joueurs)** : Adopte une personnalité et un ton spécifique. Cohérence comportementale priorisée sur la cohérence visuelle parfaite.

## 2. Système de Mémoire et Contexte
Structure "étagée" pour une immersion sans faille :
- **Grimoire Core (Statique)** : Règles de base et statistiques actuelles (via API de stats).
- **Logs de Campagne (Dynamique)** : À chaque cycle de résolution, l'IA génère un court résumé (Delta) qui met à jour le journal de bord dans Supabase.
- **Contexte Immédiat** : Les 10-20 derniers messages du chat.
- **Archivage de Session** : Via la commande `/save`, l'IA compile tous les deltas de la session en un "Résumé de Chapitre" illustré et compressé pour le contexte futur.

## 3. Cohérence Visuelle (gemini-2.5-flash-image)
- **Identité Fixe** : Chaque personnage possède une "Description Visuelle Courte" (DVC) immuable dans sa fiche (ex: "Paladin en armure d'argent, cape émeraude, cicatrice à l'œil gauche").
- **Injection de Prompt** : La DVC est systématiquement injectée dans chaque prompt d'image généré par le MJ pour assurer une reconnaissance visuelle des héros.

## 4. Résolution des Actions : La "Pile d'Actions"
1. **Coordination (Hors-IA)** : Les joueurs discutent dans le chat et se mettent d'accord sur une stratégie.
2. **Phase d'Intention** : Les joueurs écrivent leurs actions finales. Elles sont mises en attente.
3. **Validation Collective** : Tous les joueurs doivent cliquer sur "Valider le Round" pour envoyer la pile à l'IA.
4. **Résolution IA (Ordre Chronologique)** : L'IA résout le tour complet. Elle doit respecter le **"Flow de Combat"** : l'ordre des initiatives définit qui agit en premier dans sa narration et dans l'appel des fonctions de dégâts. Si une cible meurt à l'initiative 15, les actions prévues contre elle à l'initiative 10 doivent être redirigées ou annulées par l'IA.

## 5. Système de Dés
1. **Requête du MJ** : L'IA demande un jet spécifique ou déduit une ressource via une fonction :
    - `demander_jet(joueur, type, difficulté)`
    - `use_spell_slot(joueur, niveau)` : Décrémente un emplacement de sort en DB.
    - `consume_item(joueur, item_id, quantite)` : Met à jour l'inventaire.
    - `apply_rest(type)` : "short" ou "long". Restaure PV/Sorts selon les règles 5e en DB.
    - `update_lore_entry(category, key, details)` : Ajoute ou met à jour une fiche dans le "Journal des Rencontres" (PNJ, Lieux, Lore).
2. **Boutons Contextuels** : Un bouton apparaît dans l'interface du joueur avec ses bonus déjà calculés depuis la DB.
3. **Résultat Intégré** : Le résultat est stocké en DB et envoyé à l'IA pour narration.
4. **Indicateurs d'État Ennemis** : L'IA doit inclure dans ses résolutions des tags d'état basés sur le % de PV restants des ennemis : [Indemne > 75%], [Blessé > 50%], [Sanglant > 25%], [Agonisant < 25%].

## 6. Garantie du respect des règles (Anti-Hallucination)
Pour s'assurer que l'IA ne dévie pas des règles de D&D 5e :
1. **Lecture Systématique** : L'IA a l'obligation (via son system prompt) de vérifier l'état des ressources en DB avant de confirmer une action complexe.
2. **Post-Vérification** : Chaque modification d'état (PV, objets) déclenchée par l'IA est validée par le backend de Supabase. Si l'IA tente de consommer une ressource inexistante, le système renvoie une erreur technique que l'IA doit intégrer narrativement.
3. **Traçabilité (Debug Mode)** : Les administrateurs peuvent forcer l'affichage des "Logs MJ" pour voir le détail des jets et des bonus appliqués derrière chaque phrase narrative.
4. **Correction Collective** : La commande `/replay` permet aux joueurs de signaler une erreur de règle majeure, forçant l'IA à reconsidérer son dernier tour avec un rappel spécifique à la règle enfreinte.

## 7. Écran de Fin (TPK)
[HARDCORE MODE]
En cas de mort de tous les joueurs, l'IA génère une image épique de leur chute. La campagne est **définitivement verrouillée** dans Supabase. Aucune résurrection ou retour en arrière n'est possible.

## 8. Ambiance Sonore et Immersive
- **Le MJ DJ** : L'IA peut changer la musique d'ambiance en fonction de la situation narrative via `trigger_sound()`.
- **Réactivité sonore** : Des effets sonores courts (SFX) peuvent être déclenchés lors de réussites ou d'échecs critiques.
 
## 9. États de Santé et Mort (Incapacité)
1. **L'état 0 PV** : Le joueur ne meurt pas instantanément. Il entre en état "Inconscient". L'interface remplace son champ d'action par un bouton **"Jet de Sauvegarde contre la Mort"**.
2. **Stabilisation** : L'IA MJ doit prioriser la narration de cet état critique. Un autre joueur peut utiliser une action pour stabiliser le mourant via la pile d'actions.
3. **Mort Permanente** : Si 3 échecs sont cumulés en DB, le personnage est retiré de la session.

## 10. Création et Progression (Level Up)
1. **Initialisation** : La création se fait via un formulaire guidé par l'IA (en mode setup). L'IA suggère des stats basées sur la classe choisie.
2. **Génération de DVC** : Une fois le personnage créé, l'IA MJ génère automatiquement sa **Description Visuelle Courte** pour garantir la cohérence des futures images AI.
3. **Level Up** : Lorsqu'un seuil d'XP est atteint (déclenché par `update_stat`), le joueur reçoit une notification. Le MJ propose les choix de montée de niveau (nouveaux sorts, spécialisations) dans le chat lors d'un repos long.

## 11. Détection d'Intention et Automatisation (MJ réactif)
L'IA MJ est responsable de la transition entre les phases de jeu en analysant les intentions narratives des joueurs.

### 11.1 Engagement du Combat (Initiative)
- **Déclenchement** : Lorsqu'un ou plusieurs joueurs expriment une intention d'attaque, d'hostilité ou qu'un danger imminent surgit (ex: "Valmir: je choisis d'attaquer le gobelin").
- **Action Système** : L'IA ne résout pas l'attaque immédiatement. Elle suspend la narration, déclenche un jet d'initiative pour tous les participants (joueurs et monstres) via l'interface, et change l'ambiance sonore (`trigger_sound("combat")`).
- **Flow** : Dialogue → Détection IA → Demande d'Initiative UI → Remplissage de la Pile d'Actions.

### 11.2 Demande de Repos
- **Déclenchement** : Lorsqu'un groupe exprime le besoin de récupérer, s'arrête dans un lieu sûr ou bivouaque (ex: "Zac: je choisis de me reposer dans l'auberge").
- **Action Système** : L'IA propose un dialogue de confirmation collective : "Souhaitez-vous prendre un Repos Court ou Long ?".
- **Résolution** : Une fois validé, l'IA appelle `apply_rest(type)` pour mettre à jour les PV et ressources en base de données.



