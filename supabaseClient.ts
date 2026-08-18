// Puerto directo de app/src/main/java/com/example/service/SupabaseClient.kt
// Mismo backend real (GoTrue Auth + PostgREST + Storage) que usa la app
// Android — misma URL, misma anon key, mismas tablas ("services",
// "products", "appointments", "profiles", "settings", "blocked_slots") y
// mismo bucket de Storage ("Product_image").

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes('TU-PROYECTO') &&
  !SUPABASE_ANON_KEY.includes('TU_ANON_KEY');

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      // Persiste la sesión igual que PreferencesManager.kt (refresh token en
      // almacenamiento local del dispositivo) y la renueva automáticamente,
      // equivalente a AuthRepository.restoreSession() en Kotlin.
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'br-app-supabase-auth',
    },
  }
);

/** Dominio ficticio usado para mapear teléfono -> email de GoTrue (AuthService.kt). */
export const PHONE_AUTH_DOMAIN = '@barberia.cu';

export function phoneToAuthEmail(cleanPhone: string): string {
  return `${cleanPhone}${PHONE_AUTH_DOMAIN}`;
}

export function publicProductImageUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/Product_image/${filename}`;
}

export async function uploadProductImage(file: File): Promise<string> {
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await supabase.storage.from('Product_image').upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return publicProductImageUrl(filename);
}
