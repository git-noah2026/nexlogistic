/*
 * NEXLOGISTIC – Verbindung zu Supabase (dasselbe Projekt wie NEXCOUNT)
 * Werte aus: Supabase-Dashboard → Project Settings → API (bzw. „Connect“).
 * Der Publishable Key ist öffentlich gedacht; der Zugriff wird über
 * Row Level Security in der Datenbank geschützt (supabase/migrations/).
 * NIEMALS den secret/service_role Key hier eintragen!
 */
window.NEXLOGISTIC_CONFIG = {
  supabaseUrl: 'https://xrzovtfaqthaxucaoale.supabase.co',
  supabaseKey: 'sb_publishable_BGnPI68bnGu_UoBjtj2bFQ_7pD2CuNz',
};
