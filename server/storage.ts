import {
  users,
  cryptocurrencies,
  portfolios,
  transactions,
  depositAddresses,
  type User,
  type NewUser,
  type Portfolio,
  type NewPortfolio,
  type Transaction,
  type NewTransaction,
} from "@shared/schema-sqlite";
import { db } from "./db";
import { eq, and, desc, sum } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: NewUser): Promise<User>;
  
  // Cryptocurrency operations
  getCryptocurrencies(): Promise<any[]>;
  getCryptocurrency(id: string): Promise<any | undefined>;
  createCryptocurrency(crypto: any): Promise<any>;
  
  // Portfolio operations
  getUserPortfolio(userId: string): Promise<Portfolio[]>;
  getPortfolioItem(userId: string, cryptoId: string): Promise<Portfolio | undefined>;
  upsertPortfolioItem(portfolio: NewPortfolio): Promise<Portfolio>;
  
  // Transaction operations
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: NewTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'failed'): Promise<Transaction>;
  
  // Real trading operations
  getPortfolioBalance(userId: string, cryptoId?: string): Promise<number | any[]>;
  updateBalance(userId: string, cryptoId: string, amount: number): Promise<void>;
  insertTransaction(transaction: any): Promise<any>;
  
  // Deposit monitoring operations
  getAllActiveDepositAddresses(): Promise<any[]>;
  getDepositByTxHash(txHash: string): Promise<any | undefined>;
  createBlockchainDeposit(deposit: any): Promise<any>;
  updateUserBalance(userId: string, cryptoId: string, amount: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: NewUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Cryptocurrency operations
  async getCryptocurrencies(): Promise<any[]> {
    return await db.select().from(cryptocurrencies).where(eq(cryptocurrencies.isActive, true));
  }

  async getCryptocurrency(id: string): Promise<any | undefined> {
    const [crypto] = await db.select().from(cryptocurrencies).where(eq(cryptocurrencies.id, id));
    return crypto;
  }

  async createCryptocurrency(crypto: any): Promise<any> {
    const [created] = await db.insert(cryptocurrencies).values(crypto).returning();
    return created;
  }

  // Portfolio operations
  async getUserPortfolio(userId: string): Promise<Portfolio[]> {
    return await db.select().from(portfolios).where(eq(portfolios.userId, userId));
  }

  async getPortfolioItem(userId: string, cryptoId: string): Promise<Portfolio | undefined> {
    const [item] = await db
      .select()
      .from(portfolios)
      .where(and(eq(portfolios.userId, userId), eq(portfolios.cryptoId, cryptoId)));
    return item;
  }

  async upsertPortfolioItem(portfolio: NewPortfolio): Promise<Portfolio> {
    const [item] = await db
      .insert(portfolios)
      .values(portfolio)
      .onConflictDoUpdate({
        target: [portfolios.userId, portfolios.cryptoId],
        set: {
          balance: portfolio.balance,
          updatedAt: new Date(),
        },
      })
      .returning();
    return item;
  }

  // Transaction operations
  async getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async createTransaction(transaction: NewTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }

  async updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'failed'): Promise<Transaction> {
    const [updated] = await db
      .update(transactions)
      .set({ status, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  // Commission operations - simplified
  async getTotalCommissions(): Promise<{ total: string }> {
    return { total: "0" };
  }

  async getMonthlyCommissions(): Promise<{ total: string }> {
    return { total: "0" };
  }

  // Deposit monitoring operations
  async getAllActiveDepositAddresses(): Promise<any[]> {
    return await db
      .select({
        id: depositAddresses.id,
        user_id: depositAddresses.userId,
        crypto_id: depositAddresses.cryptoId,
        address: depositAddresses.address
      })
      .from(depositAddresses)
      .where(eq(depositAddresses.isActive, true));
  }

  async getDepositByTxHash(txHash: string): Promise<any | undefined> {
    return undefined;
  }

  async getTransactionByHash(txHash: string): Promise<any | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.txHash, txHash));
    return transaction;
  }

  async createBlockchainDeposit(deposit: any): Promise<any> {
    return deposit;
  }

  async updateUserBalance(userId: string, cryptoId: string, amount: number): Promise<void> {
    console.log(`🔧 DEBUG updateUserBalance: userId=${userId}, cryptoId=${cryptoId}, amount=${amount}`);
    
    // Buscar portfolio existente
    const existingPortfolio = await this.getPortfolioItem(userId, cryptoId);
    console.log(`🔧 DEBUG existingPortfolio:`, existingPortfolio);
    
    if (existingPortfolio) {
      // Sumar al balance existente
      const currentBalance = parseFloat(existingPortfolio.balance);
      const newBalance = (currentBalance + amount).toString();
      console.log(`🔧 DEBUG updating balance: ${currentBalance} + ${amount} = ${newBalance}`);
      
      const result = await this.upsertPortfolioItem({
        userId,
        cryptoId,
        balance: newBalance
      });
      console.log(`🔧 DEBUG upsert result:`, result);
    } else {
      // Crear nuevo portfolio
      console.log(`🔧 DEBUG creating new portfolio with balance: ${amount}`);
      const result = await this.upsertPortfolioItem({
        userId,
        cryptoId,
        balance: amount.toString()
      });
      console.log(`🔧 DEBUG create result:`, result);
    }
    console.log(`✅ DEBUG updateUserBalance completed`);
  }

  // Real trading functions implementation
  async getPortfolioBalance(userId: string, cryptoId?: string): Promise<number | any[]> {
    if (cryptoId) {
      // Return specific balance as number
      const portfolio = await this.getPortfolioItem(userId, cryptoId);
      return portfolio ? parseFloat(portfolio.balance) : 0;
    }
    
    // Return all balances as array
    return this.getUserPortfolio(userId);
  }

  async updateBalance(userId: string, cryptoId: string, amount: number): Promise<void> {
    return this.updateUserBalance(userId, cryptoId, amount);
  }

  async insertTransaction(transaction: any): Promise<any> {
    return this.createTransaction({
      userId: transaction.userId,
      type: transaction.type as 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'real_swap' | 'conversion',
      toCryptoId: transaction.cryptoId || transaction.toCryptoId,
      fromCryptoId: transaction.fromCryptoId,
      amount: transaction.amount,
      status: transaction.status as 'pending' | 'completed' | 'failed',
      txHash: transaction.txHash,
      commissionRate: transaction.commission || "0",
      commission: transaction.commission || "0"
    });
  }

  // 🔍 BUSCAR USUARIO POR EMAIL
  async getUserByEmail(email: string): Promise<any | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  // 📱 CREAR PORTFOLIO INICIAL PARA NUEVO USUARIO
  async createInitialPortfolio(userId: string) {
    try {
      console.log('📱 [STORAGE] Creando portfolio inicial para usuario:', userId);
      
      // Lista de cryptos por defecto
      const defaultCryptos = [
        'bitcoin',
        'ethereum', 
        'pablex',
        'binancecoin',
        'usdt',
        'cardano',
        'solana',
        'dogecoin'
      ];

      // Crear entradas de portfolio con saldo 0
      const portfolioEntries = defaultCryptos.map(cryptoId => ({
        id: crypto.randomUUID(),
        userId,
        cryptoId,
        balance: '0.00000000',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.insert(portfolios).values(portfolioEntries);
      
      console.log('✅ [STORAGE] Portfolio inicial creado con', defaultCryptos.length, 'cryptos');
      return portfolioEntries;
    } catch (error) {
      console.error('❌ [STORAGE] Error creando portfolio inicial:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
