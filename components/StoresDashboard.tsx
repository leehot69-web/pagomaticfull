import React, { useState, useMemo } from 'react';
import type { Store, StockDispatch, Product, StorePayment, ReturnReason } from '../types';
import { DollarSignIcon, UsersIcon, SearchIcon, ActivityIcon, StoreIcon, ClockIcon, TrashIcon } from './IconComponents';
import { useNotifications } from '../NotificationSystem';
import { PrintIcon, WhatsAppIcon, ViewIcon, ActionButtons, printDocument, shareViaWhatsApp, type DocumentData } from '../utils/shareUtils';
import { printThermal, smartPrint, getPrintButtonLabel, type PrinterSize } from '../utils/thermalPrinterUtils';

interface StoresDashboardProps {
    stores: Store[];
    dispatches: StockDispatch[];
    products: Product[];
    storePayments: StorePayment[];
    onAddStore: (data: any) => void;
    onUpdateStore: (id: string, updates: any) => void;
    onDeleteStore: (id: string) => void;
    onAddTerminal: (storeId: string, name: string) => void;
    onDeleteTerminal: (storeId: string, terminalId: string) => void;
    onAddStorePayment: (payment: StorePayment) => Promise<string>;
    onAnularStorePayment: (id: string) => void;
    onAnularDispatch: (id: string, isSiniestro?: boolean) => void;
    onReturnDispatch?: (id: string) => void;
    onPartialReturn?: (dispatchId: string, productId: string, qty: number, reason: ReturnReason) => void;
    externalStoreId?: string;
    isAdmin?: boolean;
    currentUser?: any;
    printerSize?: string;
    onIncrementDispatchPrintCount?: (id: string) => void;
    onIncrementStorePaymentPrintCount?: (id: string) => void;
}

export const StoresDashboard: React.FC<StoresDashboardProps> = ({
    stores = [], dispatches = [], products = [], storePayments = [],
    onAddStore, onUpdateStore, onDeleteStore, onAddTerminal, onDeleteTerminal, onAddStorePayment, onAnularStorePayment, onAnularDispatch, onReturnDispatch, onPartialReturn, externalStoreId,
    isAdmin = false, currentUser,
    printerSize = '80mm',
    onIncrementDispatchPrintCount,
    onIncrementStorePaymentPrintCount
}) => {
    const { notify, confirm } = useNotifications();
    const [viewMode, setViewMode] = useState<'list' | 'statement'>('list');
    const [activeStoreId, setActiveStoreId] = useState<string | null>(externalStoreId || null);

    React.useEffect(() => {
        if (externalStoreId) {
            setActiveStoreId(externalStoreId);
            setViewMode('statement');
        } else {
            setActiveStoreId(null);
            setViewMode('list');
        }
    }, [externalStoreId]);

    const activeStore = useMemo(() => stores.find(s => s.id === activeStoreId), [stores, activeStoreId]);

    // Modals
    const [showAbonoModal, setShowAbonoModal] = useState(false);
    const [showPaymentDetail, setShowPaymentDetail] = useState<StorePayment | null>(null);
    const [showDispatchDetail, setShowDispatchDetail] = useState<StockDispatch | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);

    // Form states
    const [abonoForm, setAbonoForm] = useState({ amount: '', reference: '', method: 'Efectivo', dispatchId: '' });
    const [editForm, setEditForm] = useState({ name: '', location: '', maxDebtLimit: 0, paymentTermDays: 15, allowsCredit: true });

    const handleConfirmAbono = async () => {
        if (!activeStore || !abonoForm.amount || !abonoForm.dispatchId) return;
        const amountNum = parseFloat(abonoForm.amount);
        if (isNaN(amountNum) || amountNum <= 0) return;

        const dispatch = dispatches.find(d => d.id === abonoForm.dispatchId);
        if (!dispatch) return;

        const paid = storePayments
            .filter(p => p.dispatchId === abonoForm.dispatchId && p.status !== 'cancelled')
            .reduce((sum, p) => sum + p.amount, 0);
        const pending = Math.max(0, dispatch.totalAmount - paid);

        if (amountNum > pending + 0.01) {
            notify(`ERROR: El monto ($${amountNum.toLocaleString()}) excede el saldo pendiente del folio ($${pending.toLocaleString()}).`, 'error');
            return;
        }

        try {
            const payment: StorePayment = {
                id: `sp-${Date.now()}`,
                storeId: activeStore.id,
                dispatchId: abonoForm.dispatchId,
                date: new Date().toISOString(),
                amount: amountNum,
                reference: abonoForm.reference,
                method: abonoForm.method,
                status: 'active',
                authorizedBy: isAdmin ? currentUser?.name : undefined
            };

            const paymentId = await onAddStorePayment(payment);
            setShowAbonoModal(false);
            setAbonoForm({ amount: '', reference: '', method: 'Efectivo', dispatchId: '' });
            notify('Abono registrado con éxito', 'success');

            if (await confirm({
                message: '¿Desea imprimir el recibo de abono?'
            })) {
                handlePrintThermal('payment', paymentId);
            }
        } catch (e) {
            notify('Error al registrar el abono', 'error');
        }
    };

    const handlePrintThermal = (type: 'dispatch' | 'payment', id: string) => {
        const docData = getDocData(type, id);
        if (docData) {
            smartPrint(docData, { size: printerSize as any }, () => {
                if (type === 'dispatch' && onIncrementDispatchPrintCount) onIncrementDispatchPrintCount(id);
                if (type === 'payment' && onIncrementStorePaymentPrintCount) onIncrementStorePaymentPrintCount(id);
            });
        }
    };

    const getDocData = (type: 'dispatch' | 'payment', id: string): DocumentData | null => {
        if (type === 'dispatch') {
            const d = dispatches.find(item => item.id === id);
            const s = stores.find(store => store.id === d?.storeId);
            if (!d || !s) return null;
            return {
                type: 'dispatch',
                id: d.id,
                reference: d.dispatchNumber,
                date: d.timestamp,
                amount: d.totalAmount,
                items: d.items.map(i => ({
                    name: products.find(p => p.id === i.productId)?.name || 'Producto',
                    quantity: i.quantity,
                    unitPrice: i.unitSupplyPrice
                })),
                storeName: s.name,
                storeAddress: s.location,
                generatedBy: currentUser?.name,
                authorizedBy: d.authorizedBy,
                dueDate: d.dueDate
            };
        } else {
            const p = storePayments.find(item => item.id === id);
            const s = stores.find(store => store.id === p?.storeId);
            if (!p || !s) return null;
            return {
                type: 'payment',
                id: p.id,
                reference: p.reference,
                date: p.date,
                amount: p.amount,
                storeName: s.name,
                method: p.method,
                concept: 'Abono a Cuenta',
                generatedBy: currentUser?.name,
                authorizedBy: p.authorizedBy
            };
        }
    };

    const handleItemReturn = (dispatchId: string, productId: string) => {
        const reason = (returnReason[`${dispatchId}-${productId}`] || 'good_condition') as ReturnReason;
        const qty = parseFloat(returnQty[`${dispatchId}-${productId}`]);

        if (isNaN(qty) || qty <= 0) {
            notify('Especifique una cantidad válida', 'warning');
            return;
        }

        if (onPartialReturn) {
            onPartialReturn(dispatchId, productId, qty, reason);
            notify('Devolución procesada correctamente', 'success');
        }
    };

    const [returnQty, setReturnQty] = useState<{ [key: string]: string }>({});
    const [returnReason, setReturnReason] = useState<{ [key: string]: string }>({});

    const renderPaymentDetail = () => {
        if (!showPaymentDetail) return null;
        const relatedDispatch = dispatches.find(d => d.id === showPaymentDetail.dispatchId);
        const dispatchHistory = relatedDispatch ? storePayments.filter(p => p.dispatchId === relatedDispatch.id && p.status !== 'cancelled') : [];
        const netDispatchAmount = relatedDispatch ? relatedDispatch.totalAmount - (relatedDispatch.returns || []).reduce((acc, r) => {
            const item = relatedDispatch.items.find(i => i.productId === r.productId);
            return acc + (r.quantity * (item?.unitSupplyPrice || 0));
        }, 0) : 0;

        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowPaymentDetail(null)}>
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-8 bg-brand-primary text-white flex justify-between items-center">
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-widest">Recibo de Abono</h4>
                            <p className="text-xs font-bold opacity-60">REF: {showPaymentDetail.reference}</p>
                        </div>
                        <button onClick={() => setShowPaymentDetail(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><ViewIcon className="w-6 h-6 rotate-45" /></button>
                    </div>
                    <div className="p-10 text-center space-y-6 flex-1 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto de este Abono</p>
                                <p className="text-5xl font-black text-emerald-600 tracking-tighter">${showPaymentDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>

                            {relatedDispatch && (
                                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-left space-y-4">
                                    <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase">Detalle del Despacho Linked</p>
                                        <p className="text-xs font-black text-indigo-900">Folio #{relatedDispatch.dispatchNumber}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Total Despacho (Neto)</p>
                                            <p className="text-lg font-black text-gray-800">${netDispatchAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Saldo Actual</p>
                                            <p className="text-lg font-black text-red-600">${(netDispatchAmount - dispatchHistory.reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <div className="space-y-1 mb-4 border-b border-indigo-100 pb-2 max-h-[100px] overflow-y-auto">
                                            {relatedDispatch.items.map((it, idx) => {
                                                const p = products.find(prod => prod.id === it.productId);
                                                return (
                                                    <div key={idx} className="flex justify-between text-[10px] font-bold py-0.5">
                                                        <span className="text-gray-600">{p?.name} (x{it.quantity})</span>
                                                        <span className="text-gray-800">${(it.quantity * it.unitSupplyPrice).toLocaleString()}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showPaymentDetail.authorizedBy && (
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Documento Autorizado</span>
                                    <span className="text-xs font-black text-emerald-900 italic uppercase">POR: {showPaymentDetail.authorizedBy}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-8 bg-gray-50 flex gap-4">
                        <button onClick={() => setShowPaymentDetail(null)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">Cerrar</button>
                        <button onClick={() => handlePrintThermal('payment', showPaymentDetail.id)} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Imprimir Recibo</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDispatchDetail = () => {
        if (!showDispatchDetail) return null;
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6 no-print">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh]">
                    <div className="px-8 py-5 bg-gray-900 text-white flex justify-between items-center">
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-widest">Folio de Despacho</h4>
                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Nro: {showDispatchDetail.dispatchNumber}</p>
                        </div>
                        <button onClick={() => setShowDispatchDetail(null)} className="text-gray-400 hover:text-white transition-colors "><TrashIcon className="w-6 h-6 rotate-45" /></button>
                    </div>
                    <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Fecha Emisión</p>
                                <p className="text-sm font-black text-gray-900">{showDispatchDetail.timestamp}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <p className="text-[9px] font-black text-red-400 uppercase mb-1">Vencimiento</p>
                                <p className="text-sm font-black text-red-900">{showDispatchDetail.dueDate || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ítems Despachados</p>
                            {showDispatchDetail.items.map((item, idx) => {
                                const p = products.find(prod => prod.id === item.productId);
                                return (
                                    <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-black text-gray-900 uppercase">{p?.name}</p>
                                                <p className="text-[10px] font-bold text-gray-400">Cant Total: {item.quantity} x ${item.unitSupplyPrice.toLocaleString()}</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">${(item.quantity * item.unitSupplyPrice).toLocaleString()}</p>
                                        </div>

                                        <div className="grid grid-cols-12 gap-2 mt-4">
                                            <div className="col-span-4">
                                                <input type="number" placeholder="Cant" value={returnQty[`${showDispatchDetail.id}-${item.productId}`] || ''} onChange={e => setReturnQty({ ...returnQty, [`${showDispatchDetail.id}-${item.productId}`]: e.target.value })} className="w-full p-2 bg-gray-50 border border-gray-200 rounded font-black text-xs outline-none" />
                                            </div>
                                            <div className="col-span-5">
                                                <select value={returnReason[`${showDispatchDetail.id}-${item.productId}`] || 'good_condition'} onChange={e => setReturnReason({ ...returnReason, [`${showDispatchDetail.id}-${item.productId}`]: e.target.value as ReturnReason })} className="w-full p-2 bg-gray-50 border border-gray-200 rounded font-black text-[9px] uppercase">
                                                    <option value="good_condition">Regresa Stock</option>
                                                    <option value="damaged">Dañado/Merma</option>
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <button onClick={() => handleItemReturn(showDispatchDetail.id, item.productId)} className="w-full bg-indigo-600 text-white py-2 rounded font-black uppercase text-[9px]">Ajustar</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-8 border-t flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">Saldo Auditado</p>
                            <p className="text-3xl font-black text-gray-900">${showDispatchDetail.totalAmount.toLocaleString()}</p>
                        </div>
                        {showDispatchDetail.authorizedBy && (
                            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                                <p className="text-[8px] font-black text-emerald-600 uppercase text-center">Firma Digitalizada</p>
                                <p className="text-[10px] font-black text-emerald-900 uppercase italic">AUTORIZADO: {showDispatchDetail.authorizedBy}</p>
                            </div>
                        )}
                        <button onClick={() => setShowDispatchDetail(null)} className="bg-slate-900 text-white px-8 py-3 rounded font-black uppercase text-[10px]">Cerrar</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderList = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => {
                const storeInvoices = dispatches.filter(d => d.storeId === store.id);
                const isOverdue = store.totalDebt > 0 && storeInvoices.some(d => d.status === 'active' && d.dueDate && new Date(d.dueDate) < new Date());

                return (
                    <div key={store.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200 relative group overflow-hidden">
                        <div className={`absolute top-0 left-0 w-2 h-full ${isOverdue ? 'bg-red-500 animate-pulse' : 'bg-brand-primary'}`}></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-lg text-gray-900 uppercase tracking-tighter truncate leading-none">{store.name}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{store.location}</p>
                            </div>
                            {isAdmin && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteStore(store.id); }} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-4 h-4" /></button>
                            )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-500 uppercase">Cuentas por Cobrar</span>
                                {isOverdue && <span className="bg-red-600 text-white text-[8px] px-2 py-0.5 rounded font-black animate-pulse">VENCIDO</span>}
                            </div>
                            <p className="text-2xl font-black text-gray-900 mt-1">${store.totalDebt.toLocaleString()}</p>
                        </div>
                        <button onClick={() => { setActiveStoreId(store.id); setViewMode('statement'); }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-sm hover:bg-slate-700 transition-all">Estado de Cuenta</button>
                    </div>
                );
            })}
        </div>
    );

    const renderStatement = () => {
        if (!activeStore) return null;
        const storeInvoices = dispatches.filter(d => d.storeId === activeStore.id && d.status !== 'cancelled');
        const storePaymentsRec = storePayments.filter(p => p.storeId === activeStore.id && p.status !== 'cancelled');

        // NORMALIZACIÓN DE CAMPOS PARA EL HISTORIAL
        const history = [
            ...storeInvoices.map(d => ({ ...d, type: 'Despacho', date: d.timestamp })),
            ...storePaymentsRec.map(p => ({ ...p, type: 'Abono', date: p.date }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => setViewMode('list')} className="text-brand-primary font-black uppercase text-[10px] flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Volver
                    </button>
                    <div className="text-right">
                        <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{activeStore.name}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase">{activeStore.location}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 text-white p-8 rounded-3xl md:col-span-2 flex justify-between items-center shadow-2xl border-l-8 border-indigo-500">
                        <div>
                            <p className="text-[10px] font-black uppercase opacity-60">Balance Deudor</p>
                            <p className="text-5xl font-black mt-2">${activeStore.totalDebt.toLocaleString()}</p>
                        </div>
                        <button onClick={() => setShowAbonoModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-emerald-900/40 tracking-widest transition-all">Registrar Abono</button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-8 py-5 bg-slate-50 border-b border-slate-100">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Extracto Histórico de Cuenta</h5>
                    </div>
                    <table className="w-full">
                        <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase border-b">
                            <tr>
                                <th className="px-8 py-5 text-left">Fecha</th>
                                <th className="px-8 py-5 text-left">Tipo</th>
                                <th className="px-8 py-5 text-right">Monto</th>
                                <th className="px-8 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.map((h: any) => (
                                <tr key={h.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="px-8 py-6 text-[11px] font-black text-slate-900">{new Date(h.date).toLocaleDateString()}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${h.type === 'Despacho' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                            {h.type} #{h.dispatchNumber || h.reference}
                                        </span>
                                    </td>
                                    <td className={`px-8 py-6 text-right font-black text-sm ${h.type === 'Despacho' ? 'text-red-600' : 'text-emerald-600'}`}>
                                        ${(h.totalAmount || h.amount).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => h.type === 'Despacho' ? setShowDispatchDetail(h) : setShowPaymentDetail(h)} className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all" title="Ver Detalle"><ViewIcon className="w-4 h-4" /></button>
                                            <button onClick={() => h.type === 'Despacho' ? handlePrintThermal('dispatch', h.id) : handlePrintThermal('payment', h.id)} className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all" title="Imprimir Comprobante"><PrintIcon className="w-4 h-4" /></button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => h.type === 'Despacho' ? onAnularDispatch(h.id) : onAnularStorePayment(h.id)}
                                                    className="p-2 bg-slate-100 text-red-300 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                                    title="Anular Operación"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {renderPaymentDetail()}
            {renderDispatchDetail()}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Gestión de Sucursales</h1>
                    <p className="text-gray-400 font-bold text-sm mt-1">Mapa operativo de distribución y cobranzas corporativas.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowEditModal(true)} className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:-translate-y-1 transition-all">+ Nueva Sucursal</button>
                )}
            </div>

            {viewMode === 'list' ? renderList() : renderStatement()}

            {showAbonoModal && activeStore && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                        <div className="p-10 bg-slate-900 text-white border-b-8 border-emerald-500">
                            <h4 className="text-2xl font-black uppercase tracking-widest">Recaudo de Oficina</h4>
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Sucursal: {activeStore.name}</p>
                        </div>
                        <div className="p-10 space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 text-center">Vincular Abono a Despacho Activo</label>
                                <select
                                    value={abonoForm.dispatchId}
                                    onChange={e => {
                                        const dId = e.target.value;
                                        const dispatch = dispatches.find(d => d.id === dId);
                                        let amount = '';
                                        if (dispatch) {
                                            const paid = storePayments
                                                .filter(p => p.dispatchId === dId && p.status !== 'cancelled')
                                                .reduce((sum, p) => sum + p.amount, 0);
                                            amount = Math.max(0, dispatch.totalAmount - paid).toString();
                                        }
                                        setAbonoForm({ ...abonoForm, dispatchId: dId, amount });
                                    }}
                                    className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-xs outline-none focus:border-emerald-500"
                                >
                                    <option value="">-- Seleccionar Folio Pendiente --</option>
                                    {dispatches.filter(d => d.storeId === activeStore.id && d.status !== 'cancelled').map(d => (
                                        <option key={d.id} value={d.id}>Folio #{d.dispatchNumber} (${d.totalAmount.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-3xl">
                                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1 text-center">Efectivo Recibido ($)</label>
                                <input type="number" step="0.01" value={abonoForm.amount} onChange={e => setAbonoForm({ ...abonoForm, amount: e.target.value })} className="w-full bg-transparent text-center text-6xl font-black text-emerald-600 outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Referencia Administrativa</label>
                                <input type="text" value={abonoForm.reference} onChange={e => setAbonoForm({ ...abonoForm, reference: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-900" placeholder="Ej: Pago Lunes" />
                            </div>
                            <button onClick={handleConfirmAbono} disabled={!abonoForm.dispatchId} className={`w-full ${!abonoForm.dispatchId ? 'bg-gray-400' : 'bg-emerald-600 shadow-xl shadow-emerald-900/20'} text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all`}>Confirmar y Cerrar</button>
                            <button onClick={() => setShowAbonoModal(false)} className="w-full text-xs font-black text-gray-400 uppercase">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
                        <div className="p-10 bg-slate-900 text-white border-b-8 border-indigo-500">
                            <h4 className="text-2xl font-black uppercase tracking-widest">Configuración de Sucursal</h4>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Nombre de la Sucursal</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Ubicación / Dirección</label>
                                <input type="text" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold" />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase">Cerrar</button>
                                <button onClick={() => { onAddStore(editForm); setShowEditModal(false); }} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Guardar Sucursal</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
