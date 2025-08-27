import { bscWalletService } from './bscWalletService';
import { db } from '../db';
import { storage } from '../storage';
import { depositAddresses, blockchainDeposits, portfolios } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class BlockchainMonitor {
  private isRunning = false;
  private checkInterval = 30000; // 30 segundos
  private lastCheckedBlock = 0;

  constructor() {
    this.startMonitoring();
  }

  async startMonitoring() {
    if (this.isRunning) return;
    
    try {
      this.isRunning = true;
      console.log('🔍 Iniciando monitor de blockchain BSC...');
      
      // Obtener último bloque verificado con manejo de errores mejorado
      await this.initializeLastBlock();
      
      // Iniciar loop de monitoreo
      this.monitorLoop();
      
      console.log('✅ Monitor de blockchain BSC iniciado correctamente');
    } catch (error) {
      console.error('❌ Error crítico iniciando monitor de blockchain:', error);
      this.isRunning = false;
      // No relanzar el error para evitar que falle el deployment
      console.log('⚠️  El monitor se reiniciará automáticamente en 30 segundos...');
      
      // Intentar reiniciar después de un delay
      setTimeout(() => {
        console.log('🔄 Reintentando inicialización del monitor...');
        this.startMonitoring();
      }, 30000);
    }
  }

  private async initializeLastBlock() {
    try {
      // Obtener el bloque actual menos 100 para empezar
      const currentBlock = await bscWalletService['provider'].getBlockNumber();
      this.lastCheckedBlock = currentBlock - 100;
      console.log(`🔍 Iniciando desde bloque: ${this.lastCheckedBlock}`);
    } catch (error) {
      console.error('Error inicializando bloque:', error);
      this.lastCheckedBlock = 0;
    }
  }

  private async monitorLoop() {
    while (this.isRunning) {
      try {
        await this.checkForNewDeposits();
        await this.sleep(this.checkInterval);
      } catch (error) {
        console.error('Error en loop de monitoreo:', error);
        await this.sleep(5000); // Esperar 5 segundos si hay error
      }
    }
  }

  private async checkForNewDeposits() {
    try {
      // Obtener todas las direcciones activas
      const activeAddresses = await db
        .select()
        .from(depositAddresses)
        .where(eq(depositAddresses.isActive, true));

      console.log(`🔍 Monitoreando ${activeAddresses.length} direcciones...`);

      for (const addressRecord of activeAddresses) {
        await this.checkAddressForDeposits(addressRecord);
      }

      // Actualizar último bloque verificado
      const currentBlock = await bscWalletService['provider'].getBlockNumber();
      this.lastCheckedBlock = currentBlock;

    } catch (error) {
      console.error('Error verificando depósitos:', error);
    }
  }

  private async checkAddressForDeposits(addressRecord: any) {
    try {
      // Obtener transacciones nuevas para esta dirección
      const transactions = await bscWalletService.getTransactionsForAddress(
        addressRecord.address,
        this.lastCheckedBlock
      );

      for (const tx of transactions) {
        // Verificar si ya procesamos esta transacción
        const existing = await db
          .select()
          .from(blockchainDeposits)
          .where(eq(blockchainDeposits.txHash, tx.hash))
          .limit(1);

        if (existing.length === 0 && parseFloat(tx.value) > 0) {
          await this.processNewDeposit(addressRecord, tx);
        }
      }
    } catch (error) {
      console.error(`Error verificando dirección ${addressRecord.address}:`, error);
    }
  }

  private async processNewDeposit(addressRecord: any, transaction: any) {
    try {
      console.log(`💰 NUEVO DEPÓSITO DETECTADO: ${transaction.value} ${transaction.type} a ${addressRecord.address}`);

      // Registrar depósito en blockchain_deposits
      const [depositRecord] = await db
        .insert(blockchainDeposits)
        .values({
          userId: addressRecord.userId,
          cryptoId: addressRecord.cryptoId,
          addressId: addressRecord.id,
          txHash: transaction.hash,
          fromAddress: transaction.from,
          toAddress: transaction.to,
          amount: transaction.value,
          blockNumber: transaction.blockNumber.toString(),
          confirmations: 1,
          status: 'confirmed'
        })
        .returning();

      // Actualizar balance del usuario
      await this.updateUserBalance(
        addressRecord.userId,
        addressRecord.cryptoId,
        transaction.value
      );

      // Crear registro de transacción
      await storage.createTransaction({
        userId: addressRecord.userId,
        type: 'deposit',
        status: 'completed',
        fromCryptoId: addressRecord.cryptoId,
        toCryptoId: addressRecord.cryptoId,
        fromAmount: transaction.value,
        toAmount: transaction.value,
        price: '1.0',
        commission: '0',
        commissionRate: '0'
      });

      // Marcar como procesado
      await db
        .update(blockchainDeposits)
        .set({ 
          status: 'processed', 
          processedAt: new Date() 
        })
        .where(eq(blockchainDeposits.id, depositRecord.id));

      console.log(`✅ Depósito procesado: ${transaction.value} ${addressRecord.cryptoId} para usuario ${addressRecord.userId}`);

    } catch (error) {
      console.error('Error procesando depósito:', error);
    }
  }

  private async updateUserBalance(userId: string, cryptoId: string, amount: string) {
    try {
      // Buscar portfolio existente
      const [existingPortfolio] = await db
        .select()
        .from(portfolios)
        .where(
          and(
            eq(portfolios.userId, userId),
            eq(portfolios.cryptoId, cryptoId)
          )
        )
        .limit(1);

      if (existingPortfolio) {
        // Actualizar balance existente
        const newBalance = (parseFloat(existingPortfolio.balance) + parseFloat(amount)).toString();
        
        await db
          .update(portfolios)
          .set({ 
            balance: newBalance,
            updatedAt: new Date()
          })
          .where(eq(portfolios.id, existingPortfolio.id));
      } else {
        // Crear nuevo portfolio
        await db
          .insert(portfolios)
          .values({
            userId: userId,
            cryptoId: cryptoId,
            balance: amount
          });
      }

      console.log(`💰 Balance actualizado: ${amount} ${cryptoId} para usuario ${userId}`);
    } catch (error) {
      console.error('Error actualizando balance:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️ Monitor de blockchain detenido');
  }
}

// Exportar instancia única
export const blockchainMonitor = new BlockchainMonitor();