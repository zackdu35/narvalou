export const CONFIG = {
  SITE_PASSWORD: import.meta.env.VITE_SITE_PASSWORD,
  SUPABASE: {
    URL: import.meta.env.VITE_SUPABASE_URL,
    SERVICE_ROLE: import.meta.env.VITE_SUPABASE_SERVICE_ROLE,
  },
  GEMINI: {
    API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  },
  IS_DEV: import.meta.env.DEV === 'true',
};
