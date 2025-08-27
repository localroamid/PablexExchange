import { useQuery } from "@tanstack/react-query";
import { usePrices } from "@/hooks/usePrices";

// Simple components
const SimpleCard = ({ children, className }: any) => (
  <div className={className || "bg-gray-800 border border-gray-700 rounded-lg p-6"}>
    {children}
  </div>
);

const SimpleButton = ({ children, onClick, className }: any) => (
  <button 
    onClick={onClick} 
    className={className || "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"}
  >
    {children}
  </button>
);

export default function SimpleHistory() {
  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/3b4469f0-d0d2-4939-bc04-b0fc35858bd9/transactions"],
    retry: false,
  });
  const { prices } = usePrices();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '⬇️';
      case 'withdrawal': return '⬆️';
      case 'trade': return '🔄';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-400';
      case 'withdrawal': return 'text-red-400';
      case 'trade': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-400">Pablex - Historial</h1>
          <div className="flex items-center space-x-4">
            <SimpleButton
              onClick={() => window.location.href = "/"}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              ← Volver
            </SimpleButton>
            <SimpleButton
              onClick={() => window.location.href = "/api/logout"}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
            >
              Salir
            </SimpleButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-purple-400 mb-2">📊 Historial de Transacciones</h2>
          <p className="text-gray-300">Todas tus transacciones y movimientos</p>
        </div>

        {/* Precios en Tiempo Real */}
        <SimpleCard className="bg-gray-700">
          <h3 className="text-lg font-bold text-green-400 mb-3">💰 Precios Actuales <span style={{ fontSize: '12px', color: '#10b981' }}>●</span></h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

        {!transactions || transactions.length === 0 ? (
          <SimpleCard className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">Sin transacciones</h3>
            <p className="text-gray-500 mb-6">
              Aún no has realizado ninguna transacción
            </p>
            <SimpleButton
              onClick={() => window.location.href = "/simple-wallet"}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg"
            >
              Ir a Billetera
            </SimpleButton>
          </SimpleCard>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction: any, index: number) => (
              <SimpleCard key={transaction.id || index} className="bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <h3 className={`font-bold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'deposit' && 'Depósito'}
                        {transaction.type === 'withdrawal' && 'Retiro'}
                        {transaction.type === 'trade' && 'Intercambio'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {transaction.type === 'trade' ? (
                      <div>
                        <p className="text-red-400">
                          -{parseFloat(transaction.fromAmount).toLocaleString()} {transaction.fromCryptoId.toUpperCase()}
                        </p>
                        <p className="text-green-400">
                          +{parseFloat(transaction.toAmount).toLocaleString()} {transaction.toCryptoId.toUpperCase()}
                        </p>
                        <p className="text-gray-400 text-xs">
                          Comisión: ${parseFloat(transaction.commission).toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className={transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                          {transaction.type === 'deposit' ? '+' : '-'}
                          {parseFloat(transaction.fromAmount).toLocaleString()} {transaction.fromCryptoId.toUpperCase()}
                        </p>
                        {parseFloat(transaction.commission) > 0 && (
                          <p className="text-gray-400 text-xs">
                            Comisión: ${parseFloat(transaction.commission).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </SimpleCard>
            ))}
          </div>
        )}

        {/* Summary */}
        {transactions && transactions.length > 0 && (
          <SimpleCard className="bg-gray-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-3">📈 Resumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-gray-400">Total Transacciones</p>
                <p className="text-2xl font-bold text-white">{transactions.length}</p>
              </div>
              <div>
                <p className="text-gray-400">Depósitos</p>
                <p className="text-2xl font-bold text-green-400">
                  {transactions.filter((t: any) => t.type === 'deposit').length}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Intercambios</p>
                <p className="text-2xl font-bold text-blue-400">
                  {transactions.filter((t: any) => t.type === 'trade').length}
                </p>
              </div>
            </div>
          </SimpleCard>
        )}
      </main>
    </div>
  );
}