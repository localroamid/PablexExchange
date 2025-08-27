interface CoinMarketCapQuote {
  USD: {
    price: number;
    percent_change_24h: number;
    percent_change_7d: number;
    market_cap: number;
    volume_24h: number;
    last_updated: string;
  };
}

interface CoinMarketCapData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  quote: CoinMarketCapQuote;
  last_updated: string;
}

interface CoinMarketCapResponse {
  data: CoinMarketCapData[];
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

interface CoinMarketCapChartData {
  price: number[][];
  volume: number[][];
  market_cap: number[][];
}

export class CoinMarketCapService {
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private apiKey = process.env.COINMARKETCAP_API_KEY || '';

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-CMC_PRO_API_KEY': this.apiKey,
      'Accept': 'application/json',
    };
  }

  async getQuotes(symbols: string[]): Promise<CoinMarketCapResponse> {
    try {
      const symbolList = symbols.join(',');
      const response = await fetch(
        `${this.baseUrl}/cryptocurrency/quotes/latest?symbol=${symbolList}&convert=USD`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching CoinMarketCap quotes:', error);
      throw error;
    }
  }

  async getMarketData(limit = 10): Promise<CoinMarketCapData[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=${limit}&convert=USD&sort=market_cap`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching CoinMarketCap market data:', error);
      throw error;
    }
  }

  async getHistoricalData(symbol: string, timeStart?: string, timeEnd?: string): Promise<CoinMarketCapChartData> {
    try {
      const params = new URLSearchParams({
        symbol: symbol,
        time_period: 'daily',
        time_start: timeStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        time_end: timeEnd || new Date().toISOString(),
        count: '30',
        interval: '1d',
        convert: 'USD'
      });

      const response = await fetch(
        `${this.baseUrl}/cryptocurrency/quotes/historical?${params}`,
        {
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform the data for chart compatibility
      const chartData: CoinMarketCapChartData = {
        price: [],
        volume: [],
        market_cap: []
      };
      
      if (data.data && data.data.quotes) {
        data.data.quotes.forEach((quote: any) => {
          const timestamp = new Date(quote.timestamp).getTime();
          chartData.price.push([timestamp, quote.quote.USD.price]);
          chartData.volume.push([timestamp, quote.quote.USD.volume_24h]);
          chartData.market_cap.push([timestamp, quote.quote.USD.market_cap]);
        });
      }
      
      return chartData;
    } catch (error) {
      console.error(`Error fetching CoinMarketCap historical data for ${symbol}:`, error);
      return { price: [], volume: [], market_cap: [] };
    }
  }

  // Fallback method using public CoinMarketCap widget data (no API key required)
  async getPublicData(symbols: string[]): Promise<any> {
    try {
      // Using CoinMarketCap's public widget endpoint (more reliable for demo)
      const symbolList = symbols.join(',');
      const response = await fetch(
        `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/market-pairs/latest?slug=${symbolList.toLowerCase()}&start=1&limit=5&category=spot&centerType=all&sort=cmc_rank_advanced&direction=desc&spotUntracked=true`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinMarketCap public API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching CoinMarketCap public data:', error);
      throw error;
    }
  }
}

export const coinMarketCapService = new CoinMarketCapService();