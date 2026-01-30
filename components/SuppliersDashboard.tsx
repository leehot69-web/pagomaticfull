import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Supplier, Product, Invoice, SupplierPayment } from '../types';
import { DollarSignIcon, UsersIcon, SearchIcon, ActivityIcon, ClockIcon, TrashIcon, XIcon } from './IconComponents';
import { useNotifications } from '../NotificationSystem';
import { PrintIcon, WhatsAppIcon, ActionButtons, shareViaWhatsApp, ViewIcon, type DocumentData, printDocument } from '../utils/shareUtils';
import { printThermal, smartPrint, getPrintButtonLabel, type PrinterSize } from '../utils/thermalPrinterUtils';

interface SuppliersDashboardProps {
    suppliers: Supplier[];
    products: Product[];
    invoices: Invoice[];
    payments: SupplierPayment[];
    onAddSupplier: (s: any) => void;
    onUpdateSupplier: (id: string, updates: any) => void;
    onDeleteSupplier: (id: string) => void;
    onAddInvoice: (i: any) => void;
    onAddPayment: (p: any) => void;
    onAddProduct: (p: any) => void;
    onUpdateProduct: (id: string, updates: any) => void;
    onAnularPayment: (id: string) => void;
    isAdmin?: boolean;
    onNavigateToReports: () => void;
    currentUser?: any;
    printerSize?: string;
}

interface InvoiceItemForm {
    productId: string;
    quantity: number;
    unitCost: number;
    isManual?: boolean;
    manualName?: string;
    manualBrand?: string;
    manualPresentation?: string;
}

export const SuppliersDashboard: React.FC<SuppliersDashboardProps> = ({
    suppliers = [], products = [], invoices = [], payments = [],
    onAddSupplier, onUpdateSupplier, onDeleteSupplier, onAddInvoice, onAddPayment, onAddProduct, onUpdateProduct, onAnularPayment,
    isAdmin = false, onNavigateToReports, currentUser, printerSize = '80mm'
}) => {
    const { notify, confirm } = useNotifications();
    const [view, setView] = useState<'list' | 'add' | 'edit' | 'statement' | 'invoice'>('list');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showInvoiceDetail, setShowInvoiceDetail] = useState<Invoice | null>(null);
    const [showPaymentDetail, setShowPaymentDetail] = useState<SupplierPayment | null>(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', reference: '', method: 'Transferencia', invoiceId: '', receiptImage: '' });

    const [supplierForm, setSupplierForm] = useState({ name: '', taxId: '', phone: '', email: '', bankAccount: '' });
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        invoiceImageUrl: '',
        items: [] as InvoiceItemForm[]
    });

    const getInvoiceDocData = (invoice: Invoice): DocumentData => {
        const supplier = suppliers.find(sup => sup.id === invoice.supplierId);
        return {
            type: 'invoice',
            id: invoice.id,
            reference: invoice.invoiceNumber,
            date: invoice.date,
            amount: invoice.totalAmount,
            supplierName: supplier?.name,
            invoiceNumber: invoice.invoiceNumber,
            items: invoice.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return { name: product?.name || 'Producto', quantity: item.quantity, unitPrice: item.unitCost };
            }),
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: invoice.authorizedBy,
            dueDate: invoice.dueDate ? (invoice.dueDate.includes('-') ? invoice.dueDate.split('-').reverse().join('/') : invoice.dueDate) : undefined
        };
    };

    const getSupplierPaymentDocData = (payment: SupplierPayment): DocumentData => {
        const supplier = suppliers.find(sup => sup.id === payment.supplierId);
        const invoice = invoices.find(inv => inv.id === payment.invoiceId);

        return {
            type: 'payment',
            id: payment.id,
            reference: payment.reference,
            date: new Date(payment.date).toLocaleString(),
            amount: payment.amount,
            supplierName: supplier?.name,
            method: payment.method,
            concept: payment.invoiceNumber ? `Pago a Factura #${payment.invoiceNumber}` : 'Pago General',
            items: invoice?.items.map(it => {
                const p = products.find(prod => prod.id === it.productId);
                return {
                    name: p?.name || 'Producto Desconocido',
                    quantity: it.quantity,
                    unitPrice: it.unitCost
                };
            }),
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: payment.authorizedBy
        };
    };

    const handlePrintThermal = (docData: DocumentData) => {
        smartPrint(docData, { size: (printerSize as PrinterSize), printCount: 0 }, printDocument);
    };

    const s = useMemo(() => suppliers.find(sup => sup.id === selectedSupplierId), [suppliers, selectedSupplierId]);

    const pendingInvoices = useMemo(() => {
        if (!s) return [];
        return invoices.filter(inv => inv.supplierId === s.id && (inv.totalAmount - (inv.amountPaid || 0)) > 0);
    }, [invoices, s]);

    const handleSelectInvoice = (invId: string) => {
        const inv = pendingInvoices.find(i => i.id === invId);
        if (inv) {
            setPaymentForm({ ...paymentForm, invoiceId: invId, amount: (inv.totalAmount - (inv.amountPaid || 0)).toString() });
        } else {
            setPaymentForm({ ...paymentForm, invoiceId: '', amount: '' });
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    if (selectedSupplierId) setView('invoice');
                    else notify('Seleccione primero un proveedor', 'warning');
                    break;
                case 'F2':
                    e.preventDefault();
                    setSupplierForm({ name: '', taxId: '', phone: '', email: '', bankAccount: '' });
                    setView('add');
                    break;
                case 'F3':
                    e.preventDefault();
                    setView('list');
                    setSelectedSupplierId(null);
                    break;
                case 'F10':
                    e.preventDefault();
                    setView('list');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSupplierId, view]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmPayment = async () => {
        if (isSubmitting) return;

        if (!s || !paymentForm.amount || !paymentForm.reference.trim()) {
            notify('Por favor complete el monto y la referencia.', 'warning');
            return;
        }

        if (!paymentForm.invoiceId) {
            notify('Debe seleccionar una factura específica para realizar el pago.', 'error');
            return;
        }

        const amount = Math.round(Number(paymentForm.amount) * 100) / 100;
        const inv = invoices.find(i => i.id === paymentForm.invoiceId);

        if (!inv) {
            notify('Factura no encontrada.', 'error');
            return;
        }

        const pending = Math.round((inv.totalAmount - (inv.amountPaid || 0)) * 100) / 100;

        if (amount > pending + 0.01) {
            notify(`No puede pagar más del saldo pendiente ($${pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, 'error');
            return;
        }

        if (amount > s.debt + 0.10) {
            notify(`No puedes pagar más de la deuda total del proveedor ($${s.debt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            await onAddPayment({
                id: `pay-${Date.now()}`,
                supplierId: s.id,
                invoiceId: paymentForm.invoiceId,
                invoiceNumber: inv.invoiceNumber,
                date: new Date().toISOString().split('T')[0],
                amount: amount,
                reference: paymentForm.reference,
                method: paymentForm.method,
                authorizedBy: isAdmin ? currentUser?.name : undefined
            });

            setShowPaymentModal(false);
            setPaymentForm({ amount: '', reference: '', method: 'Transferencia', invoiceId: '', receiptImage: '' });
            notify('Pago registrado correctamente', 'success');
        } catch (error) {
            console.error(error);
            notify('Error al registrar el pago', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveSupplier = () => {
        if (!supplierForm.name) return;
        if (view === 'add') onAddSupplier(supplierForm);
        else if (s) onUpdateSupplier(s.id, supplierForm);
        setView('list');
    };

    const handleAddInvoiceItem = () => {
        setInvoiceForm({
            ...invoiceForm,
            items: [...invoiceForm.items, { productId: products[0]?.id || '', quantity: 1, unitCost: 0, isManual: false }]
        });
    };

    const handleAddManualItem = () => {
        setInvoiceForm({
            ...invoiceForm,
            items: [...invoiceForm.items, { isManual: true, productId: '', manualName: '', quantity: 1, unitCost: 0 }]
        });
    };

    const handleSaveInvoice = async () => {
        if (!s || !invoiceForm.invoiceNumber || invoiceForm.items.length === 0) {
            notify('Complete los datos de la factura.', 'warning');
            return;
        }

        const processedItems = await Promise.all(invoiceForm.items.map(async (item) => {
            if (item.isManual && item.manualName) {
                const newProdId = `p-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const newProduct = {
                    id: newProdId,
                    name: item.manualName,
                    brand: item.manualBrand,
                    presentation: item.manualPresentation,
                    supplierId: s.id,
                    supplierName: s.name,
                    purchaseCost: item.unitCost,
                    purchaseTax: 0,
                    purchaseFreight: 0,
                    supplyPrice: Math.ceil(item.unitCost * 1.3),
                    retailPrice: Math.ceil(item.unitCost * 1.6),
                    imageUrl: 'https://placehold.co/400x400/0D254C/FFFFFF/png?text=Nuevo+Item',
                    color: '#3b82f6',
                    stock: 0
                };
                await onAddProduct(newProduct);
                return {
                    productId: newProdId,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    unitTax: 0,
                    unitFreight: 0,
                    totalItemCost: item.quantity * item.unitCost
                };
            }
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                unitTax: 0,
                unitFreight: 0,
                totalItemCost: item.quantity * item.unitCost
            };
        }));

        const total = processedItems.reduce((acc, item) => acc + item.totalItemCost, 0);

        onAddInvoice({
            id: `inv-${Date.now()}`,
            supplierId: s.id,
            invoiceNumber: invoiceForm.invoiceNumber,
            date: invoiceForm.date,
            items: processedItems,
            totalAmount: total,
            amountPaid: 0,
            status: 'pending',
            notes: invoiceForm.notes,
            invoiceImageUrl: invoiceForm.invoiceImageUrl,
            authorizedBy: isAdmin ? currentUser?.name : undefined
        });
        setView('statement');
    };

    const renderSupplierForm = () => (
        <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border-2 border-gray-100 animate-in slide-in-from-bottom-10">
            <div className="p-10 border-b flex justify-between items-center bg-gray-50/50">
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{view === 'add' ? 'Nuevo Proveedor' : 'Editar Proveedor'}</h3>
                <button onClick={() => setView('list')} className="text-gray-400 hover:text-red-500 transition-colors">
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">Razón Social</label>
                    <input type="text" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none" />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">ID Fiscal (RIF)</label>
                    <input type="text" value={supplierForm.taxId} onChange={e => setSupplierForm({ ...supplierForm, taxId: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none" />
                </div>
            </div>
            <div className="p-10 bg-gray-50 flex gap-4">
                <button onClick={() => setView('list')} className="flex-1 py-4 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button onClick={handleSaveSupplier} className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Guardar Proveedor</button>
            </div>
        </div>
    );

    const renderInvoiceForm = () => (
        <div className="max-w-5xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border-2 border-gray-100 animate-in slide-in-from-bottom-10">
            <div className="p-10 border-b flex justify-between items-center bg-gray-900 text-white">
                <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Cargar Factura de Compra</h3>
                    <p className="text-brand-accent text-xs font-bold uppercase tracking-widest mt-1">Proveedor: {s?.name}</p>
                </div>
                <button onClick={() => setView('statement')} className="text-gray-400 hover:text-white transition-colors">
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nro de Factura</label>
                        <input type="text" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-black text-brand-primary outline-none" placeholder="001-XXXX" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Foto de Factura</label>
                        <div className="relative group cursor-pointer h-[58px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center hover:border-brand-primary transition-all">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                setInvoiceForm({ ...invoiceForm, invoiceImageUrl: 'https://placehold.co/600x800/EEE/666?text=Factura+Escaneada' });
                                notify('Foto de factura cargada (Simulado)', 'success');
                            }} />
                            <p className="text-[10px] font-black text-gray-400 group-hover:text-brand-primary uppercase">Cargar/Tomar Foto</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Fecha de Emisión</label>
                        <input type="date" value={invoiceForm.date} onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-red-400 tracking-widest">Fecha Límite de Pago (Crédito)</label>
                        <input
                            type="date"
                            value={invoiceForm.dueDate || ''}
                            onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                            className="w-full bg-red-50 border-2 border-red-100 p-4 rounded-2xl font-bold outline-none text-red-900 focus:border-red-300"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Notas / Observaciones</label>
                    <textarea value={invoiceForm.notes} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none h-24 resize-none" placeholder="..." />
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-black uppercase text-[10px] tracking-widest text-gray-400">Ítems de Factura</h4>
                        <div className="flex gap-3">
                            <button onClick={handleAddInvoiceItem} className="bg-gray-100 hover:bg-brand-primary hover:text-white text-gray-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm">+ Inventario</button>
                            <button onClick={handleAddManualItem} className="bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all border border-amber-100 shadow-sm">+ Manual</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {invoiceForm.items.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 p-6 rounded-3xl relative group border-2 border-transparent hover:border-brand-primary/20 transition-all space-y-4">
                                <div className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-12 md:col-span-5">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[9px] font-black uppercase text-gray-400">
                                                {item.isManual ? '📝 Nuevo Producto' : '📦 Producto en Lista'}
                                            </label>
                                            <button
                                                onClick={() => {
                                                    const newItems = [...invoiceForm.items];
                                                    newItems[idx].isManual = !newItems[idx].isManual;
                                                    if (!newItems[idx].isManual && !newItems[idx].productId) {
                                                        newItems[idx].productId = products[0]?.id || '';
                                                    }
                                                    setInvoiceForm({ ...invoiceForm, items: newItems });
                                                }}
                                                className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${item.isManual ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}
                                            >
                                                {item.isManual ? 'Cambiar a Lista' : 'Cambiar a Manual'}
                                            </button>
                                        </div>
                                        {item.isManual ? (
                                            <input type="text" placeholder="Nombre..." value={item.manualName || ''} onChange={e => {
                                                const newItems = [...invoiceForm.items];
                                                newItems[idx].manualName = e.target.value;
                                                setInvoiceForm({ ...invoiceForm, items: newItems });
                                            }} className="w-full bg-white border-2 border-amber-200 p-3 rounded-xl font-bold text-sm outline-none" />
                                        ) : (
                                            <select value={item.productId} onChange={e => {
                                                const newItems = [...invoiceForm.items];
                                                newItems[idx].productId = e.target.value;
                                                setInvoiceForm({ ...invoiceForm, items: newItems });
                                            }} className="w-full bg-white border-2 border-gray-100 p-3 rounded-xl font-bold text-sm outline-none">
                                                <option value="" disabled>Seleccione...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <label className="text-[9px] font-black text-gray-400 mb-1 block text-center">Cant.</label>
                                        <input type="number" value={item.quantity} onChange={e => {
                                            const newItems = [...invoiceForm.items];
                                            newItems[idx].quantity = Number(e.target.value);
                                            setInvoiceForm({ ...invoiceForm, items: newItems });
                                        }} className="w-full bg-white border border-gray-200 p-3 rounded-xl font-black text-center" />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <label className="text-[9px] font-black text-gray-400 mb-1 block text-right">Costo ($)</label>
                                        <input type="number" step="0.01" value={item.unitCost} onChange={e => {
                                            const newItems = [...invoiceForm.items];
                                            newItems[idx].unitCost = Number(e.target.value);
                                            setInvoiceForm({ ...invoiceForm, items: newItems });
                                        }} className="w-full bg-white border border-gray-200 p-3 rounded-xl font-black text-right" />
                                    </div>
                                    <div className="col-span-4 md:col-span-1 flex justify-end">
                                        <button onClick={() => {
                                            const newItems = invoiceForm.items.filter((_, i) => i !== idx);
                                            setInvoiceForm({ ...invoiceForm, items: newItems });
                                        }} className="p-3 text-red-300 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-10 bg-gray-900 flex justify-between items-center">
                <div className="text-white">
                    <p className="text-[10px] font-black uppercase text-gray-500">Total Facturado</p>
                    <p className="text-4xl font-black text-brand-accent">${invoiceForm.items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0).toLocaleString()}</p>
                </div>
                <button onClick={handleSaveInvoice} className="bg-brand-primary text-white px-12 py-5 rounded-2xl font-black uppercase text-xs shadow-2xl">Confirmar Factura</button>
            </div>
        </div>
    );

    const renderStatement = () => {
        if (!s) return null;
        const supplierInvoices = invoices.filter(i => i.supplierId === s.id);
        const supplierPayments = payments.filter(p => p.supplierId === s.id && p.status !== 'cancelled');
        const history = [...supplierInvoices.map(i => ({ ...i, type: 'Factura' })), ...supplierPayments.map(p => ({ ...p, type: 'Pago' }))].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <button onClick={() => setView('list')} className="text-brand-primary font-black uppercase tracking-tighter flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Volver
                    </button>
                    <div className="text-right">
                        <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">{s.name}</h3>
                        <p className="text-sm font-mono text-gray-400">{s.taxId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
                    <div className="bg-slate-900 text-white p-6 rounded-lg shadow-sm md:col-span-2 border-l-8 border-red-600">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance Deudor Consolidado</p>
                        <p className="text-4xl font-black mt-1">${s.debt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-black uppercase text-gray-400">Volumen de Compra</p>
                        <p className="text-xl font-black text-gray-800">${(s.totalVolume || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex flex-col gap-2 border border-gray-200">
                        <button onClick={() => { setInvoiceForm({ invoiceNumber: '', date: new Date().toISOString().split('T')[0], dueDate: '', notes: '', invoiceImageUrl: '', items: [] }); setView('invoice'); }} className="flex-1 bg-indigo-700 text-white rounded font-black uppercase text-[10px] tracking-widest">Cargar Factura</button>
                        {isAdmin ? (
                            <button onClick={() => setShowPaymentModal(true)} className="flex-1 bg-emerald-600 text-white rounded font-black uppercase text-[10px] tracking-widest transition-all">Registrar Pago</button>
                        ) : (
                            <div className="flex-1 bg-gray-200 text-gray-400 rounded font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1 cursor-not-allowed">
                                <ActivityIcon className="w-3 h-3" /> Solo Admin
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <div className="px-10 py-4 bg-gray-100 border-b font-black text-gray-700 uppercase text-[10px] tracking-widest">Extracto Histórico</div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black border-b">
                            <tr>
                                <th className="px-10 py-6 text-center w-12 text-slate-400">#</th>
                                <th className="px-10 py-6">Fecha</th>
                                <th className="px-10 py-6">Tipo</th>
                                <th className="px-10 py-6 text-right">Monto</th>
                                <th className="px-10 py-6 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {history.map((h: any, idx: number) => (
                                <tr key={h?.id} className="hover:bg-slate-50 group transition-colors">
                                    <td className="px-10 py-7 text-center">
                                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400">{idx + 1}</div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <span className="font-black text-slate-900 text-xs">{h.date}</span>
                                    </td>
                                    <td className="px-10 py-7">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${h.type === 'Factura' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {h.type} #{h.invoiceNumber || h.reference}
                                        </span>
                                    </td>
                                    <td className={`px-10 py-7 text-right font-black text-lg ${h.type === 'Factura' ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {(h.amount || h.totalAmount).toLocaleString()}
                                    </td>
                                    <td className="px-10 py-7 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => h.type === 'Factura' ? setShowInvoiceDetail(h) : setShowPaymentDetail(h)} className="p-2 bg-slate-100 text-slate-400 hover:bg-brand-primary hover:text-white rounded transition-colors"><ViewIcon className="w-4 h-4" /></button>
                                            <button onClick={() => h.type === 'Factura' ? handlePrintThermal(getInvoiceDocData(h)) : handlePrintThermal(getSupplierPaymentDocData(h))} className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded transition-colors"><PrintIcon className="w-4 h-4" /></button>
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

    const renderList = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Panel de Proveedores</h2>
                    <p className="text-gray-400 font-bold text-sm">Gestion de cuentas por pagar.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setSupplierForm({ name: '', taxId: '', phone: '', email: '', bankAccount: '' }); setView('add'); }} className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl">+ Nuevo Proveedor</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {suppliers.map(sup => (
                    <div key={sup.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200 relative group">
                        {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteSupplier(sup.id); }} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-20"><TrashIcon className="w-4 h-4" /></button>
                        )}
                        <h4 className="font-black text-sm text-gray-900 uppercase tracking-tighter mb-1 truncate">{sup.name}</h4>
                        <div className="bg-gray-50 p-4 rounded-md my-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pasivo Pendiente</p>
                            <p className="text-xl font-black text-red-600 tracking-tighter">${sup.debt.toLocaleString()}</p>
                        </div>
                        <button onClick={() => { setSelectedSupplierId(sup.id); setView('statement'); }} className="w-full bg-slate-800 text-white py-2 rounded font-black uppercase text-[9px] shadow-sm hover:bg-slate-700 transition-all">Acceder al Libro Mayor</button>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {showPaymentDetail && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowPaymentDetail(null)}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-8 bg-emerald-600 text-white border-b-8 border-emerald-700 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-widest">Comprobante de Pago</h4>
                                <p className="text-xs font-bold opacity-60">#{showPaymentDetail.reference}</p>
                            </div>
                            <button onClick={() => setShowPaymentDetail(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Pagado</p>
                                <p className="text-5xl font-black text-emerald-600 tracking-tighter">${showPaymentDetail.amount.toLocaleString()}</p>
                            </div>
                            {showPaymentDetail.authorizedBy && (
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Autorizado</span>
                                    <span className="text-xs font-black text-emerald-900 italic uppercase">POR: {showPaymentDetail.authorizedBy}</span>
                                </div>
                            )}
                        </div>
                        <div className="p-8 bg-gray-50 flex gap-4">
                            <button onClick={() => setShowPaymentDetail(null)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 hover:bg-gray-100 rounded-2xl">Cerrar</button>
                            <button onClick={() => handlePrintThermal(getSupplierPaymentDocData(showPaymentDetail))} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            {showInvoiceDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6" onClick={() => setShowInvoiceDetail(null)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex-1 p-8 flex flex-col bg-white overflow-y-auto">
                            <div className="flex justify-between items-start mb-8 border-b pb-4">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-widest text-gray-900">Factura de Compra</h4>
                                    <p className="text-[10px] font-black uppercase text-brand-primary mt-1">Ref: {showInvoiceDetail.invoiceNumber}</p>
                                </div>
                                <button onClick={() => setShowInvoiceDetail(null)} className="p-2 bg-gray-100 rounded text-gray-500 hover:bg-gray-200 transition-colors">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Fecha</p>
                                        <p className="text-sm font-black text-gray-900">{showInvoiceDetail.date}</p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-xl">
                                        <p className="text-[9px] font-black uppercase text-red-400 mb-1">Vencimiento</p>
                                        <p className="text-sm font-black text-red-900">{showInvoiceDetail.dueDate || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Detalle</p>
                                    {showInvoiceDetail.items.map((item, idx) => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                                                <div>
                                                    <p className="text-xs font-black uppercase text-gray-900">{p?.name}</p>
                                                    <p className="text-[10px] text-gray-400">{item.quantity} x ${item.unitCost}</p>
                                                </div>
                                                <p className="font-black text-gray-900">${(item.quantity * item.unitCost).toLocaleString()}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-8 border-t-2 border-dashed border-gray-100 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Total</p>
                                        <p className="text-4xl font-black text-gray-900">${showInvoiceDetail.totalAmount.toLocaleString()}</p>
                                    </div>
                                    {showInvoiceDetail.authorizedBy && (
                                        <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                                            <p className="text-[8px] font-black text-gray-400 uppercase text-center">🔐 Autorizado</p>
                                            <p className="text-[10px] font-black text-gray-900 uppercase italic">{showInvoiceDetail.authorizedBy}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-[400px] bg-gray-100 border-l border-gray-200 flex items-center justify-center p-4">
                            {showInvoiceDetail.invoiceImageUrl ? (
                                <img src={showInvoiceDetail.invoiceImageUrl} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <p className="text-xs font-black text-gray-400 uppercase">Sin Imagen</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'list' && renderList()}
            {view === 'statement' && renderStatement()}
            {(view === 'add' || view === 'edit') && renderSupplierForm()}
            {view === 'invoice' && renderInvoiceForm()}

            {showPaymentModal && s && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-gray-300">
                        <div className="p-8 bg-slate-900 text-white border-b-4 border-emerald-500">
                            <h4 className="text-xl font-black uppercase tracking-widest">Registrar Pago</h4>
                            <p className="text-emerald-400 text-[10px] font-black uppercase mt-2">Destino: {s.name}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Seleccionar Factura</label>
                                <select value={paymentForm.invoiceId} onChange={e => handleSelectInvoice(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded font-black text-sm">
                                    <option value="">-- Seleccionar --</option>
                                    {pendingInvoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>Factura #{inv.invoiceNumber} - Pendiente: ${(inv.totalAmount - (inv.amountPaid || 0)).toLocaleString()}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Referencia</label>
                                <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-200 rounded font-black" />
                            </div>
                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                <label className="text-[10px] font-black text-emerald-400 uppercase mb-1 block text-center">Monto ($)</label>
                                <input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full bg-transparent text-center text-5xl font-black text-emerald-600 outline-none" />
                            </div>
                        </div>
                        <div className="p-8 bg-gray-50 flex gap-4">
                            <button onClick={() => setShowPaymentModal(false)} className="flex-1 font-black uppercase text-[10px] text-gray-400">Cancelar</button>
                            <button onClick={handleConfirmPayment} disabled={isSubmitting || !paymentForm.invoiceId} className={`flex-1 ${isSubmitting || !paymentForm.invoiceId ? 'bg-gray-400' : 'bg-emerald-600 shadow-lg'} text-white py-4 rounded-xl font-black uppercase text-[10px]`}>
                                {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white h-10 flex items-center px-6 gap-6 z-50 no-print">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-gray-300">F1</span><span className="text-[9px] font-bold text-gray-300 uppercase">Factura</span></div>
                    <div className="flex items-center gap-1.5"><span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-gray-300">F2</span><span className="text-[9px] font-bold text-gray-300 uppercase">Nuevo</span></div>
                    <div className="flex items-center gap-1.5"><span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-gray-300">F3</span><span className="text-[9px] font-bold text-gray-300 uppercase">Lista</span></div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black text-white uppercase">Gestión Proveedores Activa</span>
                </div>
            </div>
        </div>
    );
};
