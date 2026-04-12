const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-lite';


async function generateAIContent(systemPrompt, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUSER PROMPT: ${userPrompt}` }]
      }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Gemini API Error:', error);
    throw new Error('Erreur lors de la génération IA');
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse AI JSON:', text);
    throw new Error('Format de réponse IA invalide');
  }
}

export const aiService = {
  async generateArchetypes(seed) {
    const systemPrompt = `Tu es l'Architecte de Narvalou. Basé sur la "semence" (seed) de l'utilisateur, propose 3 archétypes de mondes uniques et évocateurs.
    Réponds EXCLUSIVEMENT en JSON sous ce format :
    [
      { "id": "unique-id", "title": "Titre", "description": "Description immersive", "tone": "Le ton", "danger": "Niveau" },
      ...
    ]`;
    return generateAIContent(systemPrompt, seed);
  },

  async generatePillars(archetype, seed) {
    const systemPrompt = `Tu es l'Architecte. Pour l'archétype "${archetype.title}" issu de la graine "${seed}", génère 3 piliers du monde : Géographie, Lore, Factions.
    Réponds EXCLUSIVEMENT en JSON :
    [
      { "category": "Géographie", "title": "...", "description": "..." },
      { "category": "Lore", "title": "...", "description": "..." },
      { "category": "Factions", "title": "...", "description": "..." }
    ]`;
    return generateAIContent(systemPrompt, seed);
  },

  async generateHook(archetype, pillars, seed) {
    const systemPrompt = `Tu es l'Architecte. Synthétise un point d'entrée pour l'aventure dans ce monde : "${archetype.title}".
    Considère les piliers: ${JSON.stringify(pillars)}.
    Génère un lieu, un PNJ et une Quête Zéro.
    Réponds EXCLUSIVEMENT en JSON :
    {
      "location": { "title": "...", "description": "..." },
      "npc": { "name": "...", "description": "..." },
      "quest": { "title": "...", "description": "..." }
    }`;
    return generateAIContent(systemPrompt, seed);
  },

  async suggestCharacterOptions(worldContext) {
    if (import.meta.env.VITE_SKIP_IMAGES === 'true') {
      return [
        { name: "Eldrin", race: "Elfe", class: "Magicien", background: "Sage", description: "Un érudit cherchant des secrets anciens.", stats: { str: 8, dex: 14, con: 12, int: 16, wis: 14, cha: 10 } },
        { name: "Thrain", race: "Nain", class: "Guerrier", background: "Soldat", description: "Un vétéran de nombreuses batailles souterraines.", stats: { str: 16, dex: 10, con: 16, int: 8, wis: 12, cha: 10 } },
        { name: "Lira", race: "Halfelin", class: "Rôdeur", background: "Éclaireur", description: "Une chasseresse agile connaissant tous les sentiers.", stats: { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 } }
      ];
    }
    const systemPrompt = `Tu es l'Ancien Oracle de Narvalou. Basé sur l'univers suivant (Archetype + Piliers), propose 3 concepts de personnages (Race + Classe + Background) uniques et cohérents.
    Réponds EXCLUSIVEMENT en JSON :
    [
      { "name": "Nom suggéré", "race": "Race", "class": "Classe", "background": "Origine", "description": "Pourquoi ce perso dans ce monde ?", "stats": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 } }
    ]`;
    return generateAIContent(systemPrompt, `CONTEXTE DU MONDE : ${JSON.stringify(worldContext)}`);
  },

  async generateCharacterDVC(characterData, worldStyle) {
    if (import.meta.env.VITE_SKIP_IMAGES === 'true') {
      return { dvc: `Un fier ${characterData.race} ${characterData.class} nommé ${characterData.name}${characterData.appearance ? ', ' + characterData.appearance : ''}, prêt pour l'aventure dans un style ${worldStyle}.` };
    }
    const systemPrompt = `Tu es l'Architecte Visuel. Génère une Description Visuelle Courte (DVC) pour ce personnage de D&D.
    La DVC doit être dense, évocatrice et respecter le style du monde. 
    STYLE DU MONDE : ${worldStyle}
    PERSONNAGE : ${JSON.stringify(characterData)}
    Réponds EXCLUSIVEMENT en JSON : { "dvc": "La description visuelle en 2-3 phrases." }`;
    return generateAIContent(systemPrompt, `Génère la DVC pour ${characterData.name}`);
  },
  
  async generateResponse(campaign, character, history, userPrompt, allCharacters = []) {
    const groupContext = allCharacters.length > 0 
      ? `Groupe de héros :\n${allCharacters.map(c => `- ${c.name} (${c.race} ${c.class}, PV: ${c.hp_current}/${c.hp_max}, Niveau ${c.level || 1}, Stats: ${JSON.stringify(c.stats || {})})`).join('\n')}` 
      : `Le personnage du joueur est ${character.name} (un ${character.race} ${character.class}, PV: ${character.hp_current}/${character.hp_max}).`;
    
    const systemPrompt = `Tu es le Maître du Jeu IA (MJ) de l'univers "${campaign.name}". 
    ${groupContext}
    Le joueur actif est ${character.name}.
    Historique récent : ${JSON.stringify(history.slice(-10))}
    
    RÈGLES DE RÉPONSE :
    - Réponds de manière immersive, cinématique (maximum 5 phrases narratives).
    - Fais avancer l'intrigue ou réagis à l'action du joueur.
    - Inclus les métadonnées de la scène actuelle.
    
    SYSTÈME DE DÉS :
    - Si une action nécessite un jet de dés (attaque, perception, sauvegarde, compétence...), 
      ajoute un objet dans "dice_requests" au lieu de lancer toi-même.
    - Types de jets : d4, d6, d8, d10, d12, d20
    - Inclus le modificateur basé sur les stats du joueur.
    - dd = Degré de Difficulté (optionnel).
    
    FUNCTION CALLING :
    - Si le résultat de l'action modifie l'état du jeu (PV, inventaire, etc.), 
      ajoute les appels dans "function_calls".
    - Fonctions disponibles :
      * update_stat(character_name, stat, value) — stat: "hp_current", "hp_max", "level"
        value: nombre absolu OU "+5"/"-3" pour relatif
      * consume_item(character_name, item_name, quantity)
      * use_spell_slot(character_name, level)
      * apply_rest(type) — type: "short" ou "long"
      * update_lore_entry(category, key, details) — category: "pnj"|"lieu"|"rumeur"
    
    INDICATEURS ENNEMIS :
    - Si un ennemi est mentionné, ajoute un tag d'état basé sur ses PV :
      [Indemne > 75%], [Blessé > 50%], [Sanglant > 25%], [Agonisant < 25%]
    
    COMMANDES SPÉCIALES :
    - Si le message commence par [QUESTION HORS-RP], NE CONTINUE PAS la narration.
      Réponds de manière informative, claire et hors du contexte RP (en tant que MJ qui aide le joueur).
      Ton "content" doit être une réponse hors-jeu, comme un MJ humain qui explique les règles ou le contexte.
    - Si le message commence par [COMMANDE SYSTÈME], exécute la commande demandée (résumé, repos, etc.).
    - Si le message commence par [RÉSULTAT DE JET], narre la conséquence du jet (succès ou échec).
    - Si le message commence par [PILE D'ACTIONS], résous les actions de tous les joueurs dans l'ordre d'initiative.
    
    Réponds EXCLUSIVEMENT en JSON sous ce format :
    {
      "content": "Ta réponse immersive narrative",
      "sender": "Architecte MJ",
      "location": "Nom du lieu actuel",
      "time_of_day": "Matin|Midi|Soir|Nuit",
      "scene_mood": "Calme|Tendu|Combat|Mystère",
      "dice_requests": [
        {
          "player": "Nom du joueur qui doit lancer",
          "type": "d20",
          "modifier": 3,
          "reason": "Jet de Perception",
          "dd": 15
        }
      ],
      "function_calls": [
        {
          "name": "update_stat",
          "args": { "character_name": "Zac", "stat": "hp_current", "value": "-5" }
        }
      ]
    }
    
    IMPORTANT : dice_requests et function_calls sont des tableaux optionnels. 
    Si aucun jet ni modification n'est nécessaire, retourne des tableaux vides [].`;
    return generateAIContent(systemPrompt, userPrompt);
  },

  async generateImage(prompt) {
    // Skip image gen if env flag is set
    if (import.meta.env.VITE_SKIP_IMAGES === 'true') {
      console.log('SKIP_IMAGES: Image generation skipped for prompt:', prompt);
      return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1024";
    }

    const IMAGE_MODEL = 'gemini-2.5-flash-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini Image API error:', response.status, errorData);
        throw new Error(`Gemini image error ${response.status}`);
      }

      const data = await response.json();
      
      // Scan parts for image data
      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error('No image data in Gemini response');
    } catch (err) {
      console.error('Gemini Image Error, falling back to Pollinations:', err);
      const encodedPrompt = encodeURIComponent(prompt + ", high fantasy, realistic, digital art, dnd style");
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
    }
  },

  async generateSceneImage(narrativeContext, worldDVC) {
    const scenePrompt = `${worldDVC || 'dark fantasy epic scene'}, ${narrativeContext}, cinematic wide angle, dramatic lighting, highly detailed environment`;
    return this.generateImage(scenePrompt);
  }
};
