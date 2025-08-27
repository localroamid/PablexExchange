import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { db } from '../db';
import { depositAddresses, portfolios, cryptocurrencies } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Servicio para gestionar wallets BSC individuales por usuario
 * Cada usuario tiene su propia wallet BSC para depósitos y retiros
 */
export class UserWalletService {
  private encryptionKey: string;

  constructor() {
    // Clave de encriptación para las claves privadas
    // En producción esto debería venir de variables de entorno seguras
    this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Genera una nueva wallet BSC para un usuario y cryptocurrency específica
   */
  async createUserWallet(userId: string, cryptoId: string): Promise<{
    address: string;
    privateKey: string;
    encryptedPrivateKey: string;
  }> {
    console.log(`🔐 Generando nueva wallet BSC para usuario ${userId}, crypto: ${cryptoId}`);

    try {
      // Generar wallet aleatoria
      const wallet = ethers.Wallet.createRandom();
      const address = wallet.address;
      const privateKey = wallet.privateKey;

      // Encriptar clave privada
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey);

      // Guardar en base de datos
      await db.insert(depositAddresses).values({
        userId: userId,
        cryptoId: cryptoId.toLowerCase(),
        address: address,
        privateKey: encryptedPrivateKey,
        derivationPath: null, // No usamos derivation path para wallets aleatorias
        isActive: true
      });

      // Inicializar balance en 0 para este usuario y crypto
      await this.initializeUserBalance(userId, cryptoId);

      console.log(`✅ Wallet creada exitosamente: ${address}`);
      
      return {
        address,
        privateKey, // Solo para retorno inmediato, no se guarda sin encriptar
        encryptedPrivateKey
      };

    } catch (error: any) {
      console.error(`❌ Error creando wallet para usuario ${userId}:`, error);
      throw new Error(`Failed to create wallet: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Obtiene la wallet del usuario para una cryptocurrency específica
   */
  async getUserWallet(userId: string, cryptoId: string): Promise<{
    address: string;
    privateKey: string;
  } | null> {
    try {
      const [wallet] = await db
        .select()
        .from(depositAddresses)
        .where(and(
          eq(depositAddresses.userId, userId),
          eq(depositAddresses.cryptoId, cryptoId.toLowerCase()),
          eq(depositAddresses.isActive, true)
        ));

      if (!wallet) {
        return null;
      }

      const decryptedPrivateKey = this.decryptPrivateKey(wallet.privateKey);

      return {
        address: wallet.address,
        privateKey: decryptedPrivateKey
      };

    } catch (error) {
      console.error(`❌ Error obteniendo wallet para usuario ${userId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene o crea la wallet del usuario para una cryptocurrency
   */
  async getOrCreateUserWallet(userId: string, cryptoId: string): Promise<{
    address: string;
    privateKey: string;
  }> {
    // Primero intentar obtener wallet existente
    let wallet = await this.getUserWallet(userId, cryptoId);
    
    if (!wallet) {
      console.log(`📝 No existe wallet para usuario ${userId}, crypto: ${cryptoId}. Creando nueva...`);
      const newWallet = await this.createUserWallet(userId, cryptoId);
      wallet = {
        address: newWallet.address,
        privateKey: newWallet.privateKey
      };
    }

    return wallet;
  }

  /**
   * Obtiene todas las direcciones de wallet para un usuario
   */
  async getAllUserWallets(userId: string): Promise<Array<{
    cryptoId: string;
    address: string;
    isActive: boolean;
    createdAt: Date;
  }>> {
    try {
      const wallets = await db
        .select({
          cryptoId: depositAddresses.cryptoId,
          address: depositAddresses.address,
          isActive: depositAddresses.isActive,
          createdAt: depositAddresses.createdAt
        })
        .from(depositAddresses)
        .where(eq(depositAddresses.userId, userId));

      return wallets.map(w => ({
        ...w,
        isActive: w.isActive ?? false,
        createdAt: w.createdAt || new Date()
      }));

    } catch (error) {
      console.error(`❌ Error obteniendo wallets del usuario ${userId}:`, error);
      return [];
    }
  }

  /**
   * Inicializa el balance para un usuario y cryptocurrency
   */
  private async initializeUserBalance(userId: string, cryptoId: string): Promise<void> {
    try {
      // Verificar si ya existe el balance
      const [existingBalance] = await db
        .select()
        .from(portfolios)
        .where(and(
          eq(portfolios.userId, userId),
          eq(portfolios.cryptoId, cryptoId.toLowerCase())
        ));

      if (!existingBalance) {
        // Crear balance inicial en 0
        await db.insert(portfolios).values({
          userId: userId,
          cryptoId: cryptoId.toLowerCase(),
          balance: "0"
        });
      }

    } catch (error) {
      console.error(`❌ Error inicializando balance:`, error);
      // No hacer throw aquí porque es función auxiliar
    }
  }

  /**
   * Encripta una clave privada
   */
  private encryptPrivateKey(privateKey: string): string {
    const iv = crypto.randomBytes(16); // IV aleatorio para mayor seguridad
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'utf8').slice(0, 32), iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Prefijo IV a los datos encriptados
  }

  /**
   * Desencripta una clave privada
   */
  decryptPrivateKey(encryptedPrivateKey: string): string {
    // NUEVO: Detectar y manejar claves privadas directas (no encriptadas)
    // Formato válido de clave privada: 0x seguido de 64 caracteres hexadecimales
    const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;
    if (privateKeyRegex.test(encryptedPrivateKey)) {
      console.log('🔍 Detected direct private key format, using directly');
      return encryptedPrivateKey;
    }

    // Formato viejo sin encriptar (64 caracteres sin 0x)
    if (encryptedPrivateKey.length === 64 && /^[a-fA-F0-9]{64}$/.test(encryptedPrivateKey)) {
      console.log('🔍 Detected old unencrypted private key format, adding 0x prefix');
      return '0x' + encryptedPrivateKey;
    }

    // Intentar desencriptar formato encriptado normal
    const parts = encryptedPrivateKey.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted private key format');
    }
    
    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'utf8').slice(0, 32), iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('❌ Error decrypting private key:', error);
      throw new Error('Failed to decrypt private key');
    }
  }

  /**
   * Obtiene la clave privada desencriptada para una dirección específica
   */
  async getDecryptedPrivateKey(addressId: string): Promise<string> {
    try {
      const [address] = await db
        .select()
        .from(depositAddresses)
        .where(eq(depositAddresses.id, addressId))
        .limit(1);

      if (!address) {
        throw new Error('Dirección no encontrada');
      }

      return this.decryptPrivateKey(address.privateKey);
    } catch (error: any) {
      console.error(`❌ Error obteniendo clave privada para dirección ${addressId}:`, error);
      throw new Error(`Failed to get private key: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Verifica si una dirección es válida
   */
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Verifica el balance BSC real de una dirección
   */
  async getRealBalance(address: string, tokenAddress?: string): Promise<string> {
    try {
      // TODO: Implementar verificación real de balance en BSC
      // Por ahora devuelve "0" como placeholder
      return "0";
    } catch (error) {
      console.error(`❌ Error obteniendo balance real:`, error);
      return "0";
    }
  }
}

export const userWalletService = new UserWalletService();