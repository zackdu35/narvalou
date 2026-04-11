# Commandes Chat et Système - Spécifications

## 1. Slash Commands (Joueurs)
Les commandes permettent d'interagir rapidement avec le système sans passer par la narration.

- `/help` : Affiche la liste de toutes les commandes disponibles.
- `/inventory` : Affiche l'inventaire actuel du joueur.
- `/stats` : Affiche les statistiques principales et modificateurs.
- `/map` : Ouvre la carte du monde.
- `/spells` : Affiche le livre des sorts et les emplacements disponibles.
- `/lore` : Ouvre le Journal des Rencontres (PNJ, Lieux, Rumeurs).
- `/save` : (Collectif) Archive la session actuelle, génère un résumé narratif et met à jour le contexte long terme.
- `/replay` : (Collectif) Annule et régénère la dernière résolution de l'IA (usage exceptionnel).
- `/r [message]` : (Chuchotement) Envoie une action ou pensée secrète au MJ.
- `/dm [question]` : Pose une question "Hors-RP" au MJ pour éclaircir un point de règle ou de contexte.
- `/rest` : (Collectif / IA) Propose un repos (court ou long) au groupe. Déclenché soit manuellement, soit par l'IA lorsqu'elle détecte une intention de repos dans la narration (ex: "Je m'installe dans une auberge").
- `/init` : (IA) Relance l'initiative du groupe. Déclenché automatiquement par l'IA lors du passage en mode combat (ex: "J'attaque le gobelin").

## 2. Phase de Validation Collective
Pour que l'IA résolve un tour, un processus de validation est nécessaire :
1.  **Envoi d'Intention** : Chaque joueur soumet son action (bouton "Envoyer").
2.  **Statut "Ready"** : L'interface affiche qui a validé.
3.  **Déclenchement** : Une fois que 100% des joueurs ont validé, l'IA reçoit la pile. Un joueur peut "Forcer le tour" si un camarade est AFK (nécessite une majorité).

## 3. Commandes Système (IA)
L'IA peut déclencher des actions via le Function Calling :
- `trigger_sound(category, mood)` : Change l'ambiance sonore (ex: "forest", "combat", "tavern").
- `update_stat(character_id, stat, value)` : Modifie directement une valeur dans Supabase (PV, Munitions, Or).
- `lock_campaign(reason)` : En cas de mort totale (TPK), verrouille la session et affiche l'écran de fin.


## 3. Logs et Transparence
- **Logs MJ (Hidden)** : Chaque réponse de l'IA génère un log invisible pour les joueurs mais accessible en debug. L'IA y explique ses calculs : "Le joueur a fait 15, le DD était de 14. Succès de justesse. J'ajoute une complication mineure...".
- **Historique Technique** : Un panneau latéral peut afficher l'historique des jets de dés et des appels de fonctions (XP, PV) pour vérifier la cohérence.
