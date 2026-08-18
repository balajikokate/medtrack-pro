import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const current = queue[0] || null;

  const showToast = useCallback((message, type = 'success') => {
    setQueue((prev) => [...prev, { id: ++idCounter, message, type }]);
  }, []);

  function dismiss() {
    setQueue((prev) => prev.slice(1));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div className="absolute inset-0 bg-black/40" onClick={dismiss} />
          <div className="relative bg-surface rounded-xl shadow-xl p-lg max-w-sm w-full flex flex-col items-center gap-md text-center">
            <span
              className={`material-symbols-outlined text-[40px] ${
                current.type === 'error' ? 'text-error' : 'text-tertiary'
              }`}
            >
              {current.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <p className="font-body-md text-body-md text-on-surface">{current.message}</p>
            <button
              onClick={dismiss}
              className="bg-primary text-on-primary font-body-md py-sm px-lg rounded hover:bg-primary-container transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
