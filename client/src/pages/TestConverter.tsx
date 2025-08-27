import { useState } from "react";

export default function TestConverter() {
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState("");

  const handleClick = () => {
    setMessage("✅ BOTÓN REACT TEST FUNCIONANDO - Convertidor cargado correctamente");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-8 text-center">
          💱 TEST Convertidor React
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad USDT
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="5"
              />
            </div>
            
            <button
              onClick={handleClick}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              style={{ zIndex: 9999, position: 'relative' }}
            >
              🔄 TEST Convertir Ahora
            </button>
            
            {message && (
              <div className="p-4 bg-green-800 text-green-200 rounded-lg text-center">
                {message}
              </div>
            )}
            
            <div className="text-sm text-gray-400 text-center">
              Si ves este formulario, el routing React funciona correctamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}