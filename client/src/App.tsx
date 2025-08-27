import React, { useState } from 'react';
import { Router, Route, useLocation, Link } from 'wouter';
import { useAuth } from './hooks/useAuth';
import Portfolio from './components/Portfolio';
import TradingPage from './pages/TradingPage';
import ConverterPage from './pages/ConverterPage';
import WithdrawPage from './pages/WithdrawPage';
import SimpleHistory from './pages/SimpleHistory';

// 📱 COMPONENTE DE LOGIN MÓVIL
function BinanceLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { username, password }
        : { username, password, email, firstName };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ ' + (isLogin ? 'Login exitoso!' : 'Cuenta creada!') + ' Redirigiendo...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage(`❌ ${data.error || 'Error'}`);
      }
    } catch (error) {
      setMessage('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white flex items-center justify-center p-5">
      <div className="bg-[#1e2329] p-8 rounded-lg w-full max-w-md border border-[#2b3139]">
        <div className="text-center mb-8">
          <h1 className="text-[#f0b90b] text-3xl font-bold mb-2">PablexExchange</h1>
          <p className="text-[#848e9c] text-sm">Professional Trading Platform</p>
        </div>

        <div className="flex mb-6 bg-[#2b3139] rounded p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-center rounded text-sm font-medium transition-all ${
              isLogin
                ? 'bg-[#f0b90b] text-black'
                : 'text-[#848e9c] hover:text-[#eaecef]'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-center rounded text-sm font-medium transition-all ${
              !isLogin
                ? 'bg-[#f0b90b] text-black'
                : 'text-[#848e9c] hover:text-[#eaecef]'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 bg-[#2b3139] border border-[#474d57] rounded text-white text-sm focus:border-[#f0b90b] focus:outline-none placeholder-[#848e9c]"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-[#2b3139] border border-[#474d57] rounded text-white text-sm focus:border-[#f0b90b] focus:outline-none placeholder-[#848e9c]"
                required
              />
            </>
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-[#2b3139] border border-[#474d57] rounded text-white text-sm focus:border-[#f0b90b] focus:outline-none placeholder-[#848e9c]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-[#2b3139] border border-[#474d57] rounded text-white text-sm focus:border-[#f0b90b] focus:outline-none placeholder-[#848e9c]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded font-medium text-sm transition-colors ${
              loading 
                ? 'bg-[#474d57] text-[#848e9c] cursor-not-allowed' 
                : 'bg-[#f0b90b] text-black hover:bg-[#fcd535]'
            }`}
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded text-center text-sm ${
            message.includes('✅') 
              ? 'bg-[#0ecb81]/10 border border-[#0ecb81] text-[#0ecb81]' 
              : 'bg-[#f6465d]/10 border border-[#f6465d] text-[#f6465d]'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// 📱 NAVEGACIÓN INFERIOR ESTILO BINANCE
function BinanceBottomNav() {
  const [location] = useLocation();
  
  const navItems = [
    { path: '/', icon: '💼', label: 'Spot' },
    { path: '/trading', icon: '📊', label: 'Markets' },
    { path: '/convertidor', icon: '🔄', label: 'Convert' },
    { path: '/retiro', icon: '💸', label: 'Withdraw' },
    { path: '/historial', icon: '📋', label: 'History' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1e2329] border-t border-[#2b3139] flex justify-around py-2 z-50">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path}>
          <a className={`flex flex-col items-center text-xs px-2 py-1 min-w-[60px] transition-colors ${
            location === item.path ? 'text-[#f0b90b]' : 'text-[#848e9c]'
          }`}>
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </a>
        </Link>
      ))}
    </nav>
  );
}

// 📱 HEADER ESTILO BINANCE
function BinanceHeader({ user }: { user: any }) {
  return (
    <div className="bg-[#1e2329] border-b border-[#2b3139] px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-[#f0b90b] text-lg font-bold">PablexExchange</h1>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-[#0ecb81] rounded-full"></div>
            <span className="text-[#0ecb81] text-xs font-medium">LIVE</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[#848e9c] text-xs">Total Balance</p>
            <p className="text-[#eaecef] text-sm font-semibold">$1,039.30</p>
          </div>
          <div className="text-right">
            <p className="text-[#848e9c] text-xs">Available</p>
            <p className="text-[#eaecef] text-sm font-semibold">$1,039.30</p>
          </div>
          <button className="bg-[#f6465d] text-white text-xs px-3 py-1 rounded">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// 📱 CONTENIDO PRINCIPAL ESTILO BINANCE
function BinanceAppContent({ user }: { user: any }) {
  return (
    <div className="min-h-screen bg-[#0b0e11] text-white overflow-x-hidden pb-16">
      <BinanceHeader user={user} />
      
      <div style={{padding: '12px'}}>
        <Route path="/">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-center">💼 Mi Billetera</h2>
            <Portfolio />
          </div>
        </Route>
        <Route path="/trading" component={TradingPage} />
        <Route path="/convertidor" component={ConverterPage} />
        <Route path="/retiros" component={WithdrawPage} />
        <Route path="/historial" component={SimpleHistory} />
      </div>
      
      <BinanceBottomNav />
    </div>
  );
}

// 📱 APP PRINCIPAL
export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚡</div>
          <p className="text-gray-400">Cargando Pablex...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        {user ? (
          <BinanceAppContent user={user} />
        ) : (
          <BinanceLogin />
        )}
      </div>
    </Router>
  );
}