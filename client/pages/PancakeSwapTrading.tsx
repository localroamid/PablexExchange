import { useState, useEffect } from 'react';

interface TradeQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  commission: string;
  route: string[];
  minimumReceived: string;
}

interface VolumeStats {
  todayVolumeUSD: string;
  totalCommissionsUSD: string;
  pablexVolume24h: string;
  totalTrades: number;
}

// Simple fetch helper
const apiRequest = async (method: string, url: string, body?: any) => {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
};

export default function PancakeSwapTrading() {
  const [fromToken, setFromToken] = useState('pablex');
  const [toToken, setToToken] = useState('usdt');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [volumeStats, setVolumeStats] = useState<VolumeStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [message, setMessage] = useState('');

  const tokens = [
    { value: 'pablex', label: 'PABLEX' },
    { value: 'usdt', label: 'USDT' },
    { value: 'bnb', label: 'BNB' },
    { value: 'busd', label: 'BUSD' }
  ];

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage("Error: Ingresa una cantidad válida");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/trading/pancakeswap/quote', {
        userId: '3b4469f0-d0d2-4939-bc04-b0fc35858bd9',
        fromToken,
        toToken,
        amount
      });

      const data = await response.json();
      
      if (data.success) {
        setQuote(data.quote);
        setMessage(`Cotización obtenida: ${amount} ${fromToken.toUpperCase()} = ${parseFloat(data.quote.outputAmount).toFixed(6)} ${toToken.toUpperCase()}`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("Error conectando con PancakeSwap");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!quote) {
      setMessage("Error: Obtén una cotización primero");
      return;
    }

    setIsExecuting(true);
    try {
      const response = await apiRequest('POST', '/api/trading/pancakeswap/execute', {
        userId: '3b4469f0-d0d2-4939-bc04-b0fc35858bd9',
        fromToken,
        toToken,
        amount
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`Trade ejecutado! TX: ${data.trade.txHash.substring(0, 10)}...`);
        setQuote(null);
        setAmount('');
        loadVolumeStats();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("Error ejecutando trade");
    } finally {
      setIsExecuting(false);
    }
  };

  const loadVolumeStats = async () => {
    try {
      const response = await apiRequest('GET', '/api/trading/volume-stats?userId=3b4469f0-d0d2-4939-bc04-b0fc35858bd9');
      const data = await response.json();
      
      if (data.success) {
        setVolumeStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuote(null);
  };

  useEffect(() => {
    loadVolumeStats();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
            🥞 Trading Real PancakeSwap
          </h1>
          <p className="text-gray-400">
            Genera volumen real en BSC que aparece en CoinMarketCap
          </p>
        </div>

        {/* Estadísticas de Volumen */}
        {volumeStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">📊</span>
                <div>
                  <p className="text-sm text-gray-400">Volumen Hoy</p>
                  <p className="text-lg font-bold">${volumeStats.todayVolumeUSD}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">💰</span>
                <div>
                  <p className="text-sm text-gray-400">Comisiones</p>
                  <p className="text-lg font-bold">${volumeStats.totalCommissionsUSD}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-purple-500">📈</span>
                <div>
                  <p className="text-sm text-gray-400">PABLEX 24h</p>
                  <p className="text-lg font-bold">{volumeStats.pablexVolume24h}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-orange-500">🔄</span>
                <div>
                  <p className="text-sm text-gray-400">Trades</p>
                  <p className="text-lg font-bold">{volumeStats.totalTrades}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trading Interface */}
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Swap PancakeSwap</h2>
          <p className="text-gray-400 text-sm mb-6">
            Trading real que genera volumen verificable en BSCScan
          </p>

          <div className="space-y-4">
            {/* From Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Desde</label>
              <div className="flex space-x-2">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-24"
                  data-testid="select-from-token"
                >
                  {tokens.map(token => (
                    <option key={token.value} value={token.value}>
                      {token.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                  data-testid="input-amount"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={swapTokens}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 border border-gray-600"
                data-testid="button-swap-tokens"
              >
                🔄 Intercambiar
              </button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Para</label>
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                data-testid="select-to-token"
              >
                {tokens.map(token => (
                  <option key={token.value} value={token.value}>
                    {token.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="bg-gray-700 p-4 rounded border border-gray-600">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Recibirás:</span>
                    <span className="font-bold">{parseFloat(quote.outputAmount).toFixed(6)} {toToken.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impacto en precio:</span>
                    <span>{quote.priceImpact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisión:</span>
                    <span>{parseFloat(quote.commission).toFixed(6)} {toToken.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ruta:</span>
                    <span className="text-xs">{quote.route.join(' → ')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleGetQuote}
                disabled={isLoading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded px-4 py-2"
                data-testid="button-get-quote"
              >
                {isLoading ? 'Obteniendo cotización...' : 'Obtener Cotización'}
              </button>

              {quote && (
                <button
                  onClick={handleExecuteTrade}
                  disabled={isExecuting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded px-4 py-2"
                  data-testid="button-execute-trade"
                >
                  {isExecuting ? 'Ejecutando Trade...' : 'Ejecutar Trade Real'}
                </button>
              )}
            </div>

            {/* Message */}
            {message && (
              <div className="p-3 bg-gray-700 border border-gray-600 rounded text-sm">
                {message}
              </div>
            )}

            <div className="text-xs text-gray-500 text-center">
              ⚡ Genera volumen real en PancakeSwap que aparece en CoinMarketCap
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}