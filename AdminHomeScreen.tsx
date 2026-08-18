import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdminData } from '../../data/useAdminData';
import TopAppBar from '../../components/TopAppBar';
import BottomNavigation, { NavItem } from '../../components/BottomNavigation';
import Sidebar from '../../components/Sidebar';
import { IconButton } from '../../components/Button';
import { LoadingIndicator, RefreshToast } from '../../components/Misc';
import { useRefreshFeedback } from '../../components/useRefreshFeedback';
import { useIsDesktop } from '../../utils/useIsDesktop';
import AdminTodayScreen from './AdminTodayScreen';
import AdminTodayGallery from './AdminTodayGallery';
import AdminAgendaScreen from './AdminAgendaScreen';
import AdminServicesScreen from './AdminServicesScreen';
import AdminCatalogScreen from './AdminCatalogScreen';
import AdminSettingsScreen from './AdminSettingsScreen';

const NAV_ITEMS: NavItem[] = [
  { key: 'today', icon: 'today', label: 'Hoy' },
  { key: 'services', icon: 'content_cut', label: 'Servicios' },
  { key: 'catalog', icon: 'shopping_bag', label: 'Catálogo' },
  { key: 'agenda', icon: 'calendar_month', label: 'Agenda' },
  { key: 'settings', icon: 'settings', label: 'Ajustes' },
];

const TITLES: Record<string, string> = {
  today: 'Hoy',
  services: 'Servicios',
  catalog: 'Catálogo',
  agenda: 'Agenda',
  settings: 'Ajustes',
};

export default function AdminHomeScreen() {
  const { isDarkMode, setDarkMode, logout } = useAuth();
  const {
    allServices,
    allProducts,
    allAppointments,
    settings,
    isLoading,
    todayAppointments,
    refreshToday,
    selectedDate,
    setSelectedDate,
    dayAppointments,
    dayBlockedSlots,
    refreshAll,
    refreshCore,
    refreshDay,
  } = useAdminData();
  const isDesktop = useIsDesktop();
  const { toastMessage, isError, isFresh, guardedRefresh } = useRefreshFeedback();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [tab, setTab] = useState('today');
  const [isDayStarted, setIsDayStarted] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await guardedRefresh(refreshAll, 'Actualizado', 60000);
    setIsRefreshing(false);
  };

  if (isLoading || !settings) {
    return (
      <div className="device-scroll">
        <LoadingIndicator message="Cargando panel de administración..." />
      </div>
    );
  }

  // "Iniciar Día" abre la galería a pantalla completa, sin nav ni barra
  // superior estándar (igual que la app: reemplaza toda la pantalla).
  if (tab === 'today' && isDayStarted) {
    return (
      <AdminTodayGallery
        todayAppointments={todayAppointments}
        services={allServices}
        activeSlots={settings.activeSlots}
        onClose={() => {
          setIsDayStarted(false);
          refreshToday();
        }}
        onRefresh={refreshToday}
      />
    );
  }

  const content = (
    <>
      {tab === 'today' && (
        <AdminTodayScreen
          todayAppointments={todayAppointments}
          isLoading={false}
          onStartDayClick={() => setIsDayStarted(true)}
        />
      )}

      {tab === 'services' && <AdminServicesScreen services={allServices} onRefresh={refreshCore} />}

      {tab === 'catalog' && <AdminCatalogScreen products={allProducts} onRefresh={refreshCore} />}

      {tab === 'agenda' && (
        <AdminAgendaScreen
          services={allServices}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          dayAppointments={dayAppointments}
          dayBlockedSlots={dayBlockedSlots}
          activeSlots={settings.activeSlots}
          workingDays={new Set(settings.workingDays)}
          onRefresh={() => refreshDay(selectedDate)}
        />
      )}

      {tab === 'settings' && (
        <AdminSettingsScreen
          settings={settings}
          services={allServices}
          allAppointments={allAppointments}
          onRefresh={refreshAll}
        />
      )}
    </>
  );

  if (isDesktop) {
    return (
      <div className="app-shell-desktop">
        <Sidebar
          items={NAV_ITEMS}
          active={tab}
          onChange={setTab}
          brandTitle="Rodríguez"
          brandSubtitle="PANEL ADMIN"
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
            title={TITLES[tab]}
            isDataFresh={isFresh}
            onRefreshClick={handleManualRefresh}
            isRefreshing={isRefreshing}
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
        title={TITLES[tab]}
        onThemeToggle={() => setDarkMode(!isDarkMode)}
        isDarkMode={isDarkMode}
        onLogoutClick={tab === 'settings' ? undefined : logout}
        isDataFresh={isFresh}
        onRefreshClick={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="device-scroll" style={{ position: 'relative' }}>
        {content}
        <RefreshToast message={toastMessage} isError={isError} />
      </div>

      <BottomNavigation items={NAV_ITEMS} active={tab} onChange={setTab} />
    </>
  );
}
