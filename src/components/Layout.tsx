import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ClipboardList,
  FileBarChart2, LogOut, IceCreamCone, Menu, X, TableProperties
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendors', label: 'Vendedores', icon: Users },
  { to: '/products', label: 'Produtos', icon: Package },
  { to: '/comandas', label: 'Vendas', icon: ClipboardList },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart2 },
  { to: '/mapa', label: 'Mapa Diário', icon: TableProperties },
];

export default function Layout({ children, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <IceCreamCone size={22} />
            </div>
            <div>
              <div className="sidebar-logo-title">Aspen Sorvetes - Vendas Carrinhos</div>
              <div className="sidebar-logo-sub">Vendas Carrinhos</div>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="topbar-right">
            <div className="topbar-user">
              <div className="topbar-user-avatar">A</div>
              <span className="topbar-user-name">Administrador</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
