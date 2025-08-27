import { storage } from '../storage';
import axios from 'axios';

interface BSCTransaction {
  hash: string;
  to: string;
  from: string;
  value: string;
  contractAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimal?: string;
}

interface BSCApiResponse {
  status: string;
  message: string;
  result: BSCTransaction[];
}

class DepositMonitor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly SCAN_INTERVAL = 30000; // 30 segundos
  private readonly MAX_BLOCKS_TO_SCAN = 50; // Últimos 50 bloques
  private lastScannedBlock = 0;

  // Contratos de tokens BSC
  private readonly TOKEN_CONTRACTS = {
    'usdt': '0x55d398326f99059fF775485246999027B3197955', // USDT BSC
    'pablex': '0x6d71CF100cC5dECe979AB27559BEA08891226743', // PABLEX
    'bnb': 'BNB' // BNB nativo
  };

  public start(): void {
    if (this.isRunning) {
      console.log('🔍 Monitor de depósitos ya está ejecutándose');
      return;
    }

    console.log('🚀 Iniciando monitor automático de depósitos BSC...');
    this.isRunning = true;
    
    // Escanear inmediatamente al inicio
    this.scanForDeposits();
    
    // Configurar escaneo periódico
    this.intervalId = setInterval(() => {
      this.scanForDeposits();
    }, this.SCAN_INTERVAL);

    console.log(`✅ Monitor iniciado - escaneando cada ${this.SCAN_INTERVAL/1000} segundos`);
  }

  public stop(): void {
    if (!this.isRunning) return;

    console.log('🛑 Deteniendo monitor de depósitos...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('✅ Monitor de depósitos detenido');
  }

  private async scanForDeposits(): Promise<void> {
    try {
      console.log('🔍 Escaneando nuevos depósitos...');
      
      // Obtener todas las direcciones de depósito activas
      const depositAddresses = await storage.getAllActiveDepositAddresses();
      
      if (depositAddresses.length === 0) {
        console.log('📭 No hay direcciones de depósito para monitorear');
        return;
      }

      console.log(`📋 Monitoreando ${depositAddresses.length} direcciones de depósito`);

      // Escanear cada dirección
      for (const addressInfo of depositAddresses) {
        await this.scanAddressForDeposits(addressInfo);
        
        // Pequeña pausa entre direcciones para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error('❌ Error escaneando depósitos:', error);
    }
  }

  private async scanAddressForDeposits(addressInfo: any): Promise<void> {
    const { address, crypto_id, user_id, id: address_id } = addressInfo;
    
    try {
      let transactions: BSCTransaction[] = [];

      if (crypto_id === 'bnb') {
        // Escanear BNB nativo
        transactions = await this.getBNBTransactions(address);
      } else {
        // Escanear tokens ERC-20 (USDT, PABLEX, etc.)
        const contractAddress = this.TOKEN_CONTRACTS[crypto_id as keyof typeof this.TOKEN_CONTRACTS];
        if (contractAddress && contractAddress !== 'BNB') {
          transactions = await this.getTokenTransactions(address, contractAddress);
        }
      }

      // Procesar transacciones encontradas
      if (transactions.length > 0) {
        console.log(`🔍 Encontradas ${transactions.length} transacciones para ${address} (${crypto_id.toUpperCase()})`);
      }
      
      for (const tx of transactions) {
        await this.processTransaction(tx, user_id, crypto_id, address_id, address);
      }

    } catch (error) {
      console.error(`❌ Error escaneando dirección ${address}:`, error);
    }
  }

  private async getBNBTransactions(address: string): Promise<BSCTransaction[]> {
    try {
      // ✅ USAR TU API KEY REAL BSC/ETHERSCAN
      const apiKey = process.env.BSCSCAN_API_KEY;
      
      if (!apiKey) {
        console.error('❌ FALTA API KEY: BSCSCAN_API_KEY no configurada');
        console.log('ℹ️  Configura tu API key real para detección automática');
        return [];
      }

      console.log(`🔍 Consultando Etherscan API V2 para BSC ${address} con API key: ${apiKey.substring(0, 8)}...`);
      
      // ✅ USAR ETHERSCAN API V2 CON TU NUEVA KEY
      const response = await axios.get(`https://api.etherscan.io/v2/api`, {
        params: {
          chainid: 56, // BSC Chain ID
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: Math.max(0, this.lastScannedBlock - this.MAX_BLOCKS_TO_SCAN),
          endblock: 'latest',
          page: 1,
          offset: 10,
          sort: 'desc',
          apikey: apiKey
        },
        timeout: 10000
      });

      console.log(`📡 BSCScan respuesta status: ${response.data?.status}, mensaje: ${response.data?.message}`);

      if (response.data?.status === '1' && Array.isArray(response.data.result)) {
        const validTxs = response.data.result
          .filter((tx: any) => tx.to?.toLowerCase() === address.toLowerCase())
          .filter((tx: any) => parseFloat(tx.value) > 0)
          .map((tx: any) => ({
            hash: tx.hash,
            to: tx.to,
            from: tx.from,
            value: tx.value
          }));
        
        console.log(`✅ Encontradas ${validTxs.length} transacciones BNB válidas para ${address}`);
        return validTxs;
      }

      if (response.data?.status === '0') {
        console.error(`❌ BSCScan ERROR: ${response.data?.message || 'Error desconocido'}`);
        console.log(`ℹ️  SOLUCIÓN TEMPORAL: Usa procesamiento manual hasta que se active la API`);
        console.log(`ℹ️  Para procesar depósito manualmente, proporciona el hash de transacción`);
      }

      return [];
    } catch (error: any) {
      console.error(`❌ ERROR DETALLADO consultando BNB para ${address}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    }
  }

  private async getTokenTransactions(address: string, contractAddress: string): Promise<BSCTransaction[]> {
    try {
      // ✅ USAR TU API KEY REAL BSC/ETHERSCAN
      const apiKey = process.env.BSCSCAN_API_KEY;
      
      if (!apiKey) {
        console.error('❌ FALTA API KEY: BSCSCAN_API_KEY no configurada');
        console.log('ℹ️  Configura tu API key real para detección automática');
        return [];
      }

      console.log(`🔍 Consultando Etherscan API V2 tokens para BSC ${address}, contrato: ${contractAddress}`);
      console.log(`🔑 Usando API key: ${apiKey.substring(0, 8)}...`);
      
      // ✅ USAR ETHERSCAN API V2 CON TU NUEVA KEY
      const response = await axios.get(`https://api.etherscan.io/v2/api`, {
        params: {
          chainid: 56, // BSC Chain ID
          module: 'account',
          action: 'tokentx',
          contractaddress: contractAddress,
          address: address,
          startblock: Math.max(0, this.lastScannedBlock - this.MAX_BLOCKS_TO_SCAN),
          endblock: 'latest',
          page: 1,
          offset: 10,
          sort: 'desc',
          apikey: apiKey
        },
        timeout: 10000
      });

      console.log(`📡 BSCScan TOKEN respuesta status: ${response.data?.status}, mensaje: ${response.data?.message}`);

      if (response.data?.status === '1' && Array.isArray(response.data.result)) {
        const validTxs = response.data.result
          .filter((tx: any) => tx.to?.toLowerCase() === address.toLowerCase())
          .filter((tx: any) => parseFloat(tx.value) > 0)
          .map((tx: any) => ({
            hash: tx.hash,
            to: tx.to,
            from: tx.from,
            value: tx.value,
            contractAddress: tx.contractAddress,
            tokenSymbol: tx.tokenSymbol,
            tokenName: tx.tokenName,
            tokenDecimal: tx.tokenDecimal
          }));
        
        console.log(`✅ Encontradas ${validTxs.length} transacciones TOKEN válidas para ${address}`);
        return validTxs;
      }

      if (response.data?.status === '0') {
        console.error(`❌ BSCScan TOKEN ERROR: ${response.data?.message || 'Error desconocido'}`);
        console.log(`ℹ️  SOLUCIÓN TEMPORAL: Usa procesamiento manual hasta que se active la API`);
        console.log(`ℹ️  Para procesar depósito manualmente, proporciona el hash de transacción`);
      }

      return [];
    } catch (error: any) {
      console.error(`❌ ERROR DETALLADO consultando tokens para ${address}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        contractAddress
      });
      return [];
    }
  }

  private async processTransaction(
    tx: BSCTransaction, 
    userId: string, 
    cryptoId: string, 
    addressId: string, 
    toAddress: string
  ): Promise<void> {
    try {
      // Verificar si ya procesamos esta transacción
      const existingDeposit = await storage.getDepositByTxHash(tx.hash);
      if (existingDeposit) {
        // Verificar si el balance fue actualizado correctamente
        const hasTransaction = await storage.getTransactionByHash(tx.hash);
        if (hasTransaction && hasTransaction.status === 'completed') {
          console.log(`⏭️ Transacción ${tx.hash} ya procesada completamente`);
          return; // Ya procesada completamente
        } else {
          console.log(`🔄 Depósito ${tx.hash} registrado pero balance no actualizado - completando proceso...`);
          // Solo actualizar balance, no crear nuevo depósito
        }
      }

      // Calcular monto en formato decimal correcto
      let amount = '0';
      if (cryptoId === 'bnb') {
        // BNB usa 18 decimales
        amount = (parseFloat(tx.value) / Math.pow(10, 18)).toString();
      } else if (tx.tokenDecimal) {
        // Usar decimales del token
        amount = (parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))).toString();
      } else {
        // Por defecto 18 decimales
        amount = (parseFloat(tx.value) / Math.pow(10, 18)).toString();
      }

      // Filtrar depósitos muy pequeños (polvo)
      if (parseFloat(amount) < 0.000001) {
        return;
      }

      console.log(`💰 NUEVO DEPÓSITO DETECTADO:`);
      console.log(`   Hash: ${tx.hash}`);
      console.log(`   Usuario: ${userId}`);
      console.log(`   Token: ${cryptoId.toUpperCase()}`);
      console.log(`   Cantidad: ${amount}`);
      console.log(`   Dirección: ${toAddress}`);

      // Solo registrar depósito si no existe
      if (!existingDeposit) {
        await storage.createBlockchainDeposit({
          userId,
          cryptoId,
          addressId,
          txHash: tx.hash,
          fromAddress: tx.from,
          toAddress: toAddress,
          amount,
          blockNumber: 0, // BSC API no siempre retorna block number
          confirmations: 6, // Asumimos confirmado si aparece en la API
          status: 'confirmed'
        });
      }

      // Solo crear transacción si no existe
      const existingTransaction = await storage.getTransactionByHash(tx.hash);
      if (!existingTransaction) {
        await storage.createTransaction({
          userId,
          type: 'deposit',
          status: 'completed',
          fromCryptoId: cryptoId,
          toCryptoId: cryptoId,
          fromAmount: amount,
          toAmount: amount,
          price: '1.0',
          commission: '0',
          commissionRate: '0',
          txHash: tx.hash
        });
      }

      // Actualizar balance del usuario (siempre se ejecuta)
      console.log(`🔧 ACTUALIZANDO BALANCE: ${amount} ${cryptoId.toUpperCase()} para usuario ${userId}`);
      await storage.updateUserBalance(userId, cryptoId, parseFloat(amount));
      console.log(`✅ BALANCE ACTUALIZADO EXITOSAMENTE`);

      console.log(`✅ Depósito procesado automáticamente: ${amount} ${cryptoId.toUpperCase()}`);

    } catch (error) {
      console.error(`❌ Error procesando transacción ${tx.hash}:`, error);
    }
  }
}

export const depositMonitor = new DepositMonitor();