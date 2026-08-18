// Espejo 1:1 de app/src/main/java/com/example/data/models/*.kt

export type AppointmentStatus = 'confirmed' | 'attended' | 'canceled' | 'in_progress' | 'no_show';
export type UserRole = 'client' | 'admin';

export interface Profile {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  birthday?: string | null; // "yyyy-MM-dd"
  visitCount: number;
  noShowCount: number;
  createdAt?: string;
}

export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  durationSlots: number; // 1 = 30min, 2 = 60min
  price: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl1?: string | null;
  imageUrl2?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Appointment {
  id: number;
  clientId: string;
  serviceId: number;
  ticketNumber: number;
  fullName: string;
  lastName1?: string | null;
  lastName2?: string | null;
  phone: string;
  isAnnexed: boolean;
  mainClientId?: string | null;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  status: AppointmentStatus;
  createdByAdmin: boolean;
  notes?: string | null;
  isRescheduled: boolean;
  originalAppointmentId?: number | null;
  canceledBy?: string | null;
  canceledAt?: string | null;
  /** "admin_block" = cancelado por el admin al dejar un turno/día no disponible. */
  cancelReason?: string | null;
  createdAt?: string;
}

export interface BlockedSlot {
  id: number;
  blockDate: string;
  blockTime: string;
  reason?: string | null;
  blockedBy?: string | null;
  createdAt?: string;
}

export interface Settings {
  managerName: string;
  managerPhone: string; // sin +53, formato "53XXXXXXXX" o local
  storeHours: string;
  workingDays: number[]; // 0=domingo .. 6=sabado (JS Date.getDay())
  activeSlots: string[]; // turnos configurables "HH:mm" (settings.slot_definitions)
}

export interface ClientNote {
  id: number;
  clientPhone: string;
  clientName: string;
  note: string;
  adminId?: string;
  createdAt: string;
}
