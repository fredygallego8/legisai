
import React, { useState } from 'react';
import { CreditCard, Loader2, Check } from 'lucide-react';

interface BoldPaymentButtonProps {
  amount: number;
  label: string;
}

const BoldPaymentButton: React.FC<BoldPaymentButtonProps> = ({ amount, label }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');

  const handlePayment = () => {
    setStatus('LOADING');
    
    // Simulating Bold.co Integration
    // In a real app, you'd use their SDK or redirect to a checkout URL
    setTimeout(() => {
      setStatus('SUCCESS');
      // Here you would normally wait for the webhook validation
    }, 1500);
  };

  return (
    <button
      onClick={handlePayment}
      disabled={status !== 'IDLE'}
      className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${
        status === 'IDLE' 
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100' 
          : status === 'LOADING'
          ? 'bg-slate-100 text-slate-400'
          : 'bg-emerald-100 text-emerald-600'
      }`}
    >
      {status === 'IDLE' && (
        <>
          <CreditCard className="w-5 h-5" />
          {label}
        </>
      )}
      {status === 'LOADING' && (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Procesando con Bold...
        </>
      )}
      {status === 'SUCCESS' && (
        <>
          <Check className="w-5 h-5" />
          ¡Suscripción Activada!
        </>
      )}
    </button>
  );
};

export default BoldPaymentButton;
