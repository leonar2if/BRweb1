import { useCallback, useEffect, useRef, useState } from 'react';
import type { Appointment, BlockedSlot, Product, Service, Settings } from '../types/models';
import * as store from '../data/store';
import { getTodayDateString } from '../utils/dateFormatter';

export function useAdminData() {
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // "Hoy" (tab HOY): siempre la fecha real de hoy, independiente de lo que
  // el admin esté mirando en la pestaña Agenda.
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [todayBlockedSlots, setTodayBlockedSlots] = useState<BlockedSlot[]>([]);

  // Fecha elegida en el calendario de la pestaña Agenda (puede ser hoy,
  // pasada o futura).
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [dayBlockedSlots, setDayBlockedSlots] = useState<BlockedSlot[]>([]);

  const refreshCore = useCallback(async () => {
    const [services, products, appts, s] = await Promise.all([
      store.listAllServices(),
      store.listAllProducts(),
      store.listAllAppointments(),
      store.getSettings(),
    ]);
    setAllServices(services);
    setAllProducts(products);
    setAllAppointments(appts);
    setSettings(s);
  }, []);

  const refreshToday = useCallback(async () => {
    const today = getTodayDateString();
    const [appts, blocked] = await Promise.all([
      store.listAppointmentsForDate(today),
      store.listBlockedSlots(today),
    ]);
    setTodayAppointments(appts);
    setTodayBlockedSlots(blocked);
  }, []);

  const refreshDay = useCallback(async (date: string) => {
    const [appts, blocked] = await Promise.all([
      store.listAppointmentsForDate(date),
      store.listBlockedSlots(date),
    ]);
    setDayAppointments(appts);
    setDayBlockedSlots(blocked);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([refreshCore(), refreshToday()]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshDay(selectedDate);
  }, [selectedDate, refreshDay]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCore(), refreshToday(), refreshDay(selectedDate)]);
  }, [refreshCore, refreshToday, refreshDay, selectedDate]);

  // Puerto de startAutoExpireLoop() (AdminViewModel.kt): cada minuto revisa si
  // cambió el día (medianoche). El admin tiene TODO el día para confirmar (✓) o
  // marcar no-show (✗) cada turno a mano — durante el día no se toca nada
  // automáticamente. Solo si llega la medianoche y el admin se olvidó de cerrar
  // algo, esos turnos que quedaron "confirmed"/"in_progress" se marcan como
  // atendidos de una vez y el día queda cerrado.
  const lastKnownToday = useRef(getTodayDateString());
  useEffect(() => {
    const interval = window.setInterval(async () => {
      const nowDate = getTodayDateString();

      if (nowDate !== lastKnownToday.current) {
        const stale = todayAppointments.filter(
          (a) =>
            a.appointmentDate === lastKnownToday.current &&
            (a.status === 'confirmed' || a.status === 'in_progress')
        );
        if (stale.length > 0) {
          await Promise.all(stale.map((a) => store.finalizeAppointment(a.id, a.phone)));
        }
        lastKnownToday.current = nowDate;
        await refreshAll();
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [todayAppointments, refreshAll]);

  return {
    allServices,
    allProducts,
    allAppointments,
    settings,
    isLoading,
    todayAppointments,
    todayBlockedSlots,
    refreshToday,
    selectedDate,
    setSelectedDate,
    dayAppointments,
    dayBlockedSlots,
    refreshAll,
    refreshCore,
    refreshDay,
  };
}
