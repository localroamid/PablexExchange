interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  volume_24h: number;
}

export class CoinGeckoService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private apiKey = process.env.COINGECKO_API_KEY || '';
  private cache: { [key: string]: { price: number; change24h: number; timestamp: number } } = {};
  private readonly CACHE_DURATION = 0; // SIN CACHE - tiempo real absoluto

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['x-cg-demo-api-key'] = this.apiKey;
    }
    
    return headers;
  }

  async getCurrentPrices(coinIds: string[]): Promise<CoinGeckoPrice> {
    const now = Date.now();
    const result: CoinGeckoPrice = {};
    
    // Usar cache si está disponible y no ha expirado
    const needsUpdate = coinIds.some(id => {
      const cached = this.cache[id];
      return !cached || (now - cached.timestamp) > this.CACHE_DURATION;
    });
    
    if (!needsUpdate) {
      // Devolver datos del cache
      coinIds.forEach(id => {
        const cached = this.cache[id];
        if (cached) {
          result[id] = {
            usd: cached.price,
            usd_24h_change: cached.change24h
          };
        }
      });
      return result;
    }
    
    try {
      const ids = coinIds.join(',');
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        // Si falla la API, usar cache o valores por defecto
        return this.getFallbackPrices(coinIds);
      }
      
      const data = await response.json();
      
      // Actualizar cache
      Object.keys(data).forEach(id => {
        this.cache[id] = {
          price: data[id].usd || 0,
          change24h: data[id].usd_24h_change || 0,
          timestamp: now
        };
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      return this.getFallbackPrices(coinIds);
    }
  }

  async getMarketData(limit = 10): Promise<CryptoPrice[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  private getFallbackPrices(coinIds: string[]): CoinGeckoPrice {
    const fallbackPrices: { [key: string]: { usd: number; usd_24h_change: number } } = {
      'bitcoin': { usd: 43000, usd_24h_change: 1.5 },
      'ethereum': { usd: 2600, usd_24h_change: 2.1 },
      'binancecoin': { usd: 600, usd_24h_change: 0.8 },
      'tether': { usd: 1.0, usd_24h_change: 0.01 },
      'pablex': { usd: 0.012, usd_24h_change: 0 }
    };
    
    const result: CoinGeckoPrice = {};
    coinIds.forEach(id => {
      // Usar cache si existe, sino usar fallback
      const cached = this.cache[id];
      if (cached) {
        result[id] = {
          usd: cached.price,
          usd_24h_change: cached.change24h
        };
      } else {
        result[id] = fallbackPrices[id] || { usd: 0, usd_24h_change: 0 };
      }
    });
    
    return result;
  }

  async getCoinPrice(coinId: string): Promise<number> {
    try {
      const prices = await this.getCurrentPrices([coinId]);
      return prices[coinId]?.usd || 0;
    } catch (error) {
      console.error(`Error fetching price for ${coinId}:`, error);
      return 0;
    }
  }

  async getHistoricalData(coinId: string, days = 7): Promise<number[][]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.prices || [];
    } catch (error) {
      console.error(`Error fetching historical data for ${coinId}:`, error);
      return [];
    }
  }
}

export const coinGeckoService = new CoinGeckoService();
