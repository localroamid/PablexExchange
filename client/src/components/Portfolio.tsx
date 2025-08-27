import React from "react";

// Componentes UI estilo Binance
const Card = ({ children, className }: any) => (
  <div className={`bg-[#1e2329] border border-[#2b3139] rounded-sm ${className || ""}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: any) => (
  <div className="p-4 pb-0 border-b border-[#2b3139]">{children}</div>
);

const CardTitle = ({ children, className }: any) => (
  <h3 className={`text-sm font-medium text-[#eaecef] ${className || ""}`}>{children}</h3>
);

const CardContent = ({ children, className }: any) => (
  <div className={`p-0 ${className || ""}`}>{children}</div>
);

export default function Portfolio() {
  // Usar datos mock estilo Binance
  const portfolioData = [
    { symbol: 'BTC', name: 'Bitcoin', balance: 0.001, value: 43.50, change: '+2.5%', changeValue: 2.5 },
    { symbol: 'ETH', name: 'Ethereum', balance: 0.05, value: 125.30, change: '+1.8%', changeValue: 1.8 },
    { symbol: 'BNB', name: 'BNB', balance: 1.2, value: 720.50, change: '+3.2%', changeValue: 3.2 },
    { symbol: 'USDT', name: 'Tether', balance: 150.0, value: 150.0, change: '0.0%', changeValue: 0 }
  ];

  const totalBalance = portfolioData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {/* Balance Total Estilo Binance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[#848e9c] text-sm">Total Balance</p>
              <p className="text-[#eaecef] text-2xl font-semibold">${totalBalance.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[#848e9c] text-sm">24h Change</p>
              <p className="text-[#0ecb81] text-lg font-medium">+$12.45 (+2.1%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Assets Estilo Binance */}
      <Card>
        <CardHeader>
          <CardTitle>Spot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2b3139]">
                  <th className="text-left py-3 px-4 text-[#848e9c] text-xs font-medium">Coin</th>
                  <th className="text-right py-3 px-4 text-[#848e9c] text-xs font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-[#848e9c] text-xs font-medium">Available</th>
                  <th className="text-right py-3 px-4 text-[#848e9c] text-xs font-medium">USD Value</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.map((item) => (
                  <tr key={item.symbol} className="border-b border-[#2b3139] hover:bg-[#2b3139] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#f0b90b] rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">{item.symbol[0]}</span>
                        </div>
                        <div>
                          <p className="text-[#eaecef] text-sm font-medium">{item.symbol}</p>
                          <p className="text-[#848e9c] text-xs">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <p className="text-[#eaecef] text-sm">{item.balance}</p>
                    </td>
                    <td className="text-right py-3 px-4">
                      <p className="text-[#eaecef] text-sm">{item.balance}</p>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div>
                        <p className="text-[#eaecef] text-sm font-medium">${item.value.toFixed(2)}</p>
                        <p className={`text-xs ${item.changeValue >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                          {item.change}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
