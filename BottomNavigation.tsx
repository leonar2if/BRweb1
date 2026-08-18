import React from 'react';
import Icon from './Icon';

export interface NavItem {
  key: string;
  icon: string;
  label: string;
}

export default function BottomNavigation({
  items,
  active,
  onChange,
}: {
  items: NavItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span className="nav-icon-pill">
              <Icon name={item.icon} size={22} filled={isActive} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
