import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ClipboardList,
  FileBarChart2, LogOut, Menu, X, TableProperties, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, user, signOut } = useAuth();

  const isAdmin = profile?.role === 'ADMIN';

  const navItems = [
    ...(isAdmin ? [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ to: '/vendors', label: 'Vendedores', icon: Users }] : []),
    ...(isAdmin ? [{ to: '/products', label: 'Produtos', icon: Package }] : []),
    ...(profile?.role === 'VENDEDOR' ? [{ to: '/desempenho', label: 'Meu Desempenho', icon: FileBarChart2 }] : []),
    { to: '/comandas', label: 'Vendas', icon: ClipboardList }, // Everyone has Vendas
    ...(isAdmin ? [{ to: '/reports', label: 'Relatórios', icon: FileBarChart2 }] : []),
    ...(isAdmin ? [{ to: '/mapa', label: 'Mapa Diário', icon: TableProperties }] : []),
    ...(isAdmin ? [{ to: '/users', label: 'Usuários', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo-aspen.png" alt="Logo" className="sidebar-logo" />
            <div>
              <div className="sidebar-logo-title">Aspen Sorvetes</div>
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
          <button className="btn-logout" onClick={signOut}>
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
              <div className="topbar-user-avatar">
                {(profile?.name || user?.email || '?')[0].toUpperCase()}
              </div>
              <span className="topbar-user-name">
                {profile?.name || user?.email || 'Usuário'}
              </span>
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
