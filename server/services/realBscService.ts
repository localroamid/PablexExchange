import { ethers } from 'ethers';

/**
 * SERVICIO BSC REAL - TRANSACCIONES AUTÉNTICAS EN BLOCKCHAIN
 * 
 * Este servicio ejecuta transacciones reales en BSC mainnet
 * usando ethers.js y conexiones RPC auténticas.
 */

// BSC Mainnet Configuration
const BSC_MAINNET_RPC = 'https://bsc-dataseed1.binance.org/';
const BSC_CHAIN_ID = 56;

// Contract Addresses en BSC Mainnet
const CONTRACT_ADDRESSES = {
  USDT: '0x55d398326f99059fF775485246999027B3197955',  // Tether USD en BSC
  PABLEX: '0x6d71CF100cC5dECe979AB27559BEA08891226743', // PABLEX Token en BSC
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'   // Wrapped BNB
};

// ABI básico para tokens ERC20
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

interface RealTransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  error?: string;
  explorerUrl?: string;
  // Información de comisiones
  requestedAmount?: string;
  actualAmountSent?: string;
  gasFeeDeducted?: string;
  gasFeeInUsd?: string;
}

interface WalletInfo {
  address: string;
  privateKey: string;
  balance: {
    bnb: string;
    usdt: string;
    pablex: string;
  };
}

export class RealBscService {
  private provider: ethers.JsonRpcProvider;
  private exchangeWallet?: ethers.Wallet;
  
  constructor() {
    // Conectar a BSC mainnet
    this.provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
    console.log('🔗 Conectando a BSC Mainnet...');
    this.initializeExchangeWallet();
  }

  private async initializeExchangeWallet() {
    try {
      // TODO: Obtener clave privada real del exchange desde variables de entorno
      const exchangePrivateKey = process.env.EXCHANGE_PRIVATE_KEY;
      
      if (!exchangePrivateKey) {
        console.log('⚠️  EXCHANGE_PRIVATE_KEY no configurada - usando modo demo');
        return;
      }

      this.exchangeWallet = new ethers.Wallet(exchangePrivateKey, this.provider);
      const balance = await this.provider.getBalance(this.exchangeWallet.address);
      
      console.log(`✅ Exchange wallet inicializada:`);
      console.log(`   Address: ${this.exchangeWallet.address}`);
      console.log(`   BNB Balance: ${ethers.formatEther(balance)}`);
      
    } catch (error) {
      console.error('❌ Error inicializando exchange wallet:', error);
    }
  }

  /**
   * Estimar costo de gas en USD
   */
  private async estimateGasCostInUsd(gasEstimate: bigint, gasPrice: bigint): Promise<string> {
    try {
      // Calcular costo total en BNB
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostBnb = ethers.formatEther(gasCostWei);
      
      // Precio aproximado de BNB (se puede obtener de CoinGecko API)
      const bnbPriceUsd = 580; // $580 aproximadamente - se puede hacer dinámico
      const gasCostUsd = parseFloat(gasCostBnb) * bnbPriceUsd;
      
      return gasCostUsd.toFixed(4);
    } catch (error) {
      return '1.0000'; // Fallback
    }
  }

  /**
   * Calcular cantidad final después de descontar comisiones
   */
  private calculateAmountAfterFees(requestedAmount: string, gasCostUsd: string): {
    finalAmount: string;
    gasFeeDeducted: string;
    canProceed: boolean;
  } {
    const requested = parseFloat(requestedAmount);
    const gasCost = parseFloat(gasCostUsd);
    
    // Verificar que el monto sea mayor a la comisión
    if (requested <= gasCost) {
      return {
        finalAmount: '0',
        gasFeeDeducted: gasCostUsd,
        canProceed: false
      };
    }
    
    const finalAmount = requested - gasCost;
    
    return {
      finalAmount: finalAmount.toFixed(6),
      gasFeeDeducted: gasCostUsd,
      canProceed: true
    };
  }

  /**
   * Ejecutar transferencia real de tokens en BSC
   */
  async executeRealWithdrawal(params: {
    cryptoId: string;
    amount: string;
    toAddress: string;
    fromPrivateKey?: string;
  }): Promise<RealTransactionResult> {
    
    const { cryptoId, amount, toAddress, fromPrivateKey } = params;
    
    console.log(`🚀 INICIANDO TRANSFERENCIA REAL BSC:`);
    console.log(`   Token: ${cryptoId.toUpperCase()}`);
    console.log(`   Cantidad: ${amount}`);
    console.log(`   Destino: ${toAddress}`);

    try {
      // 🏦 USAR WALLET CENTRAL DEL EXCHANGE si no se proporciona clave privada
      let wallet;
      if (fromPrivateKey) {
        console.log('🔑 Usando wallet específica proporcionada');
        wallet = new ethers.Wallet(fromPrivateKey, this.provider);
      } else {
        console.log('🏦 Usando wallet CENTRAL del exchange (tokens centralizados)');
        // Usar wallet central del exchange por defecto
        wallet = this.exchangeWallet;
        if (!wallet) {
          // Fallback: crear wallet demo para desarrollo
          const demoPrivateKey = '0x' + '1'.repeat(64); // Demo key
          wallet = new ethers.Wallet(demoPrivateKey, this.provider);
          console.log('⚠️ Usando wallet demo para desarrollo');
        }
      }
      
      console.log(`🔑 Usando wallet para retiro: ${wallet.address}`);

      // Validar dirección destino
      if (!ethers.isAddress(toAddress)) {
        throw new Error(`Dirección destino inválida: ${toAddress}`);
      }

      // Ejecutar transferencia según el tipo de token
      if (cryptoId.toLowerCase() === 'bnb') {
        return await this.transferBNB(wallet, amount, toAddress);
      } else {
        return await this.transferToken(wallet, cryptoId, amount, toAddress);
      }

    } catch (error: any) {
      console.error('❌ Error en transferencia real:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido en transferencia BSC real'
      };
    }
  }

  /**
   * Transferir BNB nativo
   */
  private async transferBNB(
    wallet: ethers.Wallet, 
    amount: string, 
    toAddress: string
  ): Promise<RealTransactionResult> {
    
    console.log(`💰 Transfiriendo ${amount} BNB...`);
    
    const amountWei = ethers.parseEther(amount);
    
    // Estimar gas
    const gasEstimate = await wallet.estimateGas({
      to: toAddress,
      value: amountWei
    });

    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice!;
    const gasCost = gasEstimate * gasPrice;
    
    console.log(`⛽ Gas estimado: ${ethers.formatEther(gasCost)} BNB`);
    
    // Estimar costo de gas en USD
    const gasCostUsd = await this.estimateGasCostInUsd(gasEstimate, gasPrice);
    console.log(`💰 Costo de gas estimado: $${gasCostUsd} USD`);
    
    // Calcular cantidad final después de descontar comisiones
    const feeCalculation = this.calculateAmountAfterFees(amount, gasCostUsd);
    
    if (!feeCalculation.canProceed) {
      throw new Error(
        `Monto insuficiente para cubrir comisiones. ` +
        `Solicitado: ${amount} BNB, Comisión: $${gasCostUsd} USD`
      );
    }
    
    // Usar el monto final (después de comisiones) para la transferencia
    const finalAmountWei = ethers.parseEther(feeCalculation.finalAmount);
    
    console.log(`📤 Monto original: ${amount} BNB`);
    console.log(`📤 Monto final (después de comisiones): ${feeCalculation.finalAmount} BNB`);
    
    // Verificar balance suficiente (cantidad final + gas)
    const walletBalance = await this.provider.getBalance(wallet.address);
    const totalRequired = finalAmountWei + gasCost;
    
    if (walletBalance < totalRequired) {
      throw new Error(
        `Balance insuficiente. Requerido: ${ethers.formatEther(totalRequired)} BNB, ` +
        `Disponible: ${ethers.formatEther(walletBalance)} BNB`
      );
    }

    // Ejecutar transacción con el monto final
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: finalAmountWei, // Usar monto después de comisiones
      gasLimit: gasEstimate * BigInt(120) / BigInt(100), // +20% buffer
      gasPrice: gasPrice
    });

    console.log(`🔄 Transacción enviada: ${tx.hash}`);
    console.log(`   Esperando confirmación...`);
    
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transacción no confirmada');
    }
    
    console.log(`✅ Transacción confirmada en bloque ${receipt.blockNumber}`);
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      gasPrice: gasPrice?.toString(),
      explorerUrl: `https://bscscan.com/tx/${tx.hash}`,
      // Información de comisiones
      requestedAmount: amount,
      actualAmountSent: feeCalculation.finalAmount,
      gasFeeDeducted: feeCalculation.gasFeeDeducted,
      gasFeeInUsd: gasCostUsd
    };
  }

  /**
   * Transferir token ERC20 (USDT, PABLEX, etc.)
   */
  private async transferToken(
    wallet: ethers.Wallet,
    cryptoId: string,
    amount: string,
    toAddress: string
  ): Promise<RealTransactionResult> {
    
    const tokenAddress = this.getTokenAddress(cryptoId);
    if (!tokenAddress) {
      throw new Error(`Token no soportado: ${cryptoId}`);
    }

    console.log(`🪙 Transfiriendo ${amount} ${cryptoId.toUpperCase()}...`);
    console.log(`   Contract: ${tokenAddress}`);
    
    // Crear instancia del contrato
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Obtener decimales del token
    const decimals = await tokenContract.decimals();
    const amountBN = ethers.parseUnits(amount, decimals);
    
    console.log(`   Decimales: ${decimals}`);
    console.log(`   Cantidad en wei: ${amountBN.toString()}`);
    
    // Estimar gas primero
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice!;
    const gasEstimate = await tokenContract.transfer.estimateGas(toAddress, amountBN);
    const gasCost = gasEstimate * gasPrice;
    
    console.log(`⛽ Gas estimado: ${ethers.formatEther(gasCost)} BNB`);
    
    // Estimar costo de gas en USD
    const gasCostUsd = await this.estimateGasCostInUsd(gasEstimate, gasPrice);
    console.log(`💰 Costo de gas estimado: $${gasCostUsd} USD`);
    
    // 🔧 SIMPLIFICADO: No calcular comisiones aquí, ya se hizo en el backend
    // Solo transferir la cantidad exacta que nos enviaron (netAmount)
    const finalAmountBN = amountBN; // Usar cantidad exacta recibida
    
    console.log(`📤 Transfiriendo cantidad exacta: ${amount} ${cryptoId.toUpperCase()}`);
    
    // Verificar balance del token (con la cantidad exacta a transferir)
    const tokenBalance = await tokenContract.balanceOf(wallet.address);
    if (tokenBalance < finalAmountBN) {
      throw new Error(
        `Balance insuficiente de ${cryptoId.toUpperCase()}. ` +
        `Requerido: ${amount}, Disponible: ${ethers.formatUnits(tokenBalance, decimals)}`
      );
    }

    // Verificar balance BNB para gas
    const bnbBalance = await this.provider.getBalance(wallet.address);
    
    if (bnbBalance < gasCost) {
      throw new Error(
        `Balance BNB insuficiente para gas fees. ` +
        `Requerido: ${ethers.formatEther(gasCost)} BNB, ` +
        `Disponible: ${ethers.formatEther(bnbBalance)} BNB`
      );
    }
    
    // Ejecutar transferencia con el monto final
    const tx = await tokenContract.transfer(toAddress, finalAmountBN, {
      gasLimit: gasEstimate * BigInt(120) / BigInt(100), // +20% buffer
      gasPrice: gasPrice
    });

    console.log(`🔄 Transacción de token enviada: ${tx.hash}`);
    console.log(`   Esperando confirmación...`);
    
    const receipt = await tx.wait();
    
    console.log(`✅ Transacción de token confirmada en bloque ${receipt.blockNumber}`);
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      gasPrice: gasPrice?.toString(),
      explorerUrl: `https://bscscan.com/tx/${tx.hash}`,
      // Información real - sin comisiones dobles
      requestedAmount: amount,
      actualAmountSent: amount, // Enviamos exactamente lo que se pidió
      gasFeeDeducted: "0", // Las comisiones se manejan en el backend
      gasFeeInUsd: gasCostUsd
    };
  }

  /**
   * Obtener precio aproximado del token en USD (se puede mejorar con API real)
   */
  private getTokenPriceUsd(cryptoId: string): number {
    const tokenPrices: { [key: string]: number } = {
      'usdt': 1.0,      // USDT ~= $1
      'pablex': 0.00016, // PABLEX ~= $0.00016
      'wbnb': 580,       // WBNB ~= BNB ~= $580
    };
    
    return tokenPrices[cryptoId.toLowerCase()] || 1.0;
  }

  /**
   * Obtener dirección de contrato por token ID
   */
  private getTokenAddress(cryptoId: string): string | null {
    const tokenMap: { [key: string]: string } = {
      'usdt': CONTRACT_ADDRESSES.USDT,
      'pablex': CONTRACT_ADDRESSES.PABLEX,
      'wbnb': CONTRACT_ADDRESSES.WBNB,
    };
    
    return tokenMap[cryptoId.toLowerCase()] || null;
  }

  /**
   * Verificar información de wallet
   */
  async getWalletInfo(privateKey: string): Promise<WalletInfo> {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Balance BNB
    const bnbBalance = await this.provider.getBalance(wallet.address);
    
    // Balance USDT
    const usdtContract = new ethers.Contract(CONTRACT_ADDRESSES.USDT, ERC20_ABI, this.provider);
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const usdtDecimals = await usdtContract.decimals();
    
    // Balance PABLEX
    const pablexContract = new ethers.Contract(CONTRACT_ADDRESSES.PABLEX, ERC20_ABI, this.provider);
    const pablexBalance = await pablexContract.balanceOf(wallet.address);
    const pablexDecimals = await pablexContract.decimals();
    
    return {
      address: wallet.address,
      privateKey: privateKey,
      balance: {
        bnb: ethers.formatEther(bnbBalance),
        usdt: ethers.formatUnits(usdtBalance, usdtDecimals),
        pablex: ethers.formatUnits(pablexBalance, pablexDecimals)
      }
    };
  }

  /**
   * Verificar si una transacción fue exitosa en BSCScan
   */
  async verifyTransaction(txHash: string): Promise<{
    success: boolean;
    confirmed: boolean;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          success: false,
          confirmed: false,
          error: 'Transacción no encontrada'
        };
      }
      
      return {
        success: receipt.status === 1,
        confirmed: true,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error: any) {
      return {
        success: false,
        confirmed: false,
        error: error.message
      };
    }
  }
}

// Instancia singleton
export const realBscService = new RealBscService();