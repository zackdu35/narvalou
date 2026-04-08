export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  const { expr, label } = req.query

  if (!expr) {
    return res.status(400).json({ error: 'Missing expr parameter' })
  }

  try {
    // Basic D&D dice regex: 1d20+5, d8, 2d6-2
    const diceRegex = /^(\d*)d(\d+)([+-]\d+)?$/i
    const match = expr.match(diceRegex)

    if (match) {
      const numDice = parseInt(match[1] || '1')
      const dieSize = parseInt(match[2])
      const modifierStr = match[3] || '+0'
      const modifier = parseInt(modifierStr)

      const rolls = []
      let total = 0
      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * dieSize) + 1
        rolls.push(roll)
        total += roll
      }
      total += modifier

      // Match the format expected by identifyingAndExecuteRolls parser:
      // FINAL:X|EXPR:Y|LABEL:Z|ROLLS:[R1 R2]|MODIFIER:M
      // Also include the readable lines for the breakdown:
      // Dice: [X, Y]
      // Total: Z
      
      const rollsStr = rolls.join(' ')
      const output = `Dice: [${rolls.join(', ')}]\n` +
                     (modifier !== 0 ? `Modifier: ${modifierStr}\n` : '') +
                     `Total: ${total}\n` +
                     `FINAL:${total}|EXPR:${expr}|LABEL:${label || ''}|ROLLS:[${rollsStr}]|MODIFIER:${modifierStr}`
      
      return res.status(200).json({ output })
    } else {
      // Handle constant values like "5" or "10-2"
      const constRegex = /^(\d+)([+-]\d+)?$/
      const cMatch = expr.match(constRegex)
      if (cMatch) {
          const base = parseInt(cMatch[1])
          const modifierStr = cMatch[2] || '+0'
          const modifier = parseInt(modifierStr)
          const total = base + modifier
          const output = `Dice: [${base}]\n` +
                         (modifier !== 0 ? `Modifier: ${modifierStr}\n` : '') +
                         `Total: ${total}\n` +
                         `FINAL:${total}|EXPR:${expr}|LABEL:${label || ''}|ROLLS:[${base}]|MODIFIER:${modifierStr}`
          return res.status(200).json({ output })
      }
      return res.status(400).json({ error: 'Invalid dice expression: ' + expr })
    }
  } catch (error: any) {
    console.error("❌ Erreur API roll-dice:", error.message)
    return res.status(500).json({ error: error.message })
  }
}
