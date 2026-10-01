
import { AppError } from "../../types";

const LOG_STORAGE_KEY = 'legisai_debug_logs';
const MAX_LOGS = 50;

export class ErrorService {
  static saveLog(error: AppError) {
    try {
      const logs = this.getLogs();
      
      // Enriquecer log con telemetría del entorno
      const enrichedError = {
        ...error,
        environment: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform
        }
      };

      logs.unshift(enrichedError);
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
      
      // En producción, aquí se enviaría a Sentry o un endpoint de monitoreo
      console.error("[LegisAI Debug]", enrichedError);
    } catch (e) {
      console.error("Critical: Could not save error log", e);
    }
  }

  static getLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  static formatError(err: any, component: AppError['component']): AppError {
    const timestamp = new Date().toISOString();
    
    // Si ya es un AppError, devolverlo
    if (err && err.timestamp) return err;

    return {
      code: err.code || 'SYS_UNKNOWN_EXCEPTION',
      message: err.message || 'Error inesperado en el motor de procesamiento.',
      suggestion: 'Intente refrescar la plataforma o verifique su conexión a la red de despacho.',
      component: component,
      timestamp,
      technicalInfo: err.stack || JSON.stringify(err)
    };
  }

  static clearLogs() {
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
}
