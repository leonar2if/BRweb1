// Puerto directo de app/src/main/java/com/example/utils/ErrorTranslator.kt
//
// Capa centralizada de traducción de errores técnicos -> mensajes humanos.
// El usuario NUNCA debe ver stack traces, JSON crudo, códigos HTTP, mensajes
// de Supabase/PostgREST, UUIDs ni nombres de tablas.

const GENERIC_ERROR = 'Ocurrió un problema inesperado. Inténtalo nuevamente.';

export function toHumanMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
  if (!raw || raw.trim() === '') return GENERIC_ERROR;
  const msg = raw.toLowerCase();

  // Conexión / red
  if (
    msg.includes('unable to resolve host') ||
    msg.includes('failed to connect') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('no address associated') ||
    msg.includes('network is unreachable')
  ) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.';
  }

  // Credenciales / login
  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant') || msg.includes('401')) {
    return 'El número o la contraseña no son correctos.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Tu cuenta aún no está confirmada. Contacta con el administrador.';
  }

  // Sesión
  if (
    msg.includes('refresh_token') ||
    msg.includes('jwt expired') ||
    msg.includes('token is expired') ||
    (msg.includes('sesión') && msg.includes('expirad'))
  ) {
    return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
  }

  // Permisos
  if (msg.includes('403') || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'No tienes permiso para realizar esta acción.';
  }

  // Registro duplicado
  if (
    msg.includes('ya está registrado') ||
    msg.includes('duplicate key') ||
    msg.includes('already registered') ||
    msg.includes('user already registered')
  ) {
    return 'Ese número de teléfono ya está registrado.';
  }

  // No encontrado
  if (msg.includes('404')) return 'No se encontró la información solicitada.';

  // Servidor
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('internal server error')) {
    return 'Ocurrió un problema en el servidor. Inténtalo nuevamente en unos minutos.';
  }

  // Reglas de negocio de la app (ya vienen en español y son seguras de mostrar
  // tal cual: no contienen datos técnicos).
  if (
    msg.includes('ya tienes') ||
    (msg.includes('reserva') && (msg.includes('activa') || msg.includes('anexada'))) ||
    msg.includes('completa el nombre') ||
    msg.includes('datos de reserva incompletos') ||
    msg.includes('contraseñas no coinciden') ||
    msg.includes('número de teléfono') ||
    msg.includes('horario') ||
    msg.includes('turno') ||
    msg.includes('servicio') ||
    msg.includes('contraseña') ||
    msg.includes('no se pudo crear la cuenta') ||
    msg.includes('teléfono o contraseña')
  ) {
    return raw;
  }

  return GENERIC_ERROR;
}
