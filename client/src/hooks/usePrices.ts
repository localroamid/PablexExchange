import { useState, useEffect } from 'react';

interface Prices {
  [key: string]: {
    price: number;
    change24h: number;
    symbol: string;
  };
}

export const usePrices = () => {
  const [prices, setPrices] = useState<Prices>({});
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const loadPrices = async () => {
    try {
      console.log('🔄 Actualizando precios desde CoinGecko...');
      const pricesRes = await fetch('/api/prices', { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const newPrices = await pricesRes.json();
      setPrices(newPrices);
      setLastUpdate(Date.now());
      console.log('✅ Precios actualizados');
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  };

  useEffect(() => {
    loadPrices();
    // Cargar precios cada 100ms (ultra rápido)
    const priceInterval = setInterval(loadPrices, 100);
    return () => {
      clearInterval(priceInterval);
    };
  }, []);

  return { prices, lastUpdate, loadPrices };
};