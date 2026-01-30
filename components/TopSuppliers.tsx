import React from 'react';
import type { Supplier } from '../types';

interface TopSuppliersProps {
  suppliers: Supplier[];
  debtReduction?: { [key: string]: number };
}

export const TopSuppliers: React.FC<TopSuppliersProps> = ({ suppliers, debtReduction }) => {
  const sortedSuppliers = [...suppliers].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col flex-grow">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Mejores Proveedores</h3>
      <ul className="flex-grow flex flex-col justify-around">
        {sortedSuppliers.map((supplier) => {
          const reduction = debtReduction?.[supplier.id] || 0;
          return (
            <li key={supplier.id} className="text-sm border-l-4 rounded-r-md px-3 py-1" style={{ borderColor: supplier.color }}>
              <div className="flex items-start">
                  <div className="flex-grow">
                      <p className="font-bold text-gray-800 truncate">{supplier.name}</p>
                      <div className="flex justify-between items-baseline mt-2">
                          <span className="text-xs text-gray-500">Deuda:</span>
                          <div className="flex items-baseline">
                            <span className="text-red-500 font-medium">
                                ${supplier.debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            {reduction > 0 && (
                                <span className="ml-2 text-green-600 font-semibold text-xs">
                                    (-${reduction.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                </span>
                            )}
                          </div>
                      </div>
                      <div className="flex justify-between items-baseline mt-1">
                          <span className="text-xs text-gray-500">Volumen Total:</span>
                          <span className="text-xs text-gray-600 font-medium">${supplier.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                  </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};