import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { depositMonitor } from "./services/depositMonitor";

// 🔑 Configurar clave privada principal del exchange Pablex
process.env.EXCHANGE_PRIVATE_KEY = process.env.EXCHANGE_PRIVATE_KEY || '0x6481382b5c87b783a355e7cef8dd80a4f19a32a600b9b2b327cb50967645eaa6';

const app = express();

// ✅ CORS configurado para Android APK
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 🔐 SISTEMA DE SESIONES PARA AUTENTICACIÓN - COMPATIBLE CON APK ANDROID
// Esto arregla el bug donde todos los usuarios ven la misma cuenta
// Environment variable validation for production deployment
const sessionSecret = process.env.SESSION_SECRET || 'pablex-session-secret-2025';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: SESSION_SECRET environment variable is not set in production!');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true, // true para crear sesión automáticamente
  cookie: {
    secure: false, // false para APK local y HTTPS
    httpOnly: false, // false para permitir acceso en APK
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días para APK
    sameSite: 'lax' // lax es mejor para APK cross-origin
  }
}));

console.log('🔐 Sistema de sesiones configurado correctamente');
console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔑 Session secret source: ${process.env.SESSION_SECRET ? 'environment variable' : 'default'}`);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, 'localhost', () => {
    console.log(`✅ Server successfully started on port ${port}`);
    console.log(`🌐 Server accessible at: http://localhost:${port}`);
    console.log(`🏥 Health check available at: http://localhost:${port}/api/health`);
    log(`serving on port ${port}`);
    
    // Iniciar monitor automático de depósitos con manejo mejorado de errores
    setTimeout(async () => {
      try {
        console.log('🔍 Iniciando monitor de depósitos...');
        await depositMonitor.start();
        console.log('✅ Monitor de depósitos iniciado correctamente');
      } catch (error) {
        console.error('❌ Error iniciando monitor de depósitos:', error);
        console.log('⚠️  La aplicación continuará funcionando sin el monitor automático');
        console.log('💡 Los depósitos se pueden procesar manualmente si es necesario');
        // No lanzar el error para evitar que falle el deployment
      }
    }, 1000); // Delay para permitir que el servidor se estabilice completamente
  });
})();
