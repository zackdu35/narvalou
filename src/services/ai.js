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
  }
};
