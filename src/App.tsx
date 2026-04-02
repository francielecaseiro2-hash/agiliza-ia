import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, RefreshCw, LogOut, Bot } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const companyId = 'default_company';

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/whatsapp/status/${companyId}`);
      const data = await res.json();
      setStatus(data.status);
      setQrCode(data.qrCode);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      await fetch(`/api/whatsapp/start/${companyId}`, { method: 'POST' });
    } catch (error) {
      console.error('Error starting client:', error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`/api/whatsapp/logout/${companyId}`, { method: 'POST' });
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 p-6 text-white text-center">
          <Bot className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Assistente IA</h1>
          <p className="text-emerald-100 mt-1">Conecte seu WhatsApp para iniciar</p>
        </div>

        <div className="p-8 flex flex-col items-center">
          {status === 'CONNECTED' ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Conectado com Sucesso!</h2>
              <p className="text-gray-600 mb-8">Sua assistente já está pronta para responder os clientes.</p>
              
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center justify-center w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Desconectar WhatsApp
              </button>
            </div>
          ) : status === 'QR_READY' && qrCode ? (
            <div className="text-center w-full">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Escaneie o QR Code</h2>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 inline-block mb-6">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
              <ol className="text-left text-sm text-gray-600 space-y-2 mb-6 bg-gray-50 p-4 rounded-lg">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em Mais opções (⋮) ou Configurações</li>
                <li>3. Toque em Aparelhos conectados</li>
                <li>4. Aponte a câmera para esta tela</li>
              </ol>
            </div>
          ) : (
            <div className="text-center w-full">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">WhatsApp Desconectado</h2>
              <p className="text-gray-600 mb-8">
                {status === 'INITIALIZING' 
                  ? 'Gerando QR Code, aguarde um momento...' 
                  : 'Clique abaixo para gerar o QR Code de conexão.'}
              </p>
              
              <button
                onClick={handleStart}
                disabled={loading || status === 'INITIALIZING'}
                className="flex items-center justify-center w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${status === 'INITIALIZING' ? 'animate-spin' : ''}`} />
                {status === 'INITIALIZING' ? 'Iniciando...' : 'Gerar QR Code'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
