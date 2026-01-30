import React from 'react';
import type { Transaction } from '../types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Transacciones Recientes</h3>
      <div className="flex-grow overflow-y-auto -mr-2 pr-2" style={{ maxHeight: '300px' }}>
        <ul className="space-y-3">
          {transactions.slice(0, 10).map((tx: any) => (
            <li key={tx.id} className={`flex justify-between items-center text-sm p-3 rounded-lg border transition-all ${tx.approvalStatus === 'pending' ? 'pending-pulse border-red-200 bg-red-50/30' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${tx.approvalStatus === 'pending' ? 'bg-red-500 text-white' : 'bg-brand-accent/10 text-brand-accent'}`}>
                  {tx.approvalStatus === 'pending' ? (
                    <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 6v1m0-10a9 9 0 110 18 9 9 0 010-18z" /></svg>
                  )}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    {tx.approvalStatus === 'pending' && (
                      <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">PENDIENTE</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{tx.timestamp}</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right text-xs text-gray-500">
                <p>{tx.productCount} {tx.productCount === 1 ? 'artículo' : 'artículos'}</p>
                <p>{tx.supplierCount} {tx.supplierCount === 1 ? 'proveedor' : 'proveedores'}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};