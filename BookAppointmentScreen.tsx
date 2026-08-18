import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Appointment, Service } from '../../types/models';
import Calendar from '../../components/Calendar';
import TimeSlotWidget from '../../components/TimeSlotWidget';
import ServiceCard from '../../components/ServiceCard';
import AppointmentCard from '../../components/AppointmentCard';
import { PhoneField } from '../../components/Fields';
import Icon from '../../components/Icon';
import { Button, IconButton } from '../../components/Button';
import { DEFAULT_SLOTS, DEFAULT_WORKING_DAYS, slotRangeFor } from '../../utils/slotSchedule';
import { formatDayName } from '../../utils/dateFormatter';
import { cleanPhoneNumber, isValidLocalPhone } from '../../utils/validators';
import { toHumanMessage } from '../../utils/errorTranslator';
import * as store from '../../data/store';

interface BookAppointmentScreenProps {
  services: Service[];
  clientAppointments: Appointment[];
  activeSlots?: string[];
  workingDays?: Set<number>;
  onDaySlotsRefreshed: () => void;
  onBookingComplete: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

export default function BookAppointmentScreen({
  services,
  clientAppointments,
  activeSlots = DEFAULT_SLOTS,
  workingDays = DEFAULT_WORKING_DAYS,
  onDaySlotsRefreshed,
  onBookingComplete,
}: BookAppointmentScreenProps) {
  const { userId, userPhone, userFullName } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [isDaySlotsLoading, setIsDaySlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastBooked, setLastBooked] = useState<Appointment | null>(null);

  const [isForOther, setIsForOther] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [otherLastName1, setOtherLastName1] = useState('');
  const [otherLastName2, setOtherLastName2] = useState('');
  const [otherPhone, setOtherPhone] = useState('');

  const slotsChunked = useMemo(() => {
    const chunks: string[][] = [];
    for (let i = 0; i < activeSlots.length; i += 2) chunks.push(activeSlots.slice(i, i + 2));
    return chunks;
  }, [activeSlots]);

  const activeAppts = useMemo(
    () => clientAppointments.filter((a) => a.status === 'confirmed' || a.status === 'in_progress'),
    [clientAppointments]
  );

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    setIsDaySlotsLoading(true);
    // Una sola pasada: turnos ocupados contando el rango completo de cada cita
    // (según la duración de su servicio) + turnos bloqueados por el admin.
    Promise.all([store.dayOccupiedTimes(selectedDate, activeSlots), store.blockedTimesForDate(selectedDate)]).then(
      ([occupied, blocked]) => {
        if (cancelled) return;
        setOccupiedSlots(occupied);
        setBlockedSlots(blocked);
        setIsDaySlotsLoading(false);
        onDaySlotsRefreshed();
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setError(null);
    setStep(1);
  };

  /**
   * Antes de avanzar a confirmar, comprobar que el rango completo de turnos
   * que ocupa este servicio (no solo el turno elegido) siga libre. Un
   * servicio de N turnos debe bloquear los N; esto evita confirmar una cita
   * que choca con otra reserva en el segundo/tercer turno.
   */
  const selectService = (service: Service) => {
    const range = slotRangeFor(selectedTime, service.durationSlots, activeSlots);
    if (!range) {
      setError('Este servicio no cabe en el horario restante del día. Elige otra hora.');
      setSelectedTime('');
      setStep(1);
      return;
    }
    if (range.some((t) => occupiedSlots.has(t) || blockedSlots.has(t))) {
      setError(`Este servicio necesita ${service.durationSlots} turnos consecutivos y alguno ya está ocupado. Elige otra hora.`);
      setSelectedTime('');
      setStep(1);
      return;
    }
    setError(null);
    setSelectedService(service);
    setStep(3);
  };

  const confirmBooking = async () => {
    if (!selectedService) return;

    if (isForOther && (otherName.trim() === '' || otherPhone.trim() === '')) {
      setError('Por favor, completa el nombre y teléfono de la otra persona.');
      return;
    }
    if (isForOther && !isValidLocalPhone(otherPhone)) {
      setError('El número de teléfono debe empezar por 5 y tener 8 dígitos.');
      return;
    }

    // El cliente solo puede tener 1 turno activo a su propio nombre a la vez:
    // si ya tiene uno pendiente (confirmed/in_progress) sin resolver, no puede
    // sacar otro hasta que ese se resuelva. No aplica a reservas anexadas.
    if (!isForOther) {
      const yaTieneActivo = clientAppointments.some(
        (a) => a.clientId === userId && (a.status === 'confirmed' || a.status === 'in_progress')
      );
      if (yaTieneActivo) {
        setError('Ya tienes un turno pendiente. No puedes reservar otro hasta que ese se resuelva.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const appt = await store.confirmBooking(
        {
          clientId: userId,
          serviceId: selectedService.id,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          fullName: isForOther ? otherName.trim() : userFullName || 'Cliente',
          lastName1: isForOther ? otherLastName1 : undefined,
          lastName2: isForOther ? otherLastName2 : undefined,
          phone: isForOther ? cleanPhoneNumber(otherPhone) : userPhone,
          isAnnexed: isForOther,
        },
        activeSlots
      );
      setLastBooked(appt);
      setStep(4);
    } catch (e) {
      setError(toHumanMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(0);
    setSelectedDate('');
    setSelectedTime('');
    setSelectedService(null);
    setIsForOther(false);
    setOtherName('');
    setOtherLastName1('');
    setOtherLastName2('');
    setOtherPhone('');
    setError(null);
    setLastBooked(null);
    onBookingComplete();
  };

  return (
    <div className="flex-col" style={{ height: '100%' }}>
      {step >= 2 && step <= 3 && (
        <div className="surface-variant" style={{ boxShadow: 'var(--elevation-2)' }}>
          <div className="flex items-center" style={{ padding: 8 }}>
            <IconButton icon="arrow_back" label="Anterior" onClick={() => setStep((s) => (s - 1) as Step)} />
            <span className="text-title-md fw-bold">
              {step === 2 ? 'Seleccionar Servicio' : 'Confirmar Reserva'}
            </span>
          </div>
        </div>
      )}

      <div className="device-scroll" style={{ overflowY: 'auto' }}>
        {(step === 0 || step === 1) && (
          <div className="two-col" style={{ padding: '0 16px 80px' }}>
            <div>
              <p className="text-title-md fw-bold mt-2" style={{ padding: '0 0 8px' }}>
                1. Elige un día en el calendario:
              </p>
              <Calendar selectedDate={selectedDate} onDateSelected={selectDate} workingDays={workingDays} activeSlots={activeSlots} />

              {(step === 1 || selectedDate) && (
                <>
                  {error && (
                    <div className="mt-3" style={{ background: 'var(--error-container)', borderRadius: 'var(--radius-sm)' }}>
                      <p className="text-body-md text-center" style={{ color: 'var(--on-error-container)', padding: 12, margin: 0 }}>
                        {error}
                      </p>
                    </div>
                  )}
                  <p className="text-title-md fw-bold mt-4 mb-2">
                    2. Horarios para {selectedDate ? formatDayName(selectedDate) : ''}:
                  </p>
                  {isDaySlotsLoading ? (
                    <div className="flex justify-center" style={{ padding: '24px 0' }}>
                      <span className="spinner" />
                    </div>
                  ) : (
                    slotsChunked.map((row, i) => (
                      <div key={i} className="flex" style={{ gap: 8 }}>
                        {row.map((slot) => (
                          <div key={slot} style={{ flex: 1 }}>
                            <TimeSlotWidget
                              time={slot}
                              isOccupied={occupiedSlots.has(slot)}
                              isBlocked={!occupiedSlots.has(slot) && blockedSlots.has(slot)}
                              isSelected={selectedTime === slot}
                              useAbbreviatedLabels
                              onClick={() => {
                                if (!blockedSlots.has(slot)) setSelectedTime(slot);
                              }}
                            />
                          </div>
                        ))}
                        {row.length === 1 && <div style={{ flex: 1 }} />}
                      </div>
                    ))
                  )}
                  {selectedTime && (
                    <div className="mt-4">
                      <Button full onClick={() => setStep(2)}>
                        Continuar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {activeAppts.length > 0 && (
              <div className="mt-4">
                <p className="text-title-md fw-bold text-primary">
                  Mis Reservas Activas ({activeAppts.length}/2)
                </p>
                <div className="card-grid" style={{ padding: 0, marginTop: 8 }}>
                  {activeAppts.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      serviceName={store.serviceNameFor(services, appt.serviceId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: '16px 0 80px' }}>
            <p className="text-title-md fw-bold" style={{ padding: '0 16px 8px' }}>
              Selecciona un servicio de la lista:
            </p>
            <div className="card-grid" style={{ padding: '0 12px' }}>
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedService?.id === service.id}
                  onSelect={() => selectService(service)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && selectedService && (
          <div style={{ padding: 16, paddingBottom: 80 }}>
            <div
              className="card"
              style={{ padding: 16, background: 'color-mix(in srgb, var(--primary-container) 50%, transparent)' }}
            >
              <h3 className="text-title-lg fw-bold text-primary" style={{ margin: 0 }}>
                Resumen de Cita
              </h3>
              <p className="text-body-lg mt-3" style={{ margin: '12px 0 0' }}>
                📅 Día: {formatDayName(selectedDate)}
              </p>
              <p className="text-body-lg" style={{ margin: '4px 0 0' }}>
                ⏰ Hora: {selectedTime}
              </p>
              <p className="text-body-lg" style={{ margin: '4px 0 0' }}>
                💈 Servicio: {selectedService.name}
              </p>
              <p className="text-body-lg fw-bold" style={{ margin: '4px 0 0' }}>
                💰 Precio: {selectedService.price} €
              </p>
            </div>

            <p className="text-title-md fw-bold mt-6">¿Para quién es la reserva?</p>
            <div className="flex mt-3" style={{ gap: 12 }}>
              <div
                className="flex justify-center items-center"
                onClick={() => setIsForOther(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  border: `${!isForOther ? 2 : 1}px solid ${!isForOther ? 'var(--primary)' : 'var(--outline)'}`,
                  background: !isForOther ? 'var(--primary-container)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="text-title-md fw-bold"
                  style={{ color: !isForOther ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
                >
                  Para mí
                </span>
              </div>
              <div
                className="flex justify-center items-center"
                onClick={() => setIsForOther(true)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  border: `${isForOther ? 2 : 1}px solid ${isForOther ? 'var(--primary)' : 'var(--outline)'}`,
                  background: isForOther ? 'var(--primary-container)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="text-title-md fw-bold"
                  style={{ color: isForOther ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
                >
                  Para otra persona
                </span>
              </div>
            </div>

            {isForOther && (
              <div className="mt-4">
                <p className="text-title-sm fw-bold" style={{ color: 'var(--secondary)' }}>
                  Datos de la otra persona:
                </p>
                <div className="mt-2">
                  <label className="field">
                    <span className="field-static-label">Nombre</span>
                    <span className="field-input-wrap">
                      <span className="field-icon">
                        <Icon name="person" size={20} />
                      </span>
                      <input className="field-input" value={otherName} onChange={(e) => setOtherName(e.target.value)} />
                    </span>
                  </label>
                </div>
                <div className="flex mt-2" style={{ gap: 8 }}>
                  <label className="field" style={{ flex: 1 }}>
                    <span className="field-static-label">Primer apellido</span>
                    <span className="field-input-wrap">
                      <input
                        className="field-input"
                        value={otherLastName1}
                        onChange={(e) => setOtherLastName1(e.target.value)}
                      />
                    </span>
                  </label>
                  <label className="field" style={{ flex: 1 }}>
                    <span className="field-static-label">Segundo apellido</span>
                    <span className="field-input-wrap">
                      <input
                        className="field-input"
                        value={otherLastName2}
                        onChange={(e) => setOtherLastName2(e.target.value)}
                      />
                    </span>
                  </label>
                </div>
                <div className="mt-2">
                  <PhoneField value={otherPhone} onChange={setOtherPhone} />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3" style={{ background: 'var(--error-container)', borderRadius: 'var(--radius-sm)' }}>
                <p className="text-body-md text-center" style={{ color: 'var(--on-error-container)', padding: 12, margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            <div className="mt-6">
              <Button full large loading={isLoading} disabled={isLoading} onClick={confirmBooking}>
                Confirmar Reserva
              </Button>
            </div>
          </div>
        )}

        {step === 4 && lastBooked && (
          <div className="flex-col items-center justify-center" style={{ padding: 24, minHeight: '100%' }}>
            <Icon name="check_circle" size={72} filled style={{ color: 'var(--slot-free)' }} />
            <h2 className="text-headline-sm fw-extrabold text-primary mt-4">¡Reserva Confirmada!</h2>

            <div
              className="card mt-6 w-full"
              style={{
                borderRadius: 'var(--radius-2xl)',
                boxShadow: 'var(--elevation-6)',
                background: 'var(--surface-variant)',
                padding: 24,
                maxWidth: 360,
              }}
            >
              <div className="flex-col items-center">
                <span
                  className="text-title-md fw-extrabold"
                  style={{ background: 'var(--slot-free)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '8px 16px' }}
                >
                  ✓ RESERVA CONFIRMADA
                </span>
                <p className="text-title-md mt-4" style={{ margin: '16px 0 0' }}>
                  📅 {formatDayName(lastBooked.appointmentDate)}
                </p>
                <p className="text-title-lg fw-bold mt-1" style={{ margin: '6px 0 0' }}>
                  ⏰ Hora: {lastBooked.appointmentTime.slice(0, 5)}
                </p>
                <p className="text-body-lg mt-1" style={{ margin: '6px 0 0' }}>
                  💈 Servicio: {selectedService?.name ?? 'Barbería'}
                </p>
                <p className="text-body-md mt-1" style={{ margin: '6px 0 0' }}>
                  👤 Para: {lastBooked.fullName}
                </p>
                <hr style={{ width: '100%', margin: '20px 0 16px', border: 'none', borderTop: '1px solid var(--outline-variant)' }} />
                <p className="text-body-md fw-bold text-center" style={{ color: 'var(--slot-occupied)', margin: 0 }}>
                  ⚠️ Debes estar 5 minutos antes de tu cita.
                </p>
              </div>
            </div>

            <div className="mt-8 w-full" style={{ maxWidth: 360 }}>
              <Button full large onClick={resetFlow}>
                Volver al inicio
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
