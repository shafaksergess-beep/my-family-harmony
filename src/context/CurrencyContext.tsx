import React, { createContext, useContext, useState, useEffect } from 'react';

export type Currency = 'XAF' | 'USD' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convert: (amount: number) => number;
  formatAmount: (amount: number) => string;
}

const EXCHANGE_RATES: Record<Currency, number> = {
  XAF: 1,
  USD: 610,
  EUR: 655.957,
  GBP: 770,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  XAF: 'FCFA',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('app-currency');
    return (saved as Currency) || 'XAF';
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('app-currency', c);
  };

  const convert = (amount: number) => {
    if (currency === 'XAF') return amount;
    return amount / EXCHANGE_RATES[currency];
  };

  const formatAmount = (amount: number) => {
    const converted = convert(amount);
    const symbol = CURRENCY_SYMBOLS[currency];
    
    if (currency === 'XAF') {
      return `${Math.round(converted).toLocaleString()} ${symbol}`;
    }
    
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
