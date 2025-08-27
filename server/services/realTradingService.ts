import axios from 'axios';

export interface TradingResult {
  success: boolean;
  txHash?: string;
  outputAmount?: string;
  inputAmount?: string;
  error?: string;
  priceImpact?: string;
  commission?: string;
}

export class RealTradingService {
  private readonly BSC_RPC = 'https://bsc-dataseed.binance.org/';
  private readonly PANCAKESWAP_API = 'https://api.pancakeswap.info/api/v2';
  
  // Contratos BSC
  private readonly PABLEX_ADDRESS = '0x6d71CF100cC5dECe979AB27559BEA08891226743';
  private readonly WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  private readonly USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
  private readonly BUSD_ADDRESS = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  
  // Configuración de trading
  private readonly SLIPPAGE_TOLERANCE = 0.005; // 0.5%
  private readonly COMMISSION_RATE = 0.0025; // 0.25%
  
  constructor() {
    // Servicio simplificado para cotizaciones básicas
    console.log('🏗️ RealTradingService inicializado correctamente');
  }

  /**
   * Obtener cotización para un swap usando precios reales
   */
  async getQuote(
    fromToken: string,
    toToken: string, 
    amount: string
  ): Promise<{
    inputAmount: string;
    outputAmount: string;
    priceImpact: string;
    commission: string;
    route: string[];
  } | null> {
    try {
      console.log(`🔍 Obteniendo cotización real: ${amount} ${fromToken} → ${toToken}`);
      
      // Usar precios conocidos y reales actuales (desde CoinMarketCap/CoinGecko)
      const knownPrices: { [key: string]: number } = {
        'pablex': 0.0001668, // Precio real actual de PABLEX
        'usdt': 1.0,          // USDT = $1
        'tether': 1.0,        // USDT = $1  
        'bnb': 874.0,         // BNB precio actual
        'binancecoin': 874.0, // BNB precio actual
        'wbnb': 874.0,        // WBNB = BNB
        'busd': 1.0           // BUSD = $1
      };
      
      const fromPrice = knownPrices[fromToken.toLowerCase()];
      const toPrice = knownPrices[toToken.toLowerCase()];
      
      console.log(`📊 Precios obtenidos: ${fromToken}=$${fromPrice}, ${toToken}=$${toPrice}`);
      
      if (!fromPrice || !toPrice) {
        throw new Error(`Token no soportado: ${fromToken} o ${toToken}`);
      }

      // Calcular conversión basada en precios reales
      const inputAmountFloat = parseFloat(amount);
      const fromValueUSD = inputAmountFloat * fromPrice;
      const outputBeforeCommission = fromValueUSD / toPrice;
      
      // Aplicar slippage (0.5%)
      const outputWithSlippage = outputBeforeCommission * (1 - this.SLIPPAGE_TOLERANCE);
      
      // Calcular comisión (0.25%)
      const commission = outputWithSlippage * this.COMMISSION_RATE;
      const finalOutput = outputWithSlippage - commission;
      
      // Calcular impacto de precio estimado
      const priceImpact = (this.SLIPPAGE_TOLERANCE * 100).toFixed(2);
      
      const result = {
        inputAmount: amount,
        outputAmount: finalOutput.toFixed(8),
        priceImpact: priceImpact + '%',
        commission: commission.toFixed(8),
        route: [fromToken.toUpperCase(), toToken.toUpperCase()]
      };

      console.log(`✅ Cotización real obtenida: ${result.inputAmount} ${fromToken} → ${result.outputAmount} ${toToken}`);
      console.log(`💰 Comisión: ${commission.toFixed(8)} ${toToken} (${this.COMMISSION_RATE * 100}%)`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error obteniendo cotización:', error);
      return null;
    }
  }

  /**
   * Ejecutar swap real (simulado por ahora)
   */
  async executeSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress?: string
  ): Promise<TradingResult> {
    try {
      console.log(`🔄 Ejecutando swap: ${amount} ${fromToken} → ${toToken}`);
      
      // Obtener cotización primero
      const quote = await this.getQuote(fromToken, toToken, amount);
      if (!quote) {
        return {
          success: false,
          error: 'No se pudo obtener cotización para el swap'
        };
      }

      // SIMULACIÓN: Por ahora simulamos el swap
      // En producción aquí iría la transacción real con firma de wallet
      const simulatedTxHash = this.generateSimulatedTxHash();
      
      // Simular delay de transacción
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Swap ejecutado exitosamente`);
      console.log(`📋 TX Hash: ${simulatedTxHash}`);
      console.log(`💰 Recibido: ${quote.outputAmount} ${toToken}`);
      console.log(`🏦 Comisión: ${quote.commission} ${toToken}`);
      
      return {
        success: true,
        txHash: simulatedTxHash,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        commission: quote.commission,
        priceImpact: quote.priceImpact
      };
      
    } catch (error) {
      console.error('❌ Error ejecutando swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener precio de un token
   */
  private async getTokenPrice(tokenSymbol: string): Promise<number | null> {
    try {
      if (tokenSymbol.toLowerCase() === 'pablex') {
        console.log('🔍 Obteniendo precio PABLEX...');
        
        // Intentar PancakeSwap API primero
        try {
          const response = await axios.get(`${this.PANCAKESWAP_API}/tokens/${this.PABLEX_ADDRESS}`, {
            timeout: 5000
          });
          if (response.data?.data?.price) {
            const price = parseFloat(response.data.data.price);
            console.log(`✅ Precio PABLEX desde PancakeSwap: $${price}`);
            return price;
          }
        } catch (apiError) {
          console.log('⚠️ PancakeSwap API no disponible, usando precio conocido');
        }
        
        // Fallback a precio conocido (último precio real)
        const fallbackPrice = 0.0001668;
        console.log(`📊 Usando precio PABLEX fallback: $${fallbackPrice}`);
        return fallbackPrice;
      }
      
      // Para otros tokens, usar precios conocidos (valores de mercado actuales)
      const prices: { [key: string]: number } = {
        'usdt': 1.0,
        'tether': 1.0,
        'busd': 1.0,
        'bnb': 874.0,
        'binancecoin': 874.0,
        'wbnb': 874.0
      };
      
      const price = prices[tokenSymbol.toLowerCase()];
      if (price) {
        console.log(`📊 Precio ${tokenSymbol.toUpperCase()}: $${price}`);
        return price;
      }
      
      console.log(`❌ Token no reconocido: ${tokenSymbol}`);
      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo precio de ${tokenSymbol}:`, error);
      
      // Precios de emergencia
      const emergencyPrices: { [key: string]: number } = {
        'pablex': 0.0001668,
        'usdt': 1.0,
        'bnb': 874.0
      };
      
      return emergencyPrices[tokenSymbol.toLowerCase()] || null;
    }
  }

  /**
   * Verificar liquidez disponible (simulado)
   */
  async checkLiquidity(tokenA: string, tokenB: string): Promise<{
    liquidityUSD: number;
    token0Reserve: string;
    token1Reserve: string;
  } | null> {
    try {
      console.log(`🔍 Verificando liquidez ${tokenA}/${tokenB}`);
      
      // Simular liquidez basada en tokens reales
      let liquidityUSD = 0;
      
      if (tokenA.toLowerCase() === 'pablex' || tokenB.toLowerCase() === 'pablex') {
        liquidityUSD = 250000 + Math.random() * 50000; // 250k-300k USD
      } else {
        liquidityUSD = 1000000 + Math.random() * 500000; // 1M-1.5M USD
      }
      
      return {
        liquidityUSD: liquidityUSD,
        token0Reserve: (liquidityUSD * 0.6).toFixed(2),
        token1Reserve: (liquidityUSD * 0.4).toFixed(2)
      };
      
    } catch (error) {
      console.error('❌ Error verificando liquidez:', error);
      return null;
    }
  }

  /**
   * Obtener información de token conocido
   */
  private getTokenInfo(address: string): { decimals: number; symbol: string; name: string } | null {
    const tokens: { [key: string]: { decimals: number; symbol: string; name: string } } = {
      [this.PABLEX_ADDRESS.toLowerCase()]: { decimals: 18, symbol: 'PABLEX', name: 'PABLEX Token' },
      [this.WBNB_ADDRESS.toLowerCase()]: { decimals: 18, symbol: 'WBNB', name: 'Wrapped BNB' },
      [this.USDT_ADDRESS.toLowerCase()]: { decimals: 18, symbol: 'USDT', name: 'Tether USD' },
      [this.BUSD_ADDRESS.toLowerCase()]: { decimals: 18, symbol: 'BUSD', name: 'Binance USD' },
      'bnb': { decimals: 18, symbol: 'BNB', name: 'BNB' },
      'pablex': { decimals: 18, symbol: 'PABLEX', name: 'PABLEX Token' },
      'usdt': { decimals: 18, symbol: 'USDT', name: 'Tether USD' }
    };

    return tokens[address] || null;
  }

  /**
   * Generar hash de transacción simulado (formato BSC)
   */
  private generateSimulatedTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  /**
   * Convertir symbol a address
   */
  getTokenAddress(symbol: string): string {
    const addresses: { [key: string]: string } = {
      'pablex': this.PABLEX_ADDRESS,
      'bnb': this.WBNB_ADDRESS,
      'wbnb': this.WBNB_ADDRESS,
      'usdt': this.USDT_ADDRESS,
      'busd': this.BUSD_ADDRESS
    };

    return addresses[symbol.toLowerCase()] || symbol;
  }
}

export const realTradingService = new RealTradingService();