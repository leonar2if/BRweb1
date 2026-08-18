import { useCallback, useRef, useState } from 'react';
import { isOnline } from '../utils/deviceDetect';

/**
 * Puerto de RefreshFeedback.kt (versión actualizada): toast 2s + punto de
 * frescura de duración configurable (3s por defecto en cliente, 60s en
 * admin), más un estado de error (toast rojo) cuando el refresco falla o no
 * hay conexión — antes solo existía el caso de éxito.
 */
export function useRefreshFeedback() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isFresh, setIsFresh] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const freshTimer = useRef<number | null>(null);

  const notifyRefreshed = useCallback((message = 'Datos actualizados', freshDurationMs = 3000) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (freshTimer.current) window.clearTimeout(freshTimer.current);

    setToastMessage(message);
    setIsError(false);
    setIsFresh(true);

    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2000);
    freshTimer.current = window.setTimeout(() => setIsFresh(false), freshDurationMs);
  }, []);

  const notifyRefreshFailed = useCallback((message = 'No se pudo actualizar') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (freshTimer.current) window.clearTimeout(freshTimer.current);

    setToastMessage(message);
    setIsError(true);
    setIsFresh(false);

    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2500);
  }, []);

  /** Envuelve un refresco: si no hay conexión, avisa sin intentar la llamada. */
  const guardedRefresh = useCallback(
    async (fn: () => Promise<void>, successMessage = 'Datos actualizados', freshDurationMs = 3000) => {
      if (!isOnline()) {
        notifyRefreshFailed('Sin conexión — no se pudo actualizar');
        return;
      }
      try {
        await fn();
        notifyRefreshed(successMessage, freshDurationMs);
      } catch {
        notifyRefreshFailed();
      }
    },
    [notifyRefreshed, notifyRefreshFailed]
  );

  return { toastMessage, isError, isFresh, notifyRefreshed, notifyRefreshFailed, guardedRefresh };
}
