import React, { useState, useEffect, useMemo } from 'react';
import type { Product, CartItem } from '../types';
import { SearchIcon } from './IconComponents';

interface PaymentSimulatorProps {
  products: Product[];
  onSimulatePayment: (cart: CartItem[]) => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
}

export const PaymentSimulator: React.FC<PaymentSimulatorProps> = ({
  products,
  onSimulatePayment,
  cart,
  onAddToCart,
  onRemoveFromCart
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientView, setIsClientView] = useState(false);

  const handleSimulatePayment = () => {
    onSimulatePayment(cart);
    setShowSuccess(true);
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const subTotal = cart.reduce((total, item) => total + item.retailPrice * item.quantity, 0);
  const tax = subTotal * 0.08; // 8% Tax
  const cartTotal = subTotal + tax;

  const supplierPaymentBreakdown = useMemo(() => {
    if (cart.length === 0) return [];

    const breakdown = new Map<string, { name: string, amount: number }>();

    cart.forEach(item => {
      const supplierAmount = item.purchaseCost * item.quantity;
      const existing = breakdown.get(item.supplierId);
      if (existing) {
        breakdown.set(item.supplierId, { ...existing, amount: existing.amount + supplierAmount });
      } else {
        breakdown.set(item.supplierId, { name: item.supplierName, amount: supplierAmount });
      }
    });

    return Array.from(breakdown.values());
  }, [cart]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return products;
    }
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-1 text-gray-800">Terminal Punto de Venta</h2>
        <p className="text-gray-500 mb-6 text-sm">Seleccione productos para construir una orden.</p>

        <div className="relative mb-6">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos por nombre..."
            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            aria-label="Buscar productos"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 -mr-4" style={{ maxHeight: 'calc(100vh - 28rem)' }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => onAddToCart(product)}
              className="bg-white border border-gray-200 p-3 rounded-lg text-center transition-all duration-300 hover:shadow-xl hover:border-brand-accent hover:-translate-y-1 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 h-full w-1.5" style={{ backgroundColor: product.color }}></div>
              <div className="flex-grow flex items-center justify-center mb-2 p-2">
                <img src={product.imageUrl} alt={product.name} className="max-h-24 object-contain group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 h-10">{product.name}</p>
                <p className="text-lg font-bold text-brand-primary">${product.retailPrice.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-1 bg-white rounded-xl shadow-md flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Detalles de la Orden</h3>
          <button
            onClick={() => setIsClientView(!isClientView)}
            className="text-xs bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-full hover:bg-gray-300 transition-colors"
          >
            {isClientView ? 'Ver Vista Cajero' : 'Ver Factura Cliente'}
          </button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p className="text-gray-500">Tu carrito está vacío</p>
              <p className="text-xs text-gray-400 mt-1">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-md p-1 mr-4 flex-shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-500 font-bold">${item.retailPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onRemoveFromCart(item.id)} className="bg-gray-200 text-gray-700 h-7 w-7 flex items-center justify-center rounded-md font-bold hover:bg-gray-300 transition-colors" aria-label={`Quitar un ${item.name}`}>-</button>
                    <span className="font-bold w-5 text-center text-gray-800" aria-label={`Cantidad: ${item.quantity}`}>{item.quantity}</span>
                    <button onClick={() => onAddToCart(item)} className="bg-brand-accent text-white h-7 w-7 flex items-center justify-center rounded-md font-bold hover:bg-brand-accent-dark transition-colors" aria-label={`Agregar un ${item.name}`}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 space-y-4">
          <button
            onClick={handleSimulatePayment}
            disabled={cart.length === 0}
            className="w-full bg-brand-accent hover:bg-brand-accent-dark disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all text-base shadow-md hover:shadow-lg disabled:shadow-none"
          >
            Procesar Pago
          </button>
          {showSuccess && (
            <div className="text-center text-green-700 bg-green-100 p-2 rounded-md text-sm transition-opacity duration-300">
              ¡Simulación de pago exitosa!
            </div>
          )}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-800">${subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Impuesto (8%)</span>
                <span className="font-medium text-gray-800">${tax.toFixed(2)}</span>
              </div>
              {!isClientView && supplierPaymentBreakdown.length > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-2">Pagos a Proveedores</h4>
                  <div className="space-y-1">
                    {supplierPaymentBreakdown.map(sup => (
                      <div key={sup.name} className="flex justify-between text-xs text-gray-500">
                        <span className="truncate pr-2">{sup.name}</span>
                        <span className="font-medium text-gray-700">${sup.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-200 mt-2">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};