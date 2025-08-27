import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrices } from "@/hooks/usePrices";
import { User, Portfolio } from "@shared/schema";

// Simple components
const SimpleCard = ({ children, className }: any) => (
  <div className={className || "bg-gray-800 border border-gray-700 rounded-lg p-6"}>
    {children}
  </div>
);

const SimpleButton = ({ children, onClick, disabled, className, testId }: any) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className={className || "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"}
    data-testid={testId}
  >
    {children}
  </button>
);

export default function SimpleWallet() {
  const { user, isAuthenticated, isLoading } = useAuth() as { user: User | null, isAuthenticated: boolean, isLoading: boolean };
  const queryClient = useQueryClient();
  const { prices } = usePrices();

  // Simple toast function
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Create simple toast div
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      showToast("Redirigiendo al login...", 'error');
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
      return;
    }
  }, [isAuthenticated, isLoading]);

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolio"],
    retry: false,
  });

  // Initialize balance mutation
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/wallet/initialize", { 
        method: "POST",
        credentials: "include" 
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      showToast("¡$5,000 USD agregados a tu cuenta!", 'success');
    },
    onError: (error) => {
      if (error.message.includes('401')) {
        showToast("Sesión expirada, redirigiendo...", 'error');
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      showToast("Error al inicializar balance", 'error');
    },
  });

  if (isLoading || portfolioLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p>Cargando billetera...</p>
        </div>
      </div>
    );
  }

  const hasBalance = portfolio && portfolio.length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-400">Pablex - Billetera</h1>
          <div className="flex items-center space-x-4">
            <SimpleButton
              onClick={() => window.location.href = "/"}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              ← Volver
            </SimpleButton>
            <SimpleButton
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                } catch (error) {
                  console.error("Error en logout:", error);
                  window.location.href = "/";
                }
              }}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
            >
              Salir
            </SimpleButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">💰 Mi Billetera</h2>
          <p className="text-gray-300">Gestiona tus criptomonedas y balances</p>
        </div>

        {!hasBalance ? (
          <SimpleCard className="text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">¡Comienza a operar!</h3>
            <p className="text-gray-300 mb-6">
              Inicializa tu billetera con fondos de prueba para comenzar
            </p>
            <SimpleButton
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg"
              testId="button-initialize"
            >
              {initializeMutation.isPending ? "Inicializando..." : "Obtener $5,000 USD de prueba"}
            </SimpleButton>
          </SimpleCard>
        ) : (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.map((item) => {
                const balance = parseFloat(item.balance);
                const getCryptoIcon = (id: string) => {
                  switch (id) {
                    case 'bitcoin': return '₿';
                    case 'ethereum': return 'Ξ';
                    case 'litecoin': return 'Ł';
                    case 'binancecoin': return 'B';
                    case 'tether': return '₮';
                    case 'pablex': return '🪙';
                    case 'usd': return '$';
                    default: return '💰';
                  }
                };

                const getCryptoName = (id: string) => {
                  switch (id) {
                    case 'bitcoin': return 'Bitcoin';
                    case 'ethereum': return 'Ethereum';
                    case 'litecoin': return 'Litecoin';
                    case 'binancecoin': return 'BNB';
                    case 'tether': return 'Tether';
                    case 'pablex': return 'Pablex Token';
                    case 'usd': return 'Dólares USD';
                    default: return id.toUpperCase();
                  }
                };

                return (
                  <SimpleCard key={item.id} className="bg-gray-700" data-testid={`card-balance-${item.cryptoId}`}>
                    <div className="text-center">
                      <div className="text-4xl mb-3">{getCryptoIcon(item.cryptoId)}</div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {getCryptoName(item.cryptoId)}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">{item.cryptoId.toUpperCase()}</p>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <p className="text-gray-400 text-sm">Balance</p>
                        <p className="text-2xl font-bold text-green-400" data-testid={`text-balance-${item.cryptoId}`}>
                          {item.cryptoId === 'usd' 
                            ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : `${balance.toLocaleString('en-US', { minimumFractionDigits: 6 })}`
                          }
                        </p>
                      </div>
                    </div>
                  </SimpleCard>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="text-center space-y-4">
              <SimpleCard className="bg-gray-700">
                <h3 className="text-xl font-bold text-green-400 mb-4">🚀 ¿Qué quieres hacer?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SimpleButton
                    onClick={() => window.location.href = "/trading"}
                    className="bg-green-500 hover:bg-green-600 text-white py-4 px-6 text-lg rounded-lg w-full"
                    testId="button-go-trading"
                  >
                    🔄 Intercambiar Criptos
                  </SimpleButton>
                  <SimpleButton
                    onClick={() => window.location.href = "/withdraw"}
                    className="bg-red-500 hover:bg-red-600 text-white py-4 px-6 text-lg rounded-lg w-full"
                    testId="button-go-withdraw"
                  >
                    💸 Retirar Fondos
                  </SimpleButton>
                  <SimpleButton
                    onClick={() => window.location.href = "/history"}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 text-lg rounded-lg w-full"
                    testId="button-go-history"
                  >
                    📊 Ver Historial
                  </SimpleButton>
                </div>
              </SimpleCard>
            </div>

            {/* Precios en Tiempo Real */}
            <SimpleCard className="bg-gray-700">
              <h3 className="text-lg font-bold text-green-400 mb-3">💰 Precios Actuales <span style={{ fontSize: '12px', color: '#10b981' }}>●</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                      case 'bitcoin': return 'Bitcoin';
                      case 'ethereum': return 'Ethereum';
                      case 'litecoin': return 'Litecoin';
                      case 'binancecoin': return 'BNB';
                      case 'tether': return 'Tether';
                      case 'pablex': return 'PABLEX';
                      default: return id.toUpperCase();
                    }
                  };

                  return (
                    <div key={`${cryptoId}-${data.price}-${Date.now()}`} className="bg-gray-800 p-3 rounded-lg text-center">
                      <div className="text-2xl mb-1">{getCryptoIcon(cryptoId)}</div>
                      <div className="text-sm font-medium text-gray-300">{getCryptoName(cryptoId)}</div>
                      <div className="text-lg font-bold text-green-400">
                        ${data.price?.toLocaleString('en-US', { minimumFractionDigits: cryptoId === 'pablex' ? 3 : 2 }) || '0.00'}
                      </div>
                      <div className={`text-xs ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.change24h >= 0 ? '+' : ''}{data.change24h?.toFixed(2) || '0.00'}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </SimpleCard>

            {/* Quick Info */}
            <SimpleCard className="bg-gray-700">
              <h3 className="text-lg font-bold text-yellow-400 mb-3">ℹ️ Información</h3>
              <div className="text-gray-300 space-y-2">
                <p>• Tu balance inicial de $5,000 USD está listo para usar</p>
                <p>• Ve a "Intercambiar" para convertir entre criptomonedas</p>
                <p>• Todas las transacciones tienen una pequeña comisión</p>
                <p>• Tu historial se guarda automáticamente</p>
              </div>
            </SimpleCard>
          </>
        )}
      </main>
    </div>
  );
}