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
    if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
      return { dvc: `Un fier ${characterData.race} ${characterData.class} nommé ${characterData.name}${characterData.appearance ? ', ' + characterData.appearance : ''}, prêt pour l'aventure dans un style ${worldStyle}.` };
    }
    const systemPrompt = `Tu es l'Architecte Visuel. Génère une Description Visuelle Courte (DVC) pour ce personnage de D&D.
    La DVC doit être dense, évocatrice et respecter le style du monde. 
    STYLE DU MONDE : ${worldStyle}
    PERSONNAGE : ${JSON.stringify(characterData)}
    Réponds EXCLUSIVEMENT en JSON : { "dvc": "La description visuelle en 2-3 phrases." }`;
    return generateAIContent(systemPrompt, `Génère la DVC pour ${characterData.name}`);
  },
  
  async generateResponse(campaign, character, history, userPrompt) {
    const systemPrompt = `Tu es le Maître du Jeu IA (MJ) de l'univers "${campaign.name}". 
    Le personnage du joueur est ${character.name} (un ${character.race} ${character.class}).
    Historique récent : ${JSON.stringify(history.slice(-5))}
    Réponds de manière immersive, cinématique et courte (maximum 4 phrases). 
    Fais avancer l'intrigue ou réagis à l'action du joueur.
    Réponds EXCLUSIVEMENT en JSON sous ce format :
    { "content": "Ta réponse immersive", "sender": "Architecte MJ" }`;
    return generateAIContent(systemPrompt, userPrompt);
  },

  async generateImage(prompt) {
    // Mode Dev : On ne génère pas d'image réelle pour économiser les quotas
    if (import.meta.env.DEV) {
      console.log('DEV MODE: Image generation skipped for prompt:', prompt);
      return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1024";
    }

    const IMAGE_MODEL = 'gemini-2.5-flash-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${API_KEY}`;
    
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: `Génère une image haute qualité pour ce personnage de D&D : ${prompt}` }]
      }],
      generationConfig: {
        responseMimeType: "image/png"
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('Erreur génération image Gemini');

      const data = await response.json();
      const base64Data = data.candidates[0].content.parts[0].inlineData.data;
      return `data:image/png;base64,${base64Data}`;
    } catch (err) {
      console.error('Gemini Image Error, falling back to Pollinations:', err);
      const encodedPrompt = encodeURIComponent(prompt + ", high fantasy, realistic, digital art, dnd style");
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
    }
  }
};
