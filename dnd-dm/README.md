# D&D Dungeon Master Skill

A comprehensive D&D 5e Dungeon Master skill for Claude Code that integrates with CandleKeep for adventure books and provides immersive gameplay features.

## Features

- **Adventure Book Integration**: Query D&D adventure modules stored in CandleKeep
- **Dice Rolling**: CLI-based dice roller for all game mechanics
- **NPC Voice Acting**: Optional text-to-speech for bringing NPCs to life
- **Campaign Management**: Track sessions, character progression, and story arcs
- **Two Game Modes**: Adventure Mode (immersive) or Debug Mode (transparent)

## Quick Start

### Basic Setup

1. The skill is ready to use out of the box for running D&D campaigns
2. Make sure you have adventure books loaded in CandleKeep
3. Use the `/dm-prepare` command to resume a campaign

### Optional: NPC Voice Setup

To enable text-to-speech for NPC voices:

1. **Get an API Key**:
   - Sign up at [ElevenLabs](https://elevenlabs.io)
   - Navigate to Settings → API Keys
   - Copy your API key

2. **Configure the Skill**:
   ```bash
   cd .claude/skills/dnd-dm
   cp .env.example .env
   ```

3. **Add Your API Key**:
   Edit `.env` and replace `your_api_key_here` with your actual API key:
   ```
   ELEVENLABS_API_KEY=sk_your_actual_key_here
   ```

4. **Install Dependencies** (if not already done):
   ```bash
   npm install
   ```

5. **Test It**:
   ```bash
   node speak-npc.js --text "Welcome, brave adventurer!" --voice wizard --npc "Gandalf"
   ```

## Using NPC Voices During Gameplay

The DM will use TTS **sparingly** for dramatic moments:

- First introductions of major NPCs
- Villain speeches and taunts
- Emotional reveals
- Climactic moments

### Available Voice Presets

The tool uses ElevenLabs' `eleven_flash_v2_5` model for fast, low-latency voice generation perfect for real-time gameplay.

```bash
# List all available voices
node speak-npc.js --list
```

**Character Types**:
- `goblin` - Sneaky, nasty creatures
- `dwarf` - Deep, gruff voices
- `elf` - Elegant, refined speech
- `wizard` - Wise, scholarly tone
- `warrior` - Gruff, commanding
- `villain` - Menacing, threatening
- `merchant` - Friendly, talkative
- `guard` - Authoritative
- And more!

### Example Usage

```bash
# Goblin ambush
node speak-npc.js --text "You die now, pinkskin!" --voice goblin --npc "Cragmaw Scout"

# Wise wizard
node speak-npc.js --text "The path ahead is fraught with danger." --voice wizard --npc "Elminster"

# Villain monologue
node speak-npc.js --text "You fools! You've played right into my hands!" --voice villain --npc "The Black Spider"
```

## Dice Roller

The built-in dice roller handles all game mechanics:

```bash
# Basic rolls
./roll-dice.sh 1d20+5 --label "Attack roll"
./roll-dice.sh 2d6+3 --label "Damage"

# Advantage/Disadvantage
./roll-dice.sh 1d20+3 --advantage --label "Attack with advantage"
./roll-dice.sh 1d20 --disadvantage --label "Stealth in heavy armor"

# Hidden rolls (for DM)
./roll-dice.sh 1d20+6 --hidden --label "Enemy stealth"
```

## Game Modes

### Adventure Mode (Default)
- Immersive gameplay with hidden DM information
- Secret rolls for enemies
- Builds suspense and mystery

### Debug Mode
- All information visible (rolls, DCs, stats)
- Helpful for learning or troubleshooting
- Request with: "Let's play in debug mode"

## Campaign Management

The skill automatically tracks:
- Session logs with detailed accounts
- Character progression and XP
- Party resources (HP, spell slots, items)
- NPC relationships and quest status
- Complete campaign history

Files are stored in: `.claude/skills/dnd-dm/sessions/<campaign-name>/`

## Troubleshooting

### TTS Not Working?

1. **Check API Key**: Verify `.env` file exists with valid key
2. **Audio Player**:
   - macOS: Uses `afplay` (built-in)
   - Linux: Install `mpg123` via package manager
3. **API Quota**: Check usage at [ElevenLabs Dashboard](https://elevenlabs.io)
4. **Skip It**: TTS is optional! The skill works perfectly without it

### Dependencies Not Installed?

```bash
cd .claude/skills/dnd-dm
npm install
```

### Permission Issues?

Make scripts executable:
```bash
chmod +x roll-dice.sh
chmod +x speak-npc.js
```

## Files

```
.claude/skills/dnd-dm/
├── SKILL.md              # Main skill definition
├── dm-guide.md           # Detailed DM guidance
├── roll-dice.sh          # Dice rolling CLI
├── speak-npc.js          # TTS CLI tool
├── package.json          # Node dependencies
├── .env.example          # API key template
├── .env                  # Your API key (git-ignored)
├── sessions/             # Campaign data
│   └── <campaign>/
│       ├── campaign-log.md
│       ├── campaign-summary.md
│       └── character-*.md
└── templates/            # Session templates
```

## Tips for Great Games

1. **Read Ahead**: Know the next 2-3 encounters
2. **Take Notes**: Track NPC interactions and player decisions
3. **Use Voice Sparingly**: Save TTS for impactful moments
4. **Be Flexible**: Players will surprise you - embrace it!
5. **Have Fun**: Your enthusiasm is contagious!

## Commands

- `/dm-prepare` - Resume a campaign session (reads logs and prepares next content)
- Regular conversation activates the skill automatically

## Support

For issues or questions:
- Check the [Claude Code Documentation](https://docs.claude.com)
- Review `SKILL.md` for detailed instructions
- Consult `dm-guide.md` for DMing tips

---

**Ready to start your adventure? Just say "Let's play D&D" and begin!**
