import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrices } from '@/hooks/usePrices';
// @ts-ignore - importing from simple setup
const apiRequest = async (url: string, options?: any) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }
  
  return response.json();
};

// Simple toast function
const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
      variant === 'destructive' ? 'bg-red-600' : 'bg-green-600'
    }`;
    toast.innerHTML = `<strong>${title}</strong><br>${description}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 4000);
  }
});

interface WithdrawFormData {
  cryptoId: string;
  amount: string;
  toAddress: string;
}

export default function WithdrawPage() {
  const [formData, setFormData] = useState<WithdrawFormData>({
    cryptoId: 'pablex',
    amount: '',
    toAddress: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { prices } = usePrices();

  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawFormData) => {
      const response = await apiRequest('/api/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          cryptoId: data.cryptoId,
          amount: parseFloat(data.amount),
          toAddress: data.toAddress
        })
      });
      return response;
    },
    onSuccess: (result: any) => {
      toast({
        title: "¡Retiro exitoso!",
        description: `Hash: ${result.txHash || 'Procesando...'}`,
        variant: "default",
      });
      
      // Limpiar formulario
      setFormData({
        cryptoId: 'pablex',
        amount: '',
        toAddress: ''
      });
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en retiro",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Ingresa una cantidad válida",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.toAddress || !/^0x[a-fA-F0-9]{40}$/.test(formData.toAddress)) {
      toast({
        title: "Error",
        description: "Dirección BSC inválida",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate(formData);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0e27',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#1a1f3a',
        borderRadius: '12px',
        padding: '30px'
      }}>
        <h1 style={{
          color: '#f7d046',
          fontSize: '32px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          💸 Retirar Criptomonedas
        </h1>

        {/* Precios en Tiempo Real */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px',
          border: '1px solid #334155'
        }}>
          <h3 style={{
            color: '#10b981',
            fontSize: '18px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            💰 Precios Actuales <span style={{ fontSize: '12px', color: '#10b981' }}>●</span>
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '12px'
          }}>
            {Object.entries(prices).map(([cryptoId, data]) => {
              const getCryptoIcon = (id: string) => {
                switch (id) {
                  case 'bitcoin': return '₿';
                  case 'ethereum': return 'Ξ';
                  case 'litecoin': return 'Ł';
                  case 'binancecoin': return 'B';
                  case 'tether': return '₮';
                  case 'pablex': return '🪙';
                  default: return '💰';
                }
              };

              const getCryptoName = (id: string) => {
                switch (id) {
                  case 'bitcoin': return 'BTC';
                  case 'ethereum': return 'ETH';
                  case 'litecoin': return 'LTC';
                  case 'binancecoin': return 'BNB';
                  case 'tether': return 'USDT';
                  case 'pablex': return 'PABLEX';
                  default: return id.toUpperCase();
                }
              };

              return (
                <div key={`${cryptoId}-${data.price}-${Date.now()}`} style={{
                  backgroundColor: '#1e293b',
                  padding: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #475569'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{getCryptoIcon(cryptoId)}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{getCryptoName(cryptoId)}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                    ${data.price?.toLocaleString('en-US', { minimumFractionDigits: cryptoId === 'pablex' ? 3 : 2 }) || '0.00'}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: data.change24h >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {data.change24h >= 0 ? '+' : ''}{data.change24h?.toFixed(2) || '0.00'}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Selector de Moneda */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#9ca3af',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Moneda:
            </label>
            <select
              value={formData.cryptoId}
              onChange={(e) => setFormData({ ...formData, cryptoId: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2d3748',
                border: '1px solid #4a5568',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
            >
              <option value="pablex">PABLEX</option>
              <option value="usdt">USDT</option>
              <option value="bnb">BNB</option>
            </select>
          </div>

          {/* Cantidad */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#9ca3af',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Cantidad:
            </label>
            <input
              type="number"
              step="0.000001"
              placeholder="0.0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2d3748',
                border: '1px solid #4a5568',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Dirección destino */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#9ca3af',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Dirección BSC de destino:
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={formData.toAddress}
              onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2d3748',
                border: '1px solid #4a5568',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Información de comisión */}
          <div style={{
            backgroundColor: '#2d3748',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #4a5568'
          }}>
            <h3 style={{ color: '#f7d046', fontSize: '16px', marginBottom: '10px' }}>
              📊 Información del retiro:
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '5px 0' }}>
              • Comisión: 0.5% (mínimo $2.00 USD)
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '5px 0' }}>
              • Tiempo estimado: 1-2 minutos
            </p>
            {formData.amount && (
              (() => {
                const amount = parseFloat(formData.amount);
                const percentageCommission = amount * 0.005; // 0.5%
                const minimumCommissionUSD = 2.0; // $2 USD mínimo
                const commission = Math.max(percentageCommission, minimumCommissionUSD);
                const netAmount = amount - commission;
                return (
                  <div>
                    <p style={{ color: '#f59e0b', fontSize: '14px', margin: '10px 0 5px 0' }}>
                      Comisión: ${commission.toFixed(2)} USD
                    </p>
                    <p style={{ color: '#10b981', fontSize: '14px', margin: '5px 0 0 0' }}>
                      Recibirás: {netAmount.toFixed(6)} {formData.cryptoId.toUpperCase()}
                    </p>
                  </div>
                );
              })()
            )}
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={withdrawMutation.isPending}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: withdrawMutation.isPending ? '#4a5568' : '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: withdrawMutation.isPending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {withdrawMutation.isPending ? '🔄 Procesando...' : '💸 Retirar'}
          </button>
        </form>

        {/* Navegación */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <button
            onClick={() => window.location.href = '/wallet'}
            style={{
              backgroundColor: '#4a5568',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ← Volver a Wallet
          </button>
          
          <button
            onClick={() => window.location.href = '/history'}
            style={{
              backgroundColor: '#4a5568',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            📋 Historial
          </button>
        </div>
      </div>
    </div>
  );
}