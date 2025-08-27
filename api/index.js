// API serverless para Vercel
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Datos simulados para la demo
const portfolioData = [
  { symbol: 'BTC', name: 'Bitcoin', balance: 0.001, value: 43.50, change: '+2.5%', changeValue: 2.5 },
  { symbol: 'ETH', name: 'Ethereum', balance: 0.05, value: 125.30, change: '+1.8%', changeValue: 1.8 },
  { symbol: 'BNB', name: 'Binance Coin', balance: 2.5, value: 850.75, change: '-0.5%', changeValue: -0.5 },
  { symbol: 'ADA', name: 'Cardano', balance: 100, value: 45.20, change: '+3.2%', changeValue: 3.2 },
  { symbol: 'SOL', name: 'Solana', balance: 5, value: 520.15, change: '+4.1%', changeValue: 4.1 }
];

// Rutas API
app.get('/api/portfolio', (req, res) => {
  res.json({
    success: true,
    data: portfolioData,
    totalBalance: portfolioData.reduce((sum, item) => sum + item.value, 0)
  });
});

app.get('/api/prices', (req, res) => {
  res.json({
    success: true,
    data: {
      BTC: { price: 43500, change: 2.5 },
      ETH: { price: 2506, change: 1.8 },
      BNB: { price: 340.3, change: -0.5 },
      ADA: { price: 0.452, change: 3.2 },
      SOL: { price: 104.03, change: 4.1 }
    }
  });
});

app.get('/api/trades', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, pair: 'BTC/USDT', side: 'buy', amount: 0.001, price: 43500, time: new Date().toISOString() },
      { id: 2, pair: 'ETH/USDT', side: 'sell', amount: 0.05, price: 2506, time: new Date().toISOString() }
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PablexExchange API is running!',
    timestamp: new Date().toISOString()
  });
});

// Ruta por defecto
app.get('/', (req, res) => {
  res.json({ 
    message: 'PablexExchange API',
    version: '2.1.0',
    endpoints: ['/api/portfolio', '/api/prices', '/api/trades', '/api/health']
  });
});

export default app;
