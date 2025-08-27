import express from "express";
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000');

// Middleware básico
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// API básica para que la app funcione
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v2.1-LOCAL' });
});

// Mock de autenticación - siempre devuelve un usuario demo
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    success: true, 
    user: { 
      id: 'demo-user', 
      username: 'Demo User',
      firstName: 'Demo'
    } 
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ 
    success: true, 
    user: { 
      id: 'demo-user', 
      username: req.body.username,
      firstName: req.body.firstName
    } 
  });
});

// Mock de datos crypto
app.get('/api/portfolio', (req, res) => {
  res.json([
    { id: '1', symbol: 'BTC', name: 'Bitcoin', balance: 0.001, value: 43.50, change: '+2.5%' },
    { id: '2', symbol: 'ETH', name: 'Ethereum', balance: 0.05, value: 125.30, change: '+1.8%' },
    { id: '3', symbol: 'BNB', name: 'BNB', balance: 1.2, value: 720.50, change: '+3.2%' }
  ]);
});

app.get('/api/cryptocurrencies', (req, res) => {
  res.json([
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 43500, change: '+2.5%' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2506, change: '+1.8%' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 600.42, change: '+3.2%' }
  ]);
});

// Servir la aplicación React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Iniciar servidor
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ PablexExchange corriendo en:`);
  console.log(`   - Local: http://localhost:${port}`);
  console.log(`   - Red: http://10.162.156.42:${port}`);
  console.log('🚀 Aplicación lista para usar desde cualquier dispositivo en la red!');
});
