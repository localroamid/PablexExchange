import { pancakeswapIntegration } from './pancakeswapIntegration';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

interface TradeQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  commission: string;
  route: string[];
  minimumReceived: string;
}

interface ExecutedTrade {
  txHash: string;
  realVolume: string;
  amountOut: string;
  commission: string;
  gasUsed: string;
}

export class RealTradingServiceV2 {
  
  /**
   * Obtiene una cotización real de PancakeSwap con comisiones incluidas
   */
  async getRealQuote(userId: string, fromToken: string, toToken: string, amount: string): Promise<{
    success: boolean;
    quote?: TradeQuote;
    error?: string;
  }> {
    try {
      console.log(`🥞 Obteniendo cotización REAL de PancakeSwap: ${amount} ${fromToken} → ${toToken}`);

      // Verificar balance del usuario
      const portfolio = await storage.getUserPortfolio(userId);
      console.log('🔍 DEBUG portfolio completo:', JSON.stringify(portfolio, null, 2));
      
      const userToken = portfolio.find(p => p.cryptoId === fromToken.toLowerCase());
      const userBalance = userToken?.balance || '0';
      console.log(`🔍 DEBUG buscando token: ${fromToken.toLowerCase()}, encontrado:`, userToken);
      
      if (parseFloat(userBalance) < parseFloat(amount)) {
        console.log(`❌ Balance insuficiente: ${userBalance} < ${amount}`);
        return {
          success: false,
          error: `Balance insuficiente. Tienes ${userBalance} ${fromToken.toUpperCase()}`
        };
      }

      // Obtener cotización real de PancakeSwap
      const realQuote = await pancakeswapIntegration.getRealQuote(fromToken, toToken, amount);
      
      // Calcular comisión del 0.25%
      const outputAmount = parseFloat(realQuote.outputAmount);
      const commissionRate = 0.0025; // 0.25%
      const commission = outputAmount * commissionRate;
      const finalAmount = outputAmount - commission;

      const quote: TradeQuote = {
        inputAmount: realQuote.inputAmount,
        outputAmount: finalAmount.toString(),
        priceImpact: realQuote.priceImpact,
        commission: commission.toString(),
        route: realQuote.route,
        minimumReceived: realQuote.minimumReceived
      };

      console.log(`✅ Cotización REAL obtenida: ${amount} ${fromToken} = ${finalAmount.toFixed(8)} ${toToken}`);
      console.log(`💰 Comisión: ${commission.toFixed(8)} ${toToken} (0.25%)`);
      console.log(`🛣️ Ruta: ${realQuote.route.join(' → ')}`);
      
      return {
        success: true,
        quote
      };
    } catch (error) {
      console.error('❌ Error obteniendo cotización real:', error);
      return {
        success: false,
        error: 'Error conectando con PancakeSwap'
      };
    }
  }

  /**
   * Ejecuta un trade real que genera volumen en PancakeSwap
   */
  async executeRealTrade(
    userId: string, 
    fromToken: string, 
    toToken: string, 
    amount: string
  ): Promise<{
    success: boolean;
    trade?: ExecutedTrade;
    error?: string;
  }> {
    try {
      console.log(`🚀 Ejecutando TRADE REAL: ${amount} ${fromToken} → ${toToken}`);

      // Obtener cotización actualizada
      const quoteResult = await this.getRealQuote(userId, fromToken, toToken, amount);
      if (!quoteResult.success || !quoteResult.quote) {
        return {
          success: false,
          error: quoteResult.error || 'Error obteniendo cotización'
        };
      }

      const quote = quoteResult.quote;
      
      // Ejecutar el swap en PancakeSwap (simulado por ahora, puede ser real con wallet)
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      // Ejecutar transacción real en PancakeSwap
      const swapResult = await pancakeswapIntegration.executeSwap(
        fromToken,
        toToken,
        amount,
        user.id // En producción sería la wallet address del usuario
      );

      // Actualizar balances del usuario
      await this.updateUserBalances(userId, fromToken, toToken, amount, quote.outputAmount, quote.commission);

      // Registrar transacción en el historial
      await this.recordTransaction(userId, fromToken, toToken, amount, quote.outputAmount, quote.commission, swapResult.txHash);

      const executedTrade: ExecutedTrade = {
        txHash: swapResult.txHash,
        realVolume: this.calculateVolumeUSD(amount, fromToken),
        amountOut: quote.outputAmount,
        commission: quote.commission,
        gasUsed: swapResult.gasUsed
      };

      console.log(`✅ TRADE REAL EJECUTADO exitosamente!`);
      console.log(`📊 Volumen generado: $${executedTrade.realVolume} USD`);
      console.log(`🔗 TX Hash: ${swapResult.txHash}`);
      console.log(`💰 Comisión generada: ${quote.commission} ${toToken}`);

      return {
        success: true,
        trade: executedTrade
      };
    } catch (error) {
      console.error('❌ Error ejecutando trade real:', error);
      return {
        success: false,
        error: 'Error ejecutando transacción en PancakeSwap'
      };
    }
  }

  /**
   * Obtiene estadísticas del volumen real generado
   */
  async getRealVolumeStats(): Promise<{
    todayVolumeUSD: string;
    totalCommissionsUSD: string;
    pablexVolume24h: string;
    totalTrades: number;
  }> {
    try {
      // Obtener datos de volumen real de PABLEX
      const pablexData = await pancakeswapIntegration.getPablexVolume();
      
      // Obtener estadísticas de la base de datos
      const trades = await storage.getUserTransactions(userId); // Por ahora usar transacciones del usuario
      
      let totalVolumeUSD = 0;
      let totalCommissions = 0;
      
      for (const trade of trades) {
        if (trade.type === 'sell') {
          const volumeUSD = this.calculateVolumeUSD(trade.from_amount.toString(), trade.from_crypto_id || '');
          totalVolumeUSD += parseFloat(volumeUSD);
          totalCommissions += parseFloat(trade.commission?.toString() || '0');
        }
      }

      return {
        todayVolumeUSD: totalVolumeUSD.toFixed(2),
        totalCommissionsUSD: (totalCommissions * 0.000167).toFixed(4), // Comisiones en USD aprox
        pablexVolume24h: pablexData.volume24h,
        totalTrades: trades.length
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de volumen:', error);
      return {
        todayVolumeUSD: '0',
        totalCommissionsUSD: '0',
        pablexVolume24h: '125000',
        totalTrades: 0
      };
    }
  }

  /**
   * Actualiza los balances del usuario después del trade
   */
  private async updateUserBalances(
    userId: string, 
    fromToken: string, 
    toToken: string, 
    fromAmount: string, 
    toAmount: string,
    commission: string
  ): Promise<void> {
    // Reducir balance del token de origen
    const fromPortfolio = await storage.getUserPortfolio(userId);
    const fromTokenData = fromPortfolio.find(p => p.crypto_id === fromToken.toLowerCase());
    if (fromTokenData) {
      const newBalance = (parseFloat(fromTokenData.balance) - parseFloat(fromAmount)).toString();
      await storage.updatePortfolio(fromTokenData.id, { balance: newBalance });
    }

    // Aumentar balance del token de destino (ya con comisión descontada)
    const toTokenData = fromPortfolio.find(p => p.crypto_id === toToken.toLowerCase());
    if (toTokenData) {
      const newBalance = (parseFloat(toTokenData.balance) + parseFloat(toAmount)).toString();
      await storage.updatePortfolio(toTokenData.id, { balance: newBalance });
    }

    console.log(`💳 Balances actualizados: -${fromAmount} ${fromToken}, +${toAmount} ${toToken}`);
  }

  /**
   * Registra la transacción en el historial
   */
  private async recordTransaction(
    userId: string,
    fromToken: string,
    toToken: string,
    fromAmount: string,
    toAmount: string,
    commission: string,
    txHash: string
  ): Promise<void> {
    const transaction = {
      id: nanoid(),
      user_id: userId,
      type: 'sell' as const,
      status: 'completed' as const,
      from_crypto_id: fromToken.toLowerCase(),
      to_crypto_id: toToken.toLowerCase(),
      from_amount: parseFloat(fromAmount),
      to_amount: parseFloat(toAmount),
      commission: parseFloat(commission),
      commission_rate: 0.0025,
      tx_hash: txHash
    };

    await storage.createTransaction(transaction);
    console.log(`📝 Transacción registrada: ${transaction.id}`);
  }

  /**
   * Calcula el volumen en USD de la transacción
   */
  private calculateVolumeUSD(amount: string, token: string): string {
    const prices: Record<string, number> = {
      'pablex': 0.0001668,
      'usdt': 1.0,
      'bnb': 873.45,
      'busd': 1.0
    };

    const price = prices[token.toLowerCase()] || 0;
    const volumeUSD = parseFloat(amount) * price;
    
    return volumeUSD.toFixed(2);
  }
}

export const realTradingServiceV2 = new RealTradingServiceV2();