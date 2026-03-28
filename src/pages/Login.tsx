import { useState } from 'react';
import { IceCreamCone, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import './Login.css';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loginEmail = identifier.trim();
      
      // If it looks like a CPF (only digits, dots and dashes), convert to internal email format
      if (/^[\d.-]+$/.test(loginEmail)) {
        loginEmail = `${loginEmail.replace(/\D/g, '')}@aspensorvetes.com`;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (signInError) {
        throw signInError;
      }
      
      // The App.tsx router will automatically redirect based on AuthProvider state change
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error && err.message === 'Invalid login credentials'
          ? 'Credenciais inválidas. Verifique seu usuário e senha.'
          : err instanceof Error ? err.message : 'Erro ao conectar. Tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      {/* Animated blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-card animate-fade-in">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <IceCreamCone size={36} />
          </div>
          <h1 className="login-title">Aspen Sorvetes - Vendas Carrinhos</h1>
          <p className="login-subtitle">Vendas Carrinhos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail ou CPF</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Seu e-mail ou CPF"
                required
                className="input-with-icon"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-with-icon input-with-icon-right"
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn-primary login-btn ${loading ? 'login-btn--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
