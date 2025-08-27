import React, { useState, useEffect } from 'react';
import { usePrices } from '@/hooks/usePrices';

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  fromCryptoId: string;
  toCryptoId: string;
  fromAmount: string;
  toAmount: string;
  commission: string;
  commissionRate: string;
  price: string;
  createdAt: string;
}

interface Prices {
  [key: string]: {
    price: number;
    change24h: number;
    symbol: string;
  };
}

export default function TradingPage() {
  const [fromCrypto, setFromCrypto] = useState('tether');
  const [toCrypto, setToCrypto] = useState('pablex');
  const [amount, setAmount] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const { prices } = usePrices();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [commission, setCommission] = useState<any>(null);

  const cryptos = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB' },
    { id: 'tether', name: 'Tether', symbol: 'USDT' },
    { id: 'pablex', name: 'Pablex Token', symbol: 'PABLEX' },
  ];

  useEffect(() => {
    loadData();
    // Cargar datos completos cada 5 segundos
    const dataInterval = setInterval(loadData, 5000);
    return () => {
      clearInterval(dataInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      const [tradesRes, commissionRes, portfolioRes] = await Promise.all([
        fetch('/api/trade/history', { cache: 'no-cache' }),
        fetch('/api/commission-settings', { cache: 'no-cache' }),
        fetch('/api/portfolio', { cache: 'no-cache' })
      ]);
      
      setTrades(await tradesRes.json());
      setCommission(await commissionRes.json());
      setPortfolios(await portfolioRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const showToast = (title: string, description: string, variant = 'success') => {
    const style = variant === 'error' ? 
      'background: #dc2626; color: white;' : 
      'background: #059669; color: white;';
    
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="${style} position: fixed; top: 20px; right: 20px; padding: 12px; border-radius: 8px; z-index: 1000; max-width: 300px;">
        <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 14px; opacity: 0.9;">${description}</div>
      </div>
    `;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 3000);
  };

  const executeTrade = async (type: 'buy' | 'sell') => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast("Error", "Por favor ingresa una cantidad válida", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/trade/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCryptoId: fromCrypto,
          toCryptoId: toCrypto,
          fromAmount: amount,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast("¡Éxito!", `${type === 'buy' ? 'Compra' : 'Venta'} completada exitosamente`);
        setAmount('');
        loadData();
      } else {
        throw new Error(result.error || 'Trade failed');
      }
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Error en la transacción", "error");
    } finally {
      setLoading(false);
    }
  };

  const swapCryptos = () => {
    setFromCrypto(toCrypto);
    setToCrypto(fromCrypto);
  };

  const calculatePreview = () => {
    if (!amount || !prices[fromCrypto] || !prices[toCrypto]) return null;
    
    const fromPrice = prices[fromCrypto].price;
    const toPrice = prices[toCrypto].price;
    const fromAmount = parseFloat(amount);
    const toAmountBeforeFee = (fromAmount * fromPrice) / toPrice;
    const commissionRate = parseFloat(commission?.tradingCommission || '0.0025');
    const commissionAmount = toAmountBeforeFee * commissionRate;
    const finalAmount = toAmountBeforeFee - commissionAmount;

    return {
      toAmountBeforeFee,
      commissionAmount,
      finalAmount,
      commissionRate
    };
  };

  const preview = calculatePreview();
  const fromBalance = portfolios.find(p => p.cryptoId === fromCrypto)?.balance || '0';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 20px 0'
          }}>
            🔥 Trading Pablex
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '18px' }}>
            Intercambia criptomonedas con comisiones del {commission ? (parseFloat(commission.tradingCommission) * 100).toFixed(2) : '0.25'}%
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
          
          {/* Trading Panel */}
          <div style={{
            backgroundColor: '#1f2937',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid #374151'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🔄 Panel de Trading
            </h2>
            
            {/* From Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#9ca3af', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Desde
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={fromCrypto}
                  onChange={(e) => setFromCrypto(e.target.value)}
                  style={{
                    width: '160px',
                    padding: '12px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '16px'
                  }}
                >
                  {cryptos.map(crypto => (
                    <option key={crypto.id} value={crypto.id}>
                      {crypto.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    flex: '1',
                    padding: '12px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '16px'
                  }}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Balance: {parseFloat(fromBalance).toFixed(8)} {cryptos.find(c => c.id === fromCrypto)?.symbol}
              </p>
            </div>

            {/* Swap Button */}
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <button
                onClick={swapCryptos}
                style={{
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ↕️
              </button>
            </div>

            {/* To Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#9ca3af', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                A
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={toCrypto}
                  onChange={(e) => setToCrypto(e.target.value)}
                  style={{
                    width: '160px',
                    padding: '12px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '16px'
                  }}
                >
                  {cryptos.map(crypto => (
                    <option key={crypto.id} value={crypto.id}>
                      {crypto.symbol}
                    </option>
                  ))}
                </select>
                <div style={{
                  flex: '1',
                  padding: '12px',
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  color: '#d1d5db',
                  fontSize: '16px'
                }}>
                  {preview ? preview.finalAmount.toFixed(8) : '0.00'}
                </div>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div style={{
                backgroundColor: '#374151',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#9ca3af' }}>Precio</span>
                  <span>1 {cryptos.find(c => c.id === fromCrypto)?.symbol} = {(prices[fromCrypto]?.price / prices[toCrypto]?.price).toFixed(8)} {cryptos.find(c => c.id === toCrypto)?.symbol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#9ca3af' }}>Comisión ({(preview.commissionRate * 100).toFixed(2)}%)</span>
                  <span style={{ color: '#ef4444' }}>-{preview.commissionAmount.toFixed(8)} {cryptos.find(c => c.id === toCrypto)?.symbol}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  borderTop: '1px solid #4b5563',
                  paddingTop: '8px'
                }}>
                  <span>Recibirás</span>
                  <span style={{ color: '#10b981' }}>{preview.finalAmount.toFixed(8)} {cryptos.find(c => c.id === toCrypto)?.symbol}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <button
                onClick={() => executeTrade('buy')}
                disabled={loading || !amount}
                style={{
                  backgroundColor: loading || !amount ? '#6b7280' : '#059669',
                  color: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading || !amount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                📈 {loading ? 'Comprando...' : 'Comprar'}
              </button>
              <button
                onClick={() => executeTrade('sell')}
                disabled={loading || !amount}
                style={{
                  backgroundColor: loading || !amount ? '#6b7280' : '#dc2626',
                  color: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading || !amount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                📉 {loading ? 'Vendiendo...' : 'Vender'}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            
            {/* Prices */}
            <div style={{
              backgroundColor: '#1f2937',
              padding: '30px',
              borderRadius: '12px',
              border: '1px solid #374151',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                💰 Precios <span style={{ fontSize: '12px', color: '#10b981' }}>●</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cryptos.map(crypto => {
                  const price = prices[crypto.id];
                  if (!price) return null;
                  
                  return (
                    <div key={crypto.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontWeight: '500', margin: '0' }}>{crypto.symbol}</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0' }}>{crypto.name}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '500', margin: '0' }} key={`price-${crypto.id}-${price.price}`}>
                          ${price.price.toFixed(crypto.id === 'pablex' ? 6 : 2)}
                        </p>
                        <p style={{
                          fontSize: '12px',
                          color: price.change24h >= 0 ? '#10b981' : '#ef4444',
                          margin: '0'
                        }} key={`change-${crypto.id}-${price.change24h}`}>
                          {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trade History */}
            <div style={{
              backgroundColor: '#1f2937',
              padding: '30px',
              borderRadius: '12px',
              border: '1px solid #374151'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                📊 Últimos Trades
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {trades.length === 0 ? (
                  <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
                    No hay transacciones aún
                  </p>
                ) : (
                  trades.slice(0, 5).map(trade => (
                    <div key={trade.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #374151'
                    }}>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: trade.type === 'buy' ? '#059669' : '#dc2626',
                          color: 'white',
                          marginRight: '8px'
                        }}>
                          {trade.type === 'buy' ? 'COMPRA' : 'VENTA'}
                        </span>
                        <span style={{ fontSize: '12px' }}>
                          {parseFloat(trade.fromAmount).toFixed(4)} {cryptos.find(c => c.id === trade.fromCryptoId)?.symbol}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px' }}>
                        <p style={{ margin: '0' }}>+{parseFloat(trade.toAmount).toFixed(4)}</p>
                        <p style={{ margin: '0', color: '#9ca3af' }}>
                          -{parseFloat(trade.commission).toFixed(6)} fee
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}