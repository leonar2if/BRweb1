import React from 'react';
import Icon from './Icon';
import type { NavItem } from './BottomNavigation';

interface SidebarProps {
  items: NavItem[];
  active: string;
  onChange: (key: string) => void;
  brandTitle: string;
  brandSubtitle: string;
  footer?: React.ReactNode;
}

/** Navegación lateral fija para escritorio — sustituye a la bottom-nav móvil. */
export default function Sidebar({ items, active, onChange, brandTitle, brandSubtitle, footer }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Icon name="content_cut" size={22} />
        </div>
        <div className="sidebar-brand-text">
          <div className="title">{brandTitle}</div>
          <div className="subtitle">{brandSubtitle}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${item.key === active ? 'active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <Icon name={item.icon} size={20} filled={item.key === active} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {footer && <div className="sidebar-footer">{footer}</div>}
    </aside>
  );
}
