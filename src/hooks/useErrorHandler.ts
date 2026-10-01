
import { useState, useCallback } from 'react';
import { AppError } from '../types';
import { ErrorService } from '../services/error/ErrorService';

export const useErrorHandler = (componentName: AppError['component']) => {
  const [lastError, setLastError] = useState<AppError | null>(null);

  const reportError = useCallback((error: any) => {
    const formatted = error.timestamp 
      ? (error as AppError) 
      : ErrorService.formatError(error, componentName);
    
    ErrorService.saveLog(formatted);
    setLastError(formatted);
    return formatted;
  }, [componentName]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    reportError,
    clearError
  };
};
