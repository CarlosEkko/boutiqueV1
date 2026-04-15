import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const O365Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [status, setStatus] = useState('A conectar conta Office 365...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus(`Erro: ${searchParams.get('error_description') || error}`);
      setTimeout(() => navigate('/dashboard/team-hub'), 3000);
      return;
    }

    if (code && state && token) {
      exchangeToken(code, state);
    } else if (!token) {
      setStatus('Sessão expirada. A redirecionar...');
      setTimeout(() => navigate('/auth'), 2000);
    }
  }, [searchParams, token]);

  const exchangeToken = async (code, state) => {
    try {
      const res = await axios.post(`${API_URL}/api/o365/auth/callback`, { code, state }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setStatus(`Conta conectada: ${res.data.account_email}`);
        setTimeout(() => navigate('/dashboard/team-hub'), 1500);
      }
    } catch (err) {
      setStatus(`Erro: ${err.response?.data?.detail || 'Falha na autenticação'}`);
      setTimeout(() => navigate('/dashboard/team-hub'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-white text-lg font-medium mb-2">Microsoft 365</p>
        <p className="text-gray-400 text-sm" data-testid="o365-callback-status">{status}</p>
      </div>
    </div>
  );
};

export default O365Callback;
