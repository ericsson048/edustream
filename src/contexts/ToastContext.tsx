import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Toast } from 'primereact/toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastRef = useRef<Toast>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const severity = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
    toastRef.current?.show({
      severity,
      summary: severity === 'success' ? 'Succes' : severity === 'error' ? 'Erreur' : 'Information',
      detail: message,
      life: 3200,
    });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast ref={toastRef} position="top-right" />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
