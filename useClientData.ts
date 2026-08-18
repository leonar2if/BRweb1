import { useCallback, useEffect, useRef, useState } from 'react';
import type { Appointment, Product, Service } from '../types/models';
import * as store from '../data/store';
import { DEFAULT_SLOTS, DEFAULT_WORKING_DAYS } from '../utils/slotSchedule';

export function useClientData(userId: string) {
  const [activeServices, setActiveServices] = useState<Service[]>([]);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [managerPhone, setManagerPhone] = useState('');
  const [activeSlots, setActiveSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [workingDays, setWorkingDays] = useState<Set<number>>(DEFAULT_WORKING_DAYS);
  const [isLoading, setIsLoading] = useState(true);

  // Turno cancelado por el admin al bloquear un turno/día: se avisa con
  // disculpa la primera vez que se detecta, sin repetir (puerto de
  // ClientViewModel.cancellationNotice).
  const [cancellationNotice, setCancellationNotice] = useState<Appointment | null>(null);
  const shownCancellationIds = useRef<Set<number>>(new Set());

  const dismissCancellationNotice = useCallback(() => {
    setCancellationNotice((prev) => {
      if (prev) shownCancellationIds.current.add(prev.id);
      return null;
    });
  }, []);

  const refreshData = useCallback(async () => {
    if (!userId) return;
    const [services, products, appts, settings] = await Promise.all([
      store.listActiveServices(),
      store.listActiveProducts(),
      store.listClientAppointments(userId),
      store.getSettings(),
    ]);
    setActiveServices(services);
    setActiveProducts(products);
    setClientAppointments(appts);
    setManagerPhone(settings.managerPhone);
    setActiveSlots(settings.activeSlots);
    setWorkingDays(new Set(settings.workingDays));

    const pending = appts.find(
      (a) => a.status === 'canceled' && a.cancelReason === 'admin_block' && !shownCancellationIds.current.has(a.id)
    );
    if (pending) {
      setCancellationNotice((prev) => prev ?? pending);
    }
  }, [userId]);

  const refreshDataAwait = useCallback(async () => {
    setIsLoading(true);
    await refreshData();
    setIsLoading(false);
  }, [refreshData]);

  useEffect(() => {
    refreshDataAwait();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    activeServices,
    activeProducts,
    clientAppointments,
    managerPhone,
    activeSlots,
    workingDays,
    isLoading,
    cancellationNotice,
    dismissCancellationNotice,
    refreshData,
    refreshDataAwait,
  };
}
