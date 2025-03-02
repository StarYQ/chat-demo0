// file: src/lib/supabaseService.js

import { createClient } from '@supabase/supabase-js';

/**
 * IMPORTANT:
 * 1. Do NOT prefix your service role key with `NEXT_PUBLIC_`.
 *    That would expose it to the client bundle, which is insecure.
 * 2. Instead, store your service role key in an environment variable
 *    like SUPABASE_SERVICE_ROLE_KEY, ensuring it's only available on the server.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Not exposed to the client

// This Supabase client uses the service key, which bypasses RLS for `auth.users`
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

export default supabaseService;
