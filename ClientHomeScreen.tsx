import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClientData } from '../../data/useClientData';
import TopAppBar from '../../components/TopAppBar';
import BottomNavigation, { NavItem } from '../../components/BottomNavigation';
import Sidebar from '../../components/Sidebar';
import { IconButton } from '../../components/Button';
import { LoadingIndicator, RefreshToast } from '../../components/Misc';
import { useRefreshFeedback } from '../../components/useRefreshFeedback';
import { useIsDesktop } from '../../utils/useIsDesktop';
import BookAppointmentScreen from './BookAppointmentScreen';
import CatalogScreen from './CatalogScreen';
import ProductDetailScreen from './ProductDetailScreen';
import SettingsScreen from './SettingsScreen';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { formatDateForDisplay, formatTimeForDisplay } from '../../utils/dateFormatter';
import type { Product } from '../../types/models';

const NAV_ITEMS: NavItem[] = [
  { key: 'book', icon: 'calendar_month', label: 'Reservar' },
  { key: 'catalog', icon: 'shopping_bag', label: 'Catálogo' },
  { key: 'settings', icon: 'settings', label: 'Ajustes' },
];

const TITLES: Record<string, string> = {
  book: 'Rodríguez Barbería',
  catalog: 'Catálogo',
  settings: 'Ajustes',
};

export default function ClientHomeScreen() {
  const { userId, isDarkMode, setDarkMode, logout } = useAuth();
  const {
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
  } = useClientData(userId);
  const { toastMessage, isError, isFresh, notifyRefreshed } = useRefreshFeedback();
  const isDesktop = useIsDesktop();

  const [tab, setTab] = useState('book');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleTabChange = (key: string) => {
    setTab(key);
    setSelectedProduct(null);
  };

  if (isLoading) {
    return (
      <div className="device-scroll">
        <LoadingIndicator message="Cargando información de la barbería..." />
      </div>
    );
  }

  // Aviso con disculpa cuando el admin canceló un turno del cliente al dejar
  // un turno/día no disponible (cancel_reason = "admin_block"). Se muestra una
  // sola vez por cita cancelada.
  const cancellationDialog = cancellationNotice && (
    <Dialog
      title="Tu turno fue cancelado"
      onDismiss={dismissCancellationNotice}
      actions={
        <Button variant="filled" onClick={dismissCancellationNotice}>
          Entendido
        </Button>
      }
    >
      <p style={{ margin: 0 }}>
        Lamentamos las molestias: tu turno del {formatDateForDisplay(cancellationNotice.appointmentDate)} a las{' '}
        {formatTimeForDisplay(cancellationNotice.appointmentTime)} fue cancelado por la barbería. Podés reservar otro
        horario cuando quieras.
      </p>
    </Dialog>
  );

  const content = (
    <>
      {cancellationDialog}
      {tab === 'book' && (
        <BookAppointmentScreen
          services={activeServices}
          clientAppointments={clientAppointments}
          activeSlots={activeSlots}
          workingDays={workingDays}
          onDaySlotsRefreshed={() => notifyRefreshed()}
          onBookingComplete={() => refreshData()}
        />
      )}

      {tab === 'catalog' &&
        (selectedProduct ? (
          <ProductDetailScreen product={selectedProduct} managerPhone={managerPhone} onBack={() => setSelectedProduct(null)} />
        ) : (
          <CatalogScreen products={activeProducts} onProductClick={setSelectedProduct} />
        ))}

      {tab === 'settings' && <SettingsScreen managerPhone={managerPhone} />}
    </>
  );

  if (isDesktop) {
    return (
      <div className="app-shell-desktop">
        <Sidebar
          items={NAV_ITEMS}
          active={tab}
          onChange={handleTabChange}
          brandTitle="Rodríguez"
          brandSubtitle="BARBERÍA"
          footer={
            <div className="flex items-center justify-between" style={{ padding: '4px 6px' }}>
              <IconButton
                icon={isDarkMode ? 'brightness_7' : 'brightness_4'}
                label="Cambiar tema"
                onClick={() => setDarkMode(!isDarkMode)}
              />
              <IconButton icon="exit_to_app" label="Cerrar sesión" color="var(--error)" onClick={logout} />
            </div>
          }
        />
        <div className="desktop-main">
          <TopAppBar
            title={selectedProduct ? selectedProduct.name : TITLES[tab]}
            isDataFresh={tab === 'book' ? isFresh : null}
          />
          <div className="desktop-content" style={{ position: 'relative' }}>
            <div className="desktop-content-inner">{content}</div>
            <RefreshToast message={toastMessage} isError={isError} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopAppBar
        title={selectedProduct ? selectedProduct.name : TITLES[tab]}
        onThemeToggle={() => setDarkMode(!isDarkMode)}
        isDarkMode={isDarkMode}
        onLogoutClick={tab === 'settings' ? undefined : logout}
        isDataFresh={tab === 'book' ? isFresh : null}
      />

      <div className="device-scroll" style={{ position: 'relative' }}>
        {content}
        <RefreshToast message={toastMessage} isError={isError} />
      </div>

      <BottomNavigation items={NAV_ITEMS} active={tab} onChange={handleTabChange} />
    </>
  );
}
