import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceRole) {
  console.warn('Supabase credentials missing in .env')
}

export const supabase = createClient(supabaseUrl, supabaseServiceRole)

// Fonctions utilitaires pour le jeu
export const db = {
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
    create: async (name, description, ownerId) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{ name, description, owner_id: ownerId }])
        .select()
        .single()
      if (error) throw error
      return data
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
  }
}
