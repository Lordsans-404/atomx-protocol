import { createClient } from '@supabase/supabase-js';

// Pastikan nilai-nilai ini diisi di .env.local kamu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Kita menggunakan Service Role Key agar punya akses admin (melewati RLS Supabase)
// Karena ini dijalankan murni di sisi Server (Next.js API Routes).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
