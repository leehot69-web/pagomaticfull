import React, { useState, useMemo } from 'react';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { ActionButtons, DocumentData } from '../utils/shareUtils';
import { smartPrint } from '../utils/thermalPrinterUtils';

const AdminCenter: React.FC = () => {
    const {
        dispatches,
        payments,
        storePayments,
        invoices,
        suppliers,
        stores,
        products,
        requireDispatchApproval,
        requirePaymentApproval,
        requireInvoiceApproval,
        handleUpdateAppSettings,
        handleApproveDocument,
        handleRejectDocument,
        currentUser,
        printerSize
    } = useSimulatedData();

    const [activeTab, setActiveTab] = useState<'queue' | 'settings'>('queue');
    const [rejectingDoc, setRejectingDoc] = useState<{ entity: string, id: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Filtrar todo lo pendiente
    const pendingDispatches = useMemo(() => dispatches.filter(d => d.approvalStatus === 'pending'), [dispatches]);
    const pendingPayments = useMemo(() => payments.filter(p => p.approvalStatus === 'pending'), [payments]);
    const pendingStorePayments = useMemo(() => storePayments.filter(p => p.approvalStatus === 'pending'), [storePayments]);
    const pendingInvoices = useMemo(() => invoices.filter(i => (i as any).approvalStatus === 'pending'), [invoices]);

    const totalInQueue = pendingDispatches.length + pendingPayments.length + pendingStorePayments.length + pendingInvoices.length;

    const handleConfirmApprove = async (entity: string, id: string) => {
        await handleApproveDocument(entity, id);

        // Disparar Impresión si es Despacho o Pago a Sucursal
        if (entity === 'dispatch') {
            const d = dispatches.find(item => item.id === id);
            const store = stores.find(s => s.id === d?.storeId);
            if (d && store) {
                const docData: DocumentData = {
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
                    storeName: store.name,
                    storeAddress: store.location,
                    generatedBy: currentUser?.name,
                    authorizedBy: currentUser?.name,
                    dueDate: d.dueDate
                };
                smartPrint(docData, { size: printerSize as any }, () => { });
            }
        }

        if (entity === 'store_payment') {
            const p = storePayments.find(item => item.id === id);
            const store = stores.find(s => s.id === p?.storeId);
            if (p && store) {
                const docData: DocumentData = {
                    type: 'payment',
                    id: p.id,
                    reference: p.reference,
                    date: p.date,
                    amount: p.amount,
                    storeName: store.name,
                    method: p.method,
                    concept: 'Abono a Cuenta',
                    generatedBy: currentUser?.name,
                    authorizedBy: currentUser?.name
                };
                smartPrint(docData, { size: printerSize as any }, () => { });
            }
        }
    };

    const handleConfirmReject = async () => {
        if (!rejectingDoc || !rejectReason.trim()) return;
        await handleRejectDocument(rejectingDoc.entity, rejectingDoc.id, rejectReason);
        setRejectingDoc(null);
        setRejectReason('');
    };

    if (!currentUser?.roles.includes('ADMIN')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-800">ACCESO RESTRINGIDO</h2>
                <p className="text-gray-500 max-w-md">Esta sección es de uso exclusivo para el Administrador Jefe. No tienes los permisos necesarios para supervisar la gobernanza del sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <style>{`
                @keyframes master-blink {
                    0% { border-color: #fca5a5; box-shadow: 0 0 0px #fee2e2; }
                    50% { border-color: #ef4444; box-shadow: 0 0 20px #fee2e2; }
                    100% { border-color: #fca5a5; box-shadow: 0 0 0px #fee2e2; }
                }
                .pending-pulse {
                    animation: master-blink 2s infinite;
                }
            `}</style>

            {/* Header con Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Mando de Control</h1>
                    <p className="text-gray-500 font-medium">Gobernanza y Autorizaciones en Tiempo Real</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 flex items-center gap-4 shadow-sm">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${totalInQueue > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En Espera</p>
                            <p className="text-xl font-black text-gray-900 leading-none">{totalInQueue} Acciones</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-200/50 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'queue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Cola de Aprobación {totalInQueue > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] animate-pulse">{totalInQueue}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Ajustes Jefe
                </button>
            </div>

            {activeTab === 'queue' ? (
                <div className="grid gap-6">
                    {totalInQueue === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[40px] p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-800 uppercase italic">Cero Pendientes</h3>
                            <p className="text-gray-400 text-sm italic">Tu equipo está operando de forma autónoma o no hay cargos nuevos.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Despachos Pendientes */}
                            {pendingDispatches.map(d => {
                                const store = stores.find(s => s.id === d.storeId);
                                return (
                                    <div key={d.id} className="bg-white border-2 border-red-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group pending-pulse hover:border-red-400 transition-all">
                                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Despacho Pendiente</span>
                                                <span className="text-xs font-black text-gray-400 italic">Folio #{d.dispatchNumber}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 uppercase italic leading-tight">Envío prioritario a {store?.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">Importe: ${d.totalAmount.toLocaleString()} • Esperando tu firma física para liberar carga.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setRejectingDoc({ entity: 'dispatch', id: d.id })} className="px-5 py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-600 transition-all border border-gray-100">Anular</button>
                                            <button onClick={() => handleConfirmApprove('dispatch', d.id)} className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 italic">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                Autorizar e Imprimir
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Pagos a Proveedores Pendientes */}
                            {pendingPayments.map(p => {
                                const supplier = suppliers.find(s => s.id === p.supplierId);
                                return (
                                    <div key={p.id} className="bg-white border-2 border-gray-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-red-200 transition-all">
                                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Pago Pendiente</span>
                                                <span className="text-xs font-black text-gray-400">Ref: {p.reference}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 uppercase italic leading-tight">Pago a {supplier?.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">Monto: ${p.amount.toLocaleString()} • Método: {p.method}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setRejectingDoc({ entity: 'payment', id: p.id })} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase hover:bg-red-100 transition-all">Anular</button>
                                            <button onClick={() => handleApproveDocument('payment', p.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-200 hover:scale-105 transition-all">Autorizar Pago</button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Cobros a Sucursales Pendientes (Bancos) */}
                            {pendingStorePayments.map(p => {
                                const store = stores.find(s => s.id === p.storeId);
                                return (
                                    <div key={p.id} className="bg-white border-2 border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-amber-200 transition-all">
                                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Deposito en Espera</span>
                                                <span className="text-xs font-black text-gray-400"># {p.reference}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 uppercase italic leading-tight">Cobro de {store?.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">Monto Recibido: ${p.amount.toLocaleString()} • Metodo: {p.method}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setRejectingDoc({ entity: 'store_payment', id: p.id })} className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-xs font-black uppercase hover:bg-orange-50 hover:text-orange-600 transition-all">Anular</button>
                                            <button onClick={() => handleConfirmApprove('store_payment', p.id)} className="px-5 py-3 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:scale-105 transition-all">Autorizar e Imprimir</button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Facturas de Proveedores Pendientes */}
                            {pendingInvoices.map(inv => {
                                const supplier = suppliers.find(s => s.id === inv.supplierId);
                                return (
                                    <div key={inv.id} className="bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-slate-300 transition-all">
                                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Factura de Compra</span>
                                                <span className="text-xs font-black text-gray-400"># {inv.invoiceNumber}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 uppercase italic leading-tight">Compra a {supplier?.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">Total: ${inv.totalAmount.toLocaleString()} • Fecha: {inv.date}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setRejectingDoc({ entity: 'invoice', id: inv.id })} className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-all">Descartar</button>
                                            <button onClick={() => handleApproveDocument('invoice', inv.id)} className="px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:scale-105 transition-all">Confirmar Recepcion</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-2xl bg-white border-2 border-gray-100 rounded-[40px] p-10 space-y-10">
                    <div className="space-y-1 border-b border-gray-100 pb-6">
                        <h2 className="text-2xl font-black text-gray-900 uppercase italic">Gobernanza Administrativa</h2>
                        <p className="text-gray-500 text-sm">Decide qué acciones requieren tu intervención obligatoria.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl group border-2 border-transparent hover:border-indigo-100 transition-all">
                            <div className="space-y-1">
                                <h4 className="font-black text-gray-900 uppercase text-sm">Supervisión de Despachos</h4>
                                <p className="text-xs text-gray-500">Los envíos a sucursales quedan en espera de tu OK.</p>
                            </div>
                            <button
                                onClick={() => handleUpdateAppSettings('requireDispatchApproval', !requireDispatchApproval)}
                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${requireDispatchApproval ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 ${requireDispatchApproval ? 'left-7 shadow-sm' : 'left-1 shadow-inner'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl group border-2 border-transparent hover:border-red-100 transition-all">
                            <div className="space-y-1">
                                <h4 className="font-black text-gray-900 uppercase text-sm">Validación de Pagos</h4>
                                <p className="text-xs text-gray-500">Todo egreso de dinero (sucursales/proveedores) requiere autorización.</p>
                            </div>
                            <button
                                onClick={() => handleUpdateAppSettings('requirePaymentApproval', !requirePaymentApproval)}
                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${requirePaymentApproval ? 'bg-red-600 shadow-lg shadow-red-200' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 ${requirePaymentApproval ? 'left-7 shadow-sm' : 'left-1 shadow-inner'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl group border-2 border-transparent hover:border-emerald-100 transition-all">
                            <div className="space-y-1">
                                <h4 className="font-black text-gray-900 uppercase text-sm">Control de Compras</h4>
                                <p className="text-xs text-gray-500">Las facturas nuevas de proveedores no afectan stock hasta ser visadas.</p>
                            </div>
                            <button
                                onClick={() => handleUpdateAppSettings('requireInvoiceApproval', !requireInvoiceApproval)}
                                className={`w-14 h-8 rounded-full relative transition-all duration-500 ${requireInvoiceApproval ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 ${requireInvoiceApproval ? 'left-7 shadow-sm' : 'left-1 shadow-inner'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100/50 flex gap-4">
                            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-[11px] font-bold text-amber-900 leading-relaxed italic">NOTA: Activar estas opciones asegura que nada salga de tu control, pero requiere tu atención constante para no detener los procesos del equipo de trabajo en el local.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Motivo de Rechazo */}
            {rejectingDoc && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 space-y-6 text-center">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Motivo del Rechazo</h3>
                                <p className="text-gray-500 text-sm">Explica brevemente por qué no autorizas esta operación.</p>
                            </div>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ej: Precio incorrecto, esperar a mañana..."
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-100 transition-all resize-none h-32"
                            />
                            <div className="flex gap-4">
                                <button onClick={() => setRejectingDoc(null)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
                                <button
                                    onClick={handleConfirmReject}
                                    disabled={!rejectReason.trim()}
                                    className="flex-1 py-4 font-black uppercase text-[10px] bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200 hover:scale-105 transition-all disabled:opacity-50"
                                >
                                    Confirmar Rechazo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCenter;
