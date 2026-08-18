// Capa de datos REAL sobre Supabase (GoTrue Auth + PostgREST + Storage),
// puerto directo de:
//   service/AuthService.kt, service/AppointmentService.kt,
//   service/ProductService.kt, service/BlockedSlotService.kt,
//   data/repository/AuthRepository.kt
//
// Usa el MISMO backend, las mismas tablas y las mismas columnas
// (snake_case) que la app Android: profiles, services, products,
// appointments, settings (key/value), blocked_slots.

import type {
  Appointment,
  AppointmentStatus,
  BlockedSlot,
  ClientNote,
  Product,
  Profile,
  Service,
  Settings,
} from '../types/models';
import { cleanPhoneNumber, isValidLocalPhone } from '../utils/validators';
import { getTodayDateString, getNowTimeString } from '../utils/dateFormatter';
import { DEFAULT_SLOTS, slotRangeFor, parseWorkingDaysCsv, workingDaysToCsv, parseSlotDefinitionsCsv, slotDefinitionsToCsv } from '../utils/slotSchedule';
import { phoneToAuthEmail, supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mapeo de filas snake_case (Postgres) <-> objetos camelCase (TS)
// ---------------------------------------------------------------------------

function rowToProfile(row: any): Profile {
  return {
    id: row.id,
    phone: row.phone,
    fullName: row.full_name,
    role: row.role,
    birthday: row.birthday ?? null,
    visitCount: row.visit_count ?? 0,
    noShowCount: row.no_show_count ?? 0,
    createdAt: row.created_at,
  };
}

function rowToService(row: any): Service {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    durationSlots: row.duration_slots,
    price: Number(row.price),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function serviceToRow(s: Partial<Service>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (s.name !== undefined) row.name = s.name;
  if (s.durationMinutes !== undefined) row.duration_minutes = s.durationMinutes;
  if (s.durationSlots !== undefined) row.duration_slots = s.durationSlots;
  if (s.price !== undefined) row.price = s.price;
  if (s.isActive !== undefined) row.is_active = s.isActive;
  return row;
}

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl1: row.image_url1,
    imageUrl2: row.image_url2,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function productToRow(p: Partial<Product>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.description !== undefined) row.description = p.description;
  if (p.price !== undefined) row.price = p.price;
  if (p.imageUrl1 !== undefined) row.image_url1 = p.imageUrl1;
  if (p.imageUrl2 !== undefined) row.image_url2 = p.imageUrl2;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  return row;
}

function rowToAppointment(row: any): Appointment {
  return {
    id: row.id,
    clientId: row.client_id,
    serviceId: row.service_id,
    ticketNumber: row.ticket_number,
    fullName: row.full_name,
    lastName1: row.last_name1,
    lastName2: row.last_name2,
    phone: row.phone,
    isAnnexed: row.is_annexed,
    mainClientId: row.main_client_id,
    appointmentDate: row.appointment_date,
    appointmentTime: (row.appointment_time as string)?.slice(0, 5),
    status: row.status,
    createdByAdmin: row.created_by_admin,
    notes: row.notes,
    isRescheduled: row.is_rescheduled,
    originalAppointmentId: row.original_appointment_id,
    canceledBy: row.canceled_by,
    canceledAt: row.canceled_at,
    cancelReason: row.cancel_reason ?? null,
    createdAt: row.created_at,
  };
}

function rowToBlockedSlot(row: any): BlockedSlot {
  return {
    id: row.id,
    blockDate: row.block_date,
    blockTime: (row.block_time as string)?.slice(0, 5),
    reason: row.reason,
    blockedBy: row.blocked_by,
    createdAt: row.created_at,
  };
}

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message ?? 'Error de Supabase.');
  return res.data;
}

// ---------------------------------------------------------------------------
// AUTH  (AuthService.kt / AuthRepository.kt)
// ---------------------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function login(localPhone: string, password: string): Promise<Profile> {
  const cleanPhone = cleanPhoneNumber(localPhone);
  const email = phoneToAuthEmail(cleanPhone);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message === 'Invalid login credentials'
      ? 'Teléfono o contraseña incorrectos.'
      : error?.message ?? 'Supabase no devolvió una sesión válida.');
  }

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (profileRow) return rowToProfile(profileRow);

  // Fallback: perfil ausente en la tabla pero sesión de Auth válida.
  const { data: byPhone } = await supabase.from('profiles').select('*').eq('phone', cleanPhone).maybeSingle();
  if (byPhone) return rowToProfile(byPhone);

  return { id: data.user.id, phone: cleanPhone, fullName: 'Cliente', role: 'client', visitCount: 0, noShowCount: 0 };
}

export async function register(
  localPhone: string,
  fullName: string,
  password: string,
  confirmPassword: string
): Promise<Profile> {
  if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

  const cleanPhone = cleanPhoneNumber(localPhone);

  const { data: existing } = await supabase.from('profiles').select('id').eq('phone', cleanPhone).maybeSingle();
  if (existing) throw new Error('Este número de teléfono ya está registrado.');

  const email = phoneToAuthEmail(cleanPhone);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { phone: cleanPhone, full_name: fullName, role: 'client' } },
  });

  if (signUpError) throw new Error(signUpError.message);

  let userId = signUpData.user?.id;

  // Si el proyecto de Supabase exige confirmación de email, signUp() no abre
  // sesión automáticamente: se intenta un login inmediato como hace el resto
  // del flujo (misma cuenta recién creada), igual que asume la app Android.
  if (!signUpData.session) {
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (signInData.user) userId = signInData.user.id;
  }

  if (!userId) throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.');

  const newProfileRow = { id: userId, phone: cleanPhone, full_name: fullName, role: 'client' };
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(newProfileRow)
    .select()
    .maybeSingle();

  if (insertError) throw new Error(`Error creando perfil: ${insertError.message}`);

  return created ? rowToProfile(created) : { id: userId, phone: cleanPhone, fullName, role: 'client', visitCount: 0, noShowCount: 0 };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data ? rowToProfile(data) : null;
}

export async function updatePhone(userId: string, newLocalPhone: string): Promise<void> {
  const newPhone = cleanPhoneNumber(newLocalPhone);
  check(await supabase.from('profiles').update({ phone: newPhone }).eq('id', userId));
}

export async function changePassword(_userId: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(`Error cambiando contraseña: ${error.message}`);
}

export async function updateBirthday(userId: string, birthday: string | null): Promise<void> {
  check(await supabase.from('profiles').update({ birthday }).eq('id', userId));
}

/** Directorio completo de clientes (Ajustes -> Clientes del admin). */
export async function getAllClients(): Promise<Profile[]> {
  const data = check(
    await supabase.from('profiles').select('*').eq('role', 'client').order('full_name', { ascending: true })
  );
  return (data ?? []).map(rowToProfile);
}

/** Perfil de un cliente por teléfono (contadores en la galería de Hoy). */
export async function getProfileByPhone(phone: string): Promise<Profile | null> {
  if (!phone) return null;
  const { data } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle();
  return data ? rowToProfile(data) : null;
}

async function incrementCounter(phone: string, column: 'visit_count' | 'no_show_count'): Promise<void> {
  if (!phone) return;
  const { data } = await supabase.from('profiles').select('id,visit_count,no_show_count').eq('phone', phone).maybeSingle();
  if (!data) return;
  await supabase
    .from('profiles')
    .update({ [column]: (data[column] ?? 0) + 1 })
    .eq('id', data.id);
}

export async function incrementVisitCount(phone: string): Promise<void> {
  return incrementCounter(phone, 'visit_count');
}

export async function incrementNoShowCount(phone: string): Promise<void> {
  return incrementCounter(phone, 'no_show_count');
}

// ---------------------------------------------------------------------------
// DARK MODE (preferencia local del dispositivo, no vive en Supabase)
// ---------------------------------------------------------------------------

const THEME_KEY = 'br_app_dark_mode_v1';

export function getStoredDarkMode(): boolean {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw !== null) return raw === 'true';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function setStoredDarkMode(value: boolean) {
  localStorage.setItem(THEME_KEY, String(value));
}

// ---------------------------------------------------------------------------
// SERVICES  (tabla "services")
// ---------------------------------------------------------------------------

export async function listActiveServices(): Promise<Service[]> {
  const data = check(
    await supabase.from('services').select('*').eq('is_active', true).order('id', { ascending: true })
  );
  return (data ?? []).map(rowToService);
}

export async function listAllServices(): Promise<Service[]> {
  const data = check(await supabase.from('services').select('*').order('id', { ascending: true }));
  return (data ?? []).map(rowToService);
}

export async function saveService(service: Service): Promise<Service> {
  if (service.id) {
    const data = check(
      await supabase.from('services').update(serviceToRow(service)).eq('id', service.id).select().maybeSingle()
    );
    return data ? rowToService(data) : service;
  }
  const data = check(await supabase.from('services').insert(serviceToRow(service)).select().maybeSingle());
  return data ? rowToService(data) : service;
}

export async function deleteService(id: number): Promise<void> {
  check(await supabase.from('services').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// PRODUCTS  (tabla "products", bucket de Storage "Product_image")
// ---------------------------------------------------------------------------

export async function listActiveProducts(): Promise<Product[]> {
  const data = check(
    await supabase.from('products').select('*').eq('is_active', true).order('id', { ascending: false })
  );
  return (data ?? []).map(rowToProduct);
}

export async function listAllProducts(): Promise<Product[]> {
  const data = check(await supabase.from('products').select('*').order('id', { ascending: false }));
  return (data ?? []).map(rowToProduct);
}

export async function saveProduct(product: Product): Promise<Product> {
  if (product.id) {
    const data = check(
      await supabase.from('products').update(productToRow(product)).eq('id', product.id).select().maybeSingle()
    );
    return data ? rowToProduct(data) : product;
  }
  const data = check(await supabase.from('products').insert(productToRow(product)).select().maybeSingle());
  return data ? rowToProduct(data) : product;
}

export async function deleteProduct(id: number): Promise<void> {
  check(await supabase.from('products').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// SETTINGS  (tabla "settings" key/value: manager_name, manager_phone,
// store_hours, working_days — igual que AdminViewModel.kt / SettingsRepository)
// ---------------------------------------------------------------------------

const SETTINGS_DEFAULTS: Record<string, string> = {
  manager_name: 'Gestor Rodríguez',
  manager_phone: '34600000000',
  store_hours: 'Lunes a Viernes 10:00 - 18:00',
  working_days: 'MON,TUE,WED,THU,FRI',
  slot_definitions: slotDefinitionsToCsv(DEFAULT_SLOTS),
};

/** Tolera tanto CSV ("MON,TUE") como el JSON sembrado por SQL (["MON","TUE"]). */
function normalizeWorkingDaysValue(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.startsWith('[')) {
    return cleaned
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/"/g, ''))
      .filter(Boolean)
      .join(',');
  }
  return cleaned;
}

export async function getSettings(): Promise<Settings> {
  const data = check(await supabase.from('settings').select('key,value'));
  const map: Record<string, string> = { ...SETTINGS_DEFAULTS };
  (data ?? []).forEach((row: any) => {
    if (row.key in SETTINGS_DEFAULTS) map[row.key] = row.value;
  });
  return {
    managerName: map.manager_name,
    managerPhone: map.manager_phone,
    storeHours: map.store_hours,
    workingDays: Array.from(parseWorkingDaysCsv(normalizeWorkingDaysValue(map.working_days))),
    activeSlots: parseSlotDefinitionsCsv(map.slot_definitions),
  };
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const rows: Array<{ key: string; value: string }> = [];
  if (settings.managerName !== undefined) rows.push({ key: 'manager_name', value: settings.managerName });
  if (settings.managerPhone !== undefined) rows.push({ key: 'manager_phone', value: settings.managerPhone });
  if (settings.storeHours !== undefined) rows.push({ key: 'store_hours', value: settings.storeHours });
  if (settings.workingDays !== undefined) {
    rows.push({ key: 'working_days', value: workingDaysToCsv(new Set(settings.workingDays)) });
  }
  if (settings.activeSlots !== undefined) {
    rows.push({ key: 'slot_definitions', value: slotDefinitionsToCsv(settings.activeSlots) });
  }

  // Requiere una restricción UNIQUE en settings.key para que el upsert
  // actualice en vez de duplicar filas (ver README, sección de esquema SQL).
  if (rows.length > 0) {
    check(await supabase.from('settings').upsert(rows, { onConflict: 'key' }));
  }

  return getSettings();
}

// ---------------------------------------------------------------------------
// BLOCKED SLOTS  (tabla "blocked_slots")
// ---------------------------------------------------------------------------

export async function listBlockedSlots(date: string): Promise<BlockedSlot[]> {
  const data = check(await supabase.from('blocked_slots').select('*').eq('block_date', date));
  return (data ?? []).map(rowToBlockedSlot);
}

export async function blockSlots(date: string, times: string[], reason?: string): Promise<void> {
  const rows = times.map((time) => ({
    block_date: date,
    block_time: time,
    reason: reason ?? null,
    blocked_by: 'admin',
  }));
  check(await supabase.from('blocked_slots').insert(rows));
}

export async function unblockAllForDate(date: string): Promise<void> {
  check(await supabase.from('blocked_slots').delete().eq('block_date', date));
}

/**
 * Botón ⊘ "Marcar como no disponible" (puerto de AdminViewModel.blockRestOfDay):
 * - wholeDay=true  -> bloquea TODOS los turnos del día.
 * - fromTime=null  -> bloquea todos los turnos restantes desde ahora.
 * - fromTime="HH:mm" -> bloquea ese turno y todos los siguientes.
 *
 * A diferencia de la versión anterior, ahora SÍ cancela las reservas que
 * caigan en el rango bloqueado: cada una queda con cancel_reason="admin_block"
 * para que el cliente reciba el aviso con disculpa la próxima vez que abra
 * la app. Devuelve la lista de citas afectadas (para el diálogo de "Clientes
 * afectados" con opción de llamarlos).
 */
export async function blockRestOfDay(
  date: string,
  fromTime: string | null,
  activeSlots: string[] = DEFAULT_SLOTS,
  wholeDay: boolean = false,
  adminId: string = 'admin'
): Promise<Appointment[]> {
  const nowTime = getNowTimeString();

  let slotsToBlock: string[];
  if (wholeDay) {
    slotsToBlock = [...activeSlots];
  } else {
    const startFrom = fromTime ?? activeSlots.find((s) => s > nowTime) ?? activeSlots[activeSlots.length - 1];
    const startIndex = Math.max(0, activeSlots.indexOf(startFrom));
    slotsToBlock = activeSlots.slice(startIndex);
  }

  const dayAppts = await listAppointmentsForDate(date);
  const affected = dayAppts.filter(
    (a) =>
      a.status !== 'canceled' &&
      a.status !== 'attended' &&
      a.status !== 'no_show' &&
      slotsToBlock.includes(a.appointmentTime.slice(0, 5))
  );

  await Promise.all(
    affected.map(async (appt) => {
      await updateAppointmentStatus(appt.id, 'canceled', adminId);
      check(await supabase.from('appointments').update({ cancel_reason: 'admin_block' }).eq('id', appt.id));
    })
  );

  if (slotsToBlock.length > 0) {
    await blockSlots(date, slotsToBlock, 'Resto del día libre');
  }
  return affected;
}

/**
 * "Día Libre" desde Agenda (puerto de AdminViewModel.markDayOff): reutiliza
 * blockRestOfDay en modo "día completo".
 */
export async function markDayOff(date: string, activeSlots: string[] = DEFAULT_SLOTS, adminId: string = 'admin'): Promise<Appointment[]> {
  return blockRestOfDay(date, null, activeSlots, true, adminId);
}

// ---------------------------------------------------------------------------
// APPOINTMENTS  (tabla "appointments")
// ---------------------------------------------------------------------------

export async function listClientAppointments(clientId: string): Promise<Appointment[]> {
  const [mainRes, annexedRes] = await Promise.all([
    supabase.from('appointments').select('*').eq('client_id', clientId),
    supabase.from('appointments').select('*').eq('main_client_id', clientId),
  ]);
  const main = check(mainRes) ?? [];
  const annexed = check(annexedRes) ?? [];
  const byId = new Map<number, any>();
  [...main, ...annexed].forEach((row) => byId.set(row.id, row));
  return Array.from(byId.values())
    .map(rowToAppointment)
    .sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime));
}

export async function listAppointmentsForDate(date: string): Promise<Appointment[]> {
  const data = check(
    await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', date)
      .order('appointment_time', { ascending: true })
  );
  return (data ?? []).map(rowToAppointment);
}

export async function listAllAppointments(): Promise<Appointment[]> {
  const data = check(
    await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: true })
  );
  return (data ?? []).map(rowToAppointment);
}

/**
 * Turnos ocupados de un día, contando TODOS los turnos que ocupa cada cita
 * según la duración de su servicio (no solo el turno de inicio), más los
 * turnos bloqueados por el admin. Puerto del cálculo combinado de
 * ClientViewModel.isSlotOccupied + isSlotBlocked.
 */
async function occupiedTimesForDate(date: string, activeSlots: string[] = DEFAULT_SLOTS): Promise<Set<string>> {
  const [apptsRes, servicesRes, blockedRes] = await Promise.all([
    supabase.from('appointments').select('appointment_time, service_id, status').eq('appointment_date', date),
    supabase.from('services').select('id, duration_slots'),
    supabase.from('blocked_slots').select('block_time').eq('block_date', date),
  ]);
  const appts = check(apptsRes) ?? [];
  const serviceRows = check(servicesRes) ?? [];
  const durationByService = new Map<number, number>(serviceRows.map((s: any) => [s.id, s.duration_slots ?? 1]));

  const occupied = new Set<string>();
  (appts as any[]).forEach((row) => {
    if (row.status === 'canceled') return;
    const start = (row.appointment_time as string).slice(0, 5);
    const durationSlots = durationByService.get(row.service_id) ?? 1;
    const range = slotRangeFor(start, durationSlots, activeSlots) ?? [start];
    range.forEach((t) => occupied.add(t));
  });
  ((check(blockedRes) ?? []) as any[]).forEach((row) => occupied.add((row.block_time as string).slice(0, 5)));
  return occupied;
}

/** Turnos bloqueados por el admin (⊘) para un día, como set de "HH:mm". */
export async function blockedTimesForDate(date: string): Promise<Set<string>> {
  const data = check(await supabase.from('blocked_slots').select('block_time').eq('block_date', date));
  return new Set(((data ?? []) as any[]).map((row) => (row.block_time as string).slice(0, 5)));
}

/**
 * Citas del día + turnos ocupados por rangos (sin contar bloqueos del admin),
 * para pintar la parrilla de horarios del cliente de una sola vez.
 */
export async function dayOccupiedTimes(date: string, activeSlots: string[] = DEFAULT_SLOTS): Promise<Set<string>> {
  const [apptsRes, servicesRes] = await Promise.all([
    supabase.from('appointments').select('appointment_time, service_id, status').eq('appointment_date', date),
    supabase.from('services').select('id, duration_slots'),
  ]);
  const appts = check(apptsRes) ?? [];
  const serviceRows = check(servicesRes) ?? [];
  const durationByService = new Map<number, number>(serviceRows.map((s: any) => [s.id, s.duration_slots ?? 1]));

  const occupied = new Set<string>();
  (appts as any[]).forEach((row) => {
    if (row.status === 'canceled') return;
    const start = (row.appointment_time as string).slice(0, 5);
    const durationSlots = durationByService.get(row.service_id) ?? 1;
    const range = slotRangeFor(start, durationSlots, activeSlots) ?? [start];
    range.forEach((t) => occupied.add(t));
  });
  return occupied;
}

/** Estado agregado de un día para el calendario: 'green' | 'red' | 'gray'. */
export async function getDayStatus(dateStr: string, activeSlots: string[] = DEFAULT_SLOTS): Promise<'green' | 'red' | 'gray'> {
  // Si TODOS los turnos del día están bloqueados por el admin, se ve igual
  // que un día no laborable (ClientViewModel.getDayStatus).
  const blocked = await blockedTimesForDate(dateStr);
  if (activeSlots.length > 0 && activeSlots.every((s) => blocked.has(s))) return 'gray';
  const occupied = await occupiedTimesForDate(dateStr, activeSlots);
  return occupied.size >= activeSlots.length ? 'red' : 'green';
}

export async function isSlotOccupied(date: string, time: string): Promise<boolean> {
  const occupied = await occupiedTimesForDate(date);
  return occupied.has(time);
}

export interface BookingInput {
  clientId: string;
  serviceId: number;
  appointmentDate: string;
  appointmentTime: string;
  fullName: string;
  lastName1?: string;
  lastName2?: string;
  phone: string;
  isAnnexed: boolean;
  createdByAdmin?: boolean;
}

async function getNextTicketNumber(date: string): Promise<number> {
  // La app Android intenta primero la RPC opcional get_next_ticket(p_date) y
  // cae a este mismo cálculo si no existe. Aquí vamos directo al fallback:
  // es igual de correcto y no exige tener la función RPC desplegada.
  const data = check(
    await supabase.from('appointments').select('ticket_number').eq('appointment_date', date)
  );
  const maxTicket = (data ?? []).reduce((max: number, row: any) => Math.max(max, row.ticket_number ?? 0), 0);
  return maxTicket + 1;
}

/**
 * Puerto de AppointmentService.createAppointment(): valida disponibilidad
 * del rango completo de turnos, aplica el límite "1 titular + 1 anexada"
 * (máx. 2 reservas activas) salvo que la cree un admin, asigna número de
 * ticket y crea la fila. A diferencia del Kotlin original (que en el peor
 * caso silencia errores de inserción), aquí SÍ se propaga cualquier error
 * real de Supabase/RLS para que la persona vea qué falló.
 */
export async function confirmBooking(input: BookingInput, activeSlots: string[] = DEFAULT_SLOTS): Promise<Appointment> {
  const { data: serviceRow } = check(
    await supabase.from('services').select('*').eq('id', input.serviceId).maybeSingle()
  );
  if (!serviceRow) throw new Error('Selecciona un servicio válido.');
  const service = rowToService(serviceRow);

  const range = slotRangeFor(input.appointmentTime, service.durationSlots, activeSlots);
  if (!range) throw new Error('El horario seleccionado no está disponible para este servicio.');

  const occupied = await occupiedTimesForDate(input.appointmentDate, activeSlots);
  if (range.some((t) => occupied.has(t))) {
    throw new Error('Ese horario ya no está disponible. Elige otro turno.');
  }

  if (!input.createdByAdmin) {
    const clientAppts = (await listClientAppointments(input.clientId)).filter(
      (a) => a.status === 'confirmed' || a.status === 'in_progress'
    );
    const titularCount = clientAppts.filter((a) => !a.isAnnexed && a.clientId === input.clientId).length;
    const annexedCount = clientAppts.filter(
      (a) => a.isAnnexed && (a.mainClientId === input.clientId || a.clientId === input.clientId)
    ).length;

    if (!input.isAnnexed && titularCount >= 1) {
      throw new Error('Ya tienes 1 reserva activa para ti. Regla: 1 titular + 1 anexada.');
    }
    if (input.isAnnexed && annexedCount >= 1) {
      throw new Error('Ya tienes 1 reserva anexada para otra persona.');
    }
    if (titularCount + annexedCount >= 2) {
      throw new Error('Ya tienes 2 reservas activas (máximo permitido).');
    }
  }

  const ticketNumber = await getNextTicketNumber(input.appointmentDate);

  // Igual que ClientViewModel.confirmBooking: las reservas anexadas se guardan
  // con client_id "annexed_<userId>" y main_client_id apuntando al titular.
  const row = {
    client_id: input.isAnnexed ? `annexed_${input.clientId}` : input.clientId,
    service_id: input.serviceId,
    ticket_number: ticketNumber,
    full_name: input.fullName,
    last_name1: input.lastName1 ?? null,
    last_name2: input.lastName2 ?? null,
    phone: input.phone,
    is_annexed: input.isAnnexed,
    main_client_id: input.isAnnexed ? input.clientId : null,
    appointment_date: input.appointmentDate,
    appointment_time: input.appointmentTime,
    status: 'confirmed',
    created_by_admin: input.createdByAdmin ?? false,
  };

  const { data: created } = check(await supabase.from('appointments').insert(row).select().maybeSingle());
  if (!created) throw new Error('No se pudo crear la reserva.');
  return rowToAppointment(created);
}

/**
 * Reserva rápida del administrador desde la Agenda (puerto de
 * AdminViewModel.createQuickAdminAppointment): a diferencia del flujo del
 * cliente, el admin NO está obligado a introducir datos personales.
 * Nombre/teléfono son opcionales.
 */
export async function createQuickAdminAppointment(
  date: string,
  time: string,
  service: Service,
  name: string,
  phone: string,
  adminId: string,
  activeSlots: string[] = DEFAULT_SLOTS
): Promise<Appointment> {
  const cleanPhone = phone.trim() !== '' && isValidLocalPhone(phone) ? cleanPhoneNumber(phone) : '';
  return confirmBooking(
    {
      clientId: `admin_walkin_${adminId}`,
      serviceId: service.id,
      appointmentDate: date,
      appointmentTime: time,
      fullName: name.trim() !== '' ? name.trim() : 'Cliente sin registrar',
      phone: cleanPhone,
      isAnnexed: false,
      createdByAdmin: true,
    },
    activeSlots
  );
}

export async function updateAppointmentStatus(
  id: number,
  status: AppointmentStatus,
  canceledBy?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'canceled') {
    updates.canceled_by = canceledBy ?? 'client';
    updates.canceled_at = new Date().toISOString();
  }
  check(await supabase.from('appointments').update(updates).eq('id', id));
}

/** Botón FINALIZADO: marca atendido y suma 1 a las visitas del cliente. */
export async function finalizeAppointment(id: number, clientPhone?: string): Promise<void> {
  await updateAppointmentStatus(id, 'attended');
  if (clientPhone) await incrementVisitCount(clientPhone);
}

/** Botón "no vino": marca no_show y suma 1 a las faltas del cliente. */
export async function markAsNoShow(id: number, clientPhone?: string): Promise<void> {
  await updateAppointmentStatus(id, 'no_show');
  if (clientPhone) await incrementNoShowCount(clientPhone);
}

export async function updateAppointmentNotes(id: number, notes: string): Promise<void> {
  check(await supabase.from('appointments').update({ notes }).eq('id', id));
}

export async function closeDayAttendingRemaining(date: string): Promise<void> {
  check(
    await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('appointment_date', date)
      .eq('status', 'in_progress')
  );
}

export function serviceNameFor(services: Service[], serviceId: number): string {
  return services.find((s) => s.id === serviceId)?.name ?? 'Servicio de Barbería';
}

export function todayStr(): string {
  return getTodayDateString();
}

// ---------------------------------------------------------------------------
// NOTAS DE CLIENTE  (tabla "client_notes" — CRM simple del admin, sección 4/5/6)
// A diferencia de la app Android (que las guarda offline en Room y las sube
// recién al cerrar sesión), aquí se insertan directo contra Supabase: la web
// no tiene el mismo escenario de conectividad intermitente que un móvil.
// ---------------------------------------------------------------------------

function rowToClientNote(row: any): ClientNote {
  return {
    id: row.id,
    clientPhone: row.client_phone,
    clientName: row.client_name,
    note: row.note,
    adminId: row.admin_id,
    createdAt: row.created_at,
  };
}

export async function listClientNotes(phone: string): Promise<ClientNote[]> {
  if (!phone) return [];
  const data = check(
    await supabase
      .from('client_notes')
      .select('*')
      .eq('client_phone', phone)
      .order('created_at', { ascending: false })
  );
  return (data ?? []).map(rowToClientNote);
}

export async function addClientNote(
  clientPhone: string,
  clientName: string,
  note: string,
  adminId?: string
): Promise<ClientNote> {
  const row = { client_phone: clientPhone, client_name: clientName, note: note.trim(), admin_id: adminId ?? null };
  const data = check(await supabase.from('client_notes').insert(row).select().maybeSingle());
  return data
    ? rowToClientNote(data)
    : { id: 0, clientPhone, clientName, note: note.trim(), adminId, createdAt: new Date().toISOString() };
}
