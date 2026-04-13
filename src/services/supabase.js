import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceRole) {
  console.warn('Supabase credentials missing in .env')
}

export const supabase = createClient(supabaseUrl, supabaseServiceRole)

// Fonctions utilitaires pour le jeu
export const db = {
  supabase,
  auth: {
    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return data
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    getUser: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    }
  },

  // Campagnes
  campaigns: {
    list: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    get: async (id) => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, worlds(*, regions(*), factions(*))')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    create: async (name, description, adminId, extra = {}) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{ name, description, admin_id: adminId, ...extra }])
        .select()
        .single()
      if (error) throw error
      return data
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    subscribe: (id, callback) => {
      return supabase
        .channel(`campaign-${id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'campaigns',
          filter: `id=eq.${id}`
        }, callback)
        .subscribe()
    }
  },

  // Personnages
  characters: {
    getByUserAndCampaign: async (userId, campaignId) => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    getByCampaign: async (campaignId) => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', campaignId)
      if (error) throw error
      return data
    },
    create: async (characterData) => {
      const { data, error } = await supabase
        .from('characters')
        .insert([characterData])
        .select()
        .single()
      if (error) throw error
      return data
    },
    updateStats: async (id, stats) => {
      const { data, error } = await supabase
        .from('characters')
        .update({ stats })
        .eq('id', id)
      if (error) throw error
      return data
    }
  },

  // Logs
  logs: {
    add: async (campaignId, type, content, senderName = 'Système', metadata = {}) => {
      const { data, error } = await supabase
        .from('game_logs')
        .insert([{ 
          campaign_id: campaignId, 
          type, 
          content, 
          sender_name: senderName, 
          metadata 
        }])
      if (error) throw error
      return data
    },
    getRecent: async (campaignId, limit = 50) => {
      const { data, error } = await supabase
        .from('game_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    subscribe: (campaignId, callback) => {
      return supabase
        .channel(`logs-${campaignId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_logs',
          filter: `campaign_id=eq.${campaignId}`
        }, callback)
        .subscribe()
    }
  },

  // Game State
  gameState: {
    get: async (campaignId) => {
      const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    update: async (campaignId, updates) => {
      const { data, error } = await supabase
        .from('game_state')
        .upsert({ campaign_id: campaignId, ...updates }, { onConflict: 'campaign_id' })
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  // Realtime subscriptions
  realtime: {
    subscribeCharacters: (campaignId, callback) => {
      return supabase
        .channel(`characters-${campaignId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `campaign_id=eq.${campaignId}`
        }, callback)
        .subscribe()
    },
    subscribeGameState: (campaignId, callback) => {
      return supabase
        .channel(`gamestate-${campaignId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_state',
          filter: `campaign_id=eq.${campaignId}`
        }, callback)
        .subscribe()
    }
  },

  // Function Call Execution (IA → Supabase)
  executeFunctionCall: async (call, campaignId, characters) => {
    const { name, args } = call
    console.log(`[FC] Executing: ${name}`, args)

    try {
      switch (name) {
        case 'update_stat': {
          const char = characters.find(c => c.name === args.character_name)
          if (!char) { console.warn(`[FC] Character not found: ${args.character_name}`); return null }
          
          let newValue = args.value
          // Handle relative values like "+5" or "-3"
          if (typeof newValue === 'string' && (newValue.startsWith('+') || newValue.startsWith('-'))) {
            newValue = (char[args.stat] || 0) + parseInt(newValue)
          } else {
            newValue = parseInt(newValue)
          }
          
          // Clamp HP between 0 and max
          if (args.stat === 'hp_current') {
            newValue = Math.max(0, Math.min(newValue, char.hp_max))
          }

          const { error } = await supabase
            .from('characters')
            .update({ [args.stat]: newValue })
            .eq('id', char.id)
          if (error) throw error
          return { character: char.name, stat: args.stat, oldValue: char[args.stat], newValue }
        }

        case 'consume_item': {
          const char = characters.find(c => c.name === args.character_name)
          if (!char) return null
          
          const inventory = [...(char.inventory || [])]
          const itemIdx = inventory.findIndex(i => i.name === args.item_name)
          if (itemIdx >= 0) {
            inventory[itemIdx].quantity = (inventory[itemIdx].quantity || 1) - (args.quantity || 1)
            if (inventory[itemIdx].quantity <= 0) inventory.splice(itemIdx, 1)
          }
          
          const { error } = await supabase
            .from('characters')
            .update({ inventory })
            .eq('id', char.id)
          if (error) throw error
          return { character: char.name, item: args.item_name, consumed: args.quantity || 1 }
        }

        case 'use_spell_slot': {
          const char = characters.find(c => c.name === args.character_name)
          if (!char) return null
          
          const stats = { ...(char.stats || {}) }
          const slotKey = `spell_slots_${args.level}`
          stats[slotKey] = Math.max(0, (stats[slotKey] || 0) - 1)
          
          const { error } = await supabase
            .from('characters')
            .update({ stats })
            .eq('id', char.id)
          if (error) throw error
          return { character: char.name, spellLevel: args.level, remaining: stats[slotKey] }
        }

        case 'apply_rest': {
          const updates = {}
          for (const char of characters) {
            if (args.type === 'long') {
              updates[char.id] = { hp_current: char.hp_max }
            } else {
              // Short rest: recover 25% HP
              const heal = Math.floor(char.hp_max * 0.25)
              updates[char.id] = { hp_current: Math.min(char.hp_max, char.hp_current + heal) }
            }
          }
          
          for (const [charId, upd] of Object.entries(updates)) {
            const { error } = await supabase
              .from('characters')
              .update(upd)
              .eq('id', charId)
            if (error) console.error(`[FC] Rest update failed for ${charId}:`, error)
          }
          return { type: args.type, healed: Object.keys(updates).length }
        }

        case 'update_lore_entry': {
          // Get the world_id from campaign
          const { data: world } = await supabase
            .from('worlds')
            .select('id')
            .eq('campaign_id', campaignId)
            .maybeSingle()
          
          if (world) {
            const { error } = await supabase
              .from('lore_entries')
              .insert({
                world_id: world.id,
                category: args.category,
                key: args.key,
                details: args.details,
                is_discovered: true
              })
            if (error) console.warn('[FC] Lore insert error (may already exist):', error.message)
          }
          return { category: args.category, key: args.key }
        }

        default:
          console.warn(`[FC] Unknown function: ${name}`)
          return null
      }
    } catch (err) {
      console.error(`[FC] Error executing ${name}:`, err)
      return null
    }
  }
}
