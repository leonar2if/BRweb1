// Puerto directo de app/src/main/java/com/example/utils/Validators.kt

export const COUNTRY_CODE = '+53';

/** Número LOCAL: 8 dígitos, debe empezar por 5 (operadores móviles cubanos). */
export function isValidLocalPhone(localPhone: string): boolean {
  const digitsOnly = localPhone.trim().replace(/\D/g, '');
  return digitsOnly.length === 8 && digitsOnly.startsWith('5');
}

export function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.trim().replace(/\D/g, '');
  const local =
    digitsOnly.startsWith('53') && digitsOnly.length === 10
      ? digitsOnly.slice(2)
      : digitsOnly;
  return isValidLocalPhone(local);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/**
 * Normaliza un número a formato LOCAL (8 dígitos, sin +53/53 delante) para
 * guardarlo en Supabase y para construir el email de auth. Antes se guardaba
 * con "53" antepuesto ("53XXXXXXXX"); ya no: el prefijo del país es solo un
 * dato de UI, nunca debe persistirse.
 */
export function cleanPhoneNumber(phone: string): string {
  const digitsOnly = phone.trim().replace(/\D/g, '');
  if (digitsOnly.startsWith('53') && digitsOnly.length === 10) return digitsOnly.slice(2);
  return digitsOnly;
}

/** Extrae la parte local (8 dígitos) de un teléfono normalizado o crudo. */
export function toLocalDisplay(phone: string): string {
  const digitsOnly = phone.trim().replace(/\D/g, '');
  if (digitsOnly.startsWith('53') && digitsOnly.length === 10) return digitsOnly.slice(2);
  return digitsOnly;
}
