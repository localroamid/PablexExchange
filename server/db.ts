import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema-sqlite";
import { config } from 'dotenv';

// Cargar variables de entorno
config();

// Usar SQLite para desarrollo local
const sqlite = new Database('./local.db');
export const db = drizzle(sqlite, { schema });