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
import UserManagement from './pages/UserManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, profile } = useAuth();
  
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // If not allowed, redirect to a safe page based on role
    if (profile.role === 'OPERADOR') return <Navigate to="/comandas" replace />;
    if (profile.role === 'VENDEDOR') return <Navigate to="/comandas" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* Admin only routes */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/vendors" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Vendors />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/mapa" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <MapaMovimentacao />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserManagement />
          </ProtectedRoute>
        } />

        {/* Routes for Admin, Operador and Vendedor (Comandas list and details) */}
        <Route path="/comandas" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR', 'VENDEDOR']}>
            <ComandaList />
          </ProtectedRoute>
        } />
        
        {/* Only Admin and Operador can create/edit comandas */}
        <Route path="/comandas/new" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR']}>
            <ComandaForm />
          </ProtectedRoute>
        } />
        <Route path="/comandas/:id" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'OPERADOR', 'VENDEDOR']}>
            <ComandaForm />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to={profile.role === 'ADMIN' ? '/' : '/comandas'} replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
