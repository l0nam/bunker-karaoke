import { createClient } from "@supabase/supabase-js";

// Клиент только для сервера (route handlers, server components).
// Service role обходит RLS, поэтому НИКОГДА не импортируй этот файл в клиентские компоненты.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
