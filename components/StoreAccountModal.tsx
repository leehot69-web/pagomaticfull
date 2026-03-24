import React, { useMemo } from 'react';
import type { Store, StockDispatch, StorePayment, Product } from '../types';
import { DollarSignIcon, ActivityIcon } from './IconComponents';

interface StoreAccountModalProps {
    store: Store;
    dispatches: StockDispatch[];
    storePayments: StorePayment[];
    products: Product[];
    onClose: () => void;
}

export const StoreAccountModal: React.FC<StoreAccountModalProps> = ({
    store,
    dispatches,
    storePayments,
    products,
    onClose
}) => {
    // 1. Unificar Eventos en una Cronología Ledger
    const ledger = useMemo(() => {
        const events: any[] = [];

        // Añadir Despachos como Cargos
        dispatches.forEach(d => {
            if (d.status === 'cancelled' || d.approvalStatus === 'pending') return;
            
            // Valor de devoluciones para ajustar el cargo original si es necesario
            // Sin embargo, para un ledger tipo bancario, es mejor mostrar:
            // - Cargo Original
            // - Abono por Devolución (Credit)
            const returnedValue = (d.returns || []).reduce((acc, r) => {
                const item = d.items.find(i => i.productId === r.productId);
                return acc + (r.quantity * (item?.unitSupplyPrice || 0));
            }, 0);

            events.push({
                date: d.timestamp,
                type: 'DEBIT (Cargo)',
                reference: `DESP #${d.dispatchNumber}`,
                amount: d.totalAmount,
                isCharge: true,
                id: d.id,
                raw: d
            });

            if (returnedValue > 0) {
                events.push({
                    date: d.timestamp, // O usar la fecha de la última devolución
                    type: 'CREDIT (Devolución)',
                    reference: `DEV #${d.dispatchNumber}`,
                    amount: returnedValue,
                    isCharge: false,
                    id: `${d.id}-ret`,
                    raw: d.returns
                });
            }
        });

        // Añadir Pagos como Abonos
        storePayments.forEach(p => {
            if (p.status === 'cancelled' || p.approvalStatus === 'pending') return;
            events.push({
                date: p.date,
                type: `CREDIT (Abono ${p.method})`,
                reference: `REC #${p.reference || p.id.slice(-6).toUpperCase()}`,
                amount: p.amount,
                isCharge: false,
                id: p.id,
                raw: p
            });
        });

        // Ordenar Cronológicamente
        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [dispatches, storePayments]);

    // Calcular Saldo Acumulado (Running Balance)
    const ledgerWithBalance = useMemo(() => {
        let currentBalance = 0;
        return ledger.map(event => {
            if (event.isCharge) {
                currentBalance += event.amount;
            } else {
                currentBalance -= event.amount;
            }
            return { ...event, balance: currentBalance };
        });
    }, [ledger]);

    const totalDispatched = useMemo(() => ledger.filter(e => e.isCharge).reduce((acc, e) => acc + e.amount, 0), [ledger]);
    const totalPaid = useMemo(() => ledger.filter(e => !e.isCharge && !e.reference.startsWith('DEV')).reduce((acc, e) => acc + e.amount, 0), [ledger]);
    const totalReturned = useMemo(() => ledger.filter(e => !e.isCharge && e.reference.startsWith('DEV')).reduce((acc, e) => acc + e.amount, 0), [ledger]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end p-4">
            <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
                {/* Header Premium */}
                <div className="px-8 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                                <DollarSignIcon className="w-5 h-5" />
                            </span>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Estado de Cuenta 360</h2>
                        </div>
                        <p className="text-blue-100 font-medium opacity-90">{store.name} • {store.location}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors font-bold text-xl">✕</button>
                </div>

                {/* Resumen de KPIs */}
                <div className="grid grid-cols-4 gap-4 p-8 bg-gray-50 border-b border-gray-100">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Despachado</p>
                        <p className="text-xl font-black text-gray-800">${totalDispatched.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Abonos</p>
                        <p className="text-xl font-black text-green-600">${totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Devoluciones</p>
                        <p className="text-xl font-black text-orange-500">${totalReturned.toLocaleString()}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-2xl shadow-sm border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Saldo Actual</p>
                        <p className="text-2xl font-black text-indigo-700">${(totalDispatched - totalPaid - totalReturned).toLocaleString()}</p>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="flex-1 overflow-auto p-8 pt-4">
                    <table className="w-full border-separate border-spacing-y-2">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                                <th className="pb-4 px-4">Fecha</th>
                                <th className="pb-4 px-4">Descripción</th>
                                <th className="pb-4 px-4">Referencia</th>
                                <th className="pb-4 px-4 text-right">Cargo</th>
                                <th className="pb-4 px-4 text-right">Abono</th>
                                <th className="pb-4 px-4 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerWithBalance.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="text-gray-300 flex flex-col items-center gap-2">
                                            <ActivityIcon className="w-12 h-12 opacity-30" />
                                            <span className="font-bold text-sm">Sin movimientos registrados</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                ledgerWithBalance.map((event, idx) => (
                                    <tr key={event.id + idx} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-4 bg-white rounded-l-xl border-y border-l border-gray-100">
                                            <p className="text-xs font-bold text-gray-600">
                                                {new Date(event.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                            </p>
                                            <p className="text-[9px] text-gray-400">
                                                {new Date(event.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="py-4 px-4 bg-white border-y border-gray-100">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                event.isCharge 
                                                ? 'bg-blue-50 text-blue-700' 
                                                : event.reference.startsWith('DEV') ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'
                                            }`}>
                                                {event.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 bg-white border-y border-gray-100">
                                            <p className="text-xs font-black text-gray-800">{event.reference}</p>
                                        </td>
                                        <td className="py-4 px-4 bg-white border-y border-gray-100 text-right">
                                            {event.isCharge ? (
                                                <p className="text-sm font-black text-gray-800">${event.amount.toLocaleString()}</p>
                                            ) : '-'}
                                        </td>
                                        <td className="py-4 px-4 bg-white border-y border-gray-100 text-right">
                                            {!event.isCharge ? (
                                                <p className="text-sm font-black text-green-700">${event.amount.toLocaleString()}</p>
                                            ) : '-'}
                                        </td>
                                        <td className="py-4 px-4 bg-white rounded-r-xl border-y border-r border-gray-100 text-right">
                                            <p className={`text-sm font-black ${event.balance > 0.1 ? 'text-gray-900' : 'text-green-600'}`}>
                                                ${event.balance.toLocaleString()}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <p>Generado: {new Date().toLocaleString()}</p>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Cargos</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Pagos</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Devoluciones</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
