// Configuración de entorno para la app
export const environment = {
  production: true,
  // URL pública de ngrok para acceso global
  apiUrl: 'https://5b019b5f87ea.ngrok-free.app'
};

// Función para detectar si estamos en móvil o web
export function getApiBaseUrl(): string {
  // Si estamos en Capacitor (app móvil), usar la URL configurada
  if ((window as any).Capacitor) {
    return environment.apiUrl;
  }
  
  // Si estamos en web, usar URL relativa
  return '';
}