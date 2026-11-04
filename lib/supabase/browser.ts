import { createClient } from "@supabase/supabase-js";

// Клиент для браузера. Использует только публичный anon-ключ,
// поэтому годится только для чтения и realtime-подписки.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
