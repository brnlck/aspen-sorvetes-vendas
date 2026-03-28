import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import Products from './pages/Products';
import ComandaList from './pages/ComandaList';
import ComandaForm from './pages/ComandaForm';
import Reports from './pages/Reports';
import MapaMovimentacao from './pages/MapaMovimentacao';
import Login from './pages/Login';
import { useState } from 'react';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ice_cream_auth') === 'true';
  });

  const login = () => {
    localStorage.setItem('ice_cream_auth', 'true');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('ice_cream_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <BrowserRouter>
      <Layout onLogout={logout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/products" element={<Products />} />
          <Route path="/comandas" element={<ComandaList />} />
          <Route path="/comandas/new" element={<ComandaForm />} />
          <Route path="/comandas/:id" element={<ComandaForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/mapa" element={<MapaMovimentacao />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
