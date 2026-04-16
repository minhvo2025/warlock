(function initOutraSupabaseClient(global) {
  const DEFAULT_SUPABASE_URL = 'https://wfujazyakiplsevvdxzn.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_9l483O2Ng-IALqgHUJZEzQ__efU53Sf';

  function trimString(value) {
    return String(value || '').trim();
  }

  function resolveSupabaseConfig() {
    const runtimeUrl = trimString(global.__OUTRA_SUPABASE_URL__);
    const runtimeAnonKey = trimString(global.__OUTRA_SUPABASE_ANON_KEY__);
    return {
      url: runtimeUrl || DEFAULT_SUPABASE_URL,
      anonKey: runtimeAnonKey || DEFAULT_SUPABASE_ANON_KEY,
    };
  }

  let cachedClient = null;
  function getClient() {
    if (cachedClient) return cachedClient;

    const factory = global.supabase && typeof global.supabase.createClient === 'function'
      ? global.supabase.createClient
      : null;
    if (!factory) {
      console.warn('[Supabase] supabase-js global is not available.');
      return null;
    }

    const cfg = resolveSupabaseConfig();
    if (!cfg.url || !cfg.anonKey) {
      console.warn('[Supabase] missing URL or anon key.');
      return null;
    }

    cachedClient = factory(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  }

  global.outraSupabase = {
    getClient,
    getConfig: resolveSupabaseConfig,
  };
})(window);
