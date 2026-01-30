import React, { useMemo, useState } from 'react';
import type { StockDispatch, StorePayment, SupplierPayment, Invoice, Store, Supplier, Product } from '../types';
import { ActivityIcon, DollarSignIcon, ClockIcon, SearchIcon, UsersIcon, XIcon } from './IconComponents';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { ActionButtons, type DocumentData, printDocument, shareViaWhatsApp, PrintIcon, WhatsAppIcon, ViewIcon } from '../utils/shareUtils';
import { printThermal, smartPrint, getPrintButtonLabel, type PrinterSize } from '../utils/thermalPrinterUtils';

interface ReportsDashboardProps {
    dispatches: StockDispatch[];
    storePayments: StorePayment[];
    supplierPayments: SupplierPayment[];
    invoices: Invoice[];
    stores: Store[];
    suppliers: Supplier[];
    products: Product[];
    onAnularDispatch: (id: string, restoreStock: boolean) => Promise<void>;
    onAnularStorePayment: (id: string) => Promise<void>;
    onAnularPayment: (id: string) => Promise<void>;
    initialTab?: 'analytics' | 'dispatches' | 'storePayments' | 'supplierPayments' | 'invoices' | 'profitability' | 'vault';
    currentUser?: any;
    printerSize?: string;
    onIncrementDispatchPrintCount?: (id: string) => void;
    onIncrementStorePaymentPrintCount?: (id: string) => void;
}

const InfographicBar: React.FC<{
    label: string,
    value: number,
    percentage: number,
    color: string,
    icon: React.FC<{ className?: string }>,
    index: number,
    title: string,
    desc: string
}> = ({ label, value, percentage, color, icon: Icon, index, title, desc }) => (
    <div className="flex-1 flex flex-col items-center min-w-[140px] animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${index * 100}ms` }}>
        {/* Etiqueta de Año/Categoría Superior */}
        <div className="bg-white px-6 py-2 rounded-xl shadow-lg border border-gray-100 mb-6 z-10">
            <span className="text-xl font-black" style={{ color }}>{label}</span>
        </div>

        {/* Contenedor Casilla (Efecto Recessed) */}
        <div className="w-full aspect-[1/2] bg-gray-100 rounded-[2rem] relative overflow-hidden shadow-inner border border-gray-200 flex items-end mb-6">
            {/* La Barra de Color */}
            <div
                className="w-full relative transition-all duration-1000 ease-out flex flex-col items-center justify-start pt-6"
                style={{ height: `${percentage}%`, backgroundColor: color }}
            >
                {/* Porcentaje en la Barra */}
                <span className="text-white font-black text-2xl mb-8">{percentage.toFixed(0)}%</span>

                {/* Icono en el centro de la barra */}
                <Icon className="w-12 h-12 text-white/40 mb-10" />

                {/* Badge DATA XX */}
                <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">DATA</span>
                    <span className="text-xl font-black text-gray-900 leading-none">{String(index + 1).padStart(2, '0')}</span>
                </div>
            </div>
        </div>

        {/* Título y Descripción Inferior */}
        <div className="text-center px-2">
            <h4 className="font-black text-xs uppercase tracking-tighter mb-1" style={{ color }}>{title}</h4>
            <p className="text-[8px] font-medium text-gray-400 leading-tight line-clamp-2">{desc}</p>
        </div>
    </div>
);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
    dispatches, storePayments, supplierPayments, invoices, stores, suppliers, products,
    onAnularDispatch, onAnularStorePayment, onAnularPayment, initialTab = 'analytics', currentUser,
    printerSize = '80mm',
    onIncrementDispatchPrintCount,
    onIncrementStorePaymentPrintCount
}) => {
    const [activeTab, setActiveTab] = useState<'analytics' | 'dispatches' | 'storePayments' | 'supplierPayments' | 'invoices' | 'profitability' | 'vault'>(initialTab);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [showDispatchDetail, setShowDispatchDetail] = useState<StockDispatch | null>(null);
    const [showStorePaymentDetail, setShowStorePaymentDetail] = useState<StorePayment | null>(null);
    const [showSupplierPaymentDetail, setShowSupplierPaymentDetail] = useState<SupplierPayment | null>(null);
    const [showInvoiceDetail, setShowInvoiceDetail] = useState<Invoice | null>(null);

    // Filtrado por Fechas con parsing Robusto
    const parseDate = (dateStr: string) => {
        try {
            if (dateStr.includes('T')) return new Date(dateStr).getTime();
            const parts = dateStr.split(',')[0].split('/');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
            }
            return new Date(dateStr).getTime();
        } catch (e) {
            return 0;
        }
    };

    const startMs = useMemo(() => new Date(`${startDate}T00:00:00`).getTime(), [startDate]);
    const endMs = useMemo(() => new Date(`${endDate}T23:59:59`).getTime(), [endDate]);

    const filteredDispatches = useMemo(() => dispatches.filter(d => {
        const time = parseDate(d.timestamp);
        return time >= startMs && time <= endMs;
    }).sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp)), [dispatches, startMs, endMs]);
    const activeDispatches = useMemo(() => filteredDispatches.filter(d => d.status !== 'cancelled'), [filteredDispatches]);
    const cancelledDispatches = useMemo(() => filteredDispatches.filter(d => d.status === 'cancelled'), [filteredDispatches]);

    const filteredStorePayments = useMemo(() => storePayments.filter(p => {
        const time = parseDate(p.date || '');
        return time >= startMs && time <= endMs;
    }).sort((a, b) => parseDate(b.date || '') - parseDate(a.date || '')), [storePayments, startMs, endMs]);

    const activeStorePayments = useMemo(() => filteredStorePayments.filter(p => (p as any).status !== 'cancelled'), [filteredStorePayments]);
    const cancelledStorePayments = useMemo(() => filteredStorePayments.filter(p => (p as any).status === 'cancelled'), [filteredStorePayments]);

    const filteredSupplierPayments = useMemo(() => supplierPayments.filter(p => {
        const time = parseDate(p.date || '');
        return time >= startMs && time <= endMs;
    }).sort((a, b) => parseDate(b.date || '') - parseDate(a.date || '')), [supplierPayments, startMs, endMs]);

    const activeSupplierPayments = useMemo(() => filteredSupplierPayments.filter(p => (p as any).status !== 'cancelled'), [filteredSupplierPayments]);
    const cancelledSupplierPayments = useMemo(() => filteredSupplierPayments.filter(p => (p as any).status === 'cancelled'), [filteredSupplierPayments]);

    const filteredInvoices = useMemo(() => invoices.filter(i => {
        const time = parseDate(i.date || '');
        return time >= startMs && time <= endMs;
    }).sort((a, b) => parseDate(b.date || '') - parseDate(a.date || '')), [invoices, startMs, endMs]);

    // Totales del Periodo (SOLO ACTIVOS)
    const periodInflow = useMemo(() => activeStorePayments.reduce((acc, p) => acc + p.amount, 0), [activeStorePayments]);
    const periodDispatchTotal = useMemo(() => activeDispatches.reduce((acc, d) => acc + d.totalAmount, 0), [activeDispatches]);
    const periodSupplierOutflow = useMemo(() => activeSupplierPayments.reduce((acc, p) => acc + p.amount, 0), [activeSupplierPayments]);
    const periodInvoicesTotal = useMemo(() => filteredInvoices.reduce((acc, i) => acc + i.totalAmount, 0), [filteredInvoices]);

    // Totales Cancelados (Para Bóveda)
    const cancelledDispatchTotal = useMemo(() => cancelledDispatches.reduce((acc, d) => acc + d.totalAmount, 0), [cancelledDispatches]);
    const cancelledStorePaymentsTotal = useMemo(() => cancelledStorePayments.reduce((acc, p) => acc + p.amount, 0), [cancelledStorePayments]);
    const cancelledSupplierPaymentsTotal = useMemo(() => cancelledSupplierPayments.reduce((acc, p) => acc + p.amount, 0), [cancelledSupplierPayments]);

    // DATA PARA GRÁFICOS
    const storeSalesData = useMemo(() => {
        return stores.map(st => ({
            name: st.name.split('-')[0].trim(),
            ventas: activeDispatches.filter(d => d.storeId === st.id).reduce((sum, d) => sum + d.totalAmount, 0),
            cobros: activeStorePayments.filter(p => p.storeId === st.id).reduce((sum, p) => sum + p.amount, 0)
        })).filter(d => d.ventas > 0 || d.cobros > 0);
    }, [stores, activeDispatches, activeStorePayments]);

    const regionalData = useMemo(() => {
        const regions: Record<string, number> = {};
        filteredDispatches.forEach(d => {
            const store = stores.find(s => s.id === d.storeId);
            const region = store?.location || 'General';
            regions[region] = (regions[region] || 0) + d.totalAmount;
        });
        return Object.entries(regions).map(([name, value]) => ({ name, value }));
    }, [filteredDispatches, stores]);

    const temporalData = useMemo(() => {
        const days: Record<string, { date: string, despachos: number, cobros: number }> = {};

        const getDisplayDate = (dateStr: string) => {
            if (dateStr.includes('T')) return dateStr.split('T')[0];
            const parts = dateStr.split(',')[0].split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return dateStr.split(',')[0];
        };

        filteredDispatches.forEach(d => {
            const date = getDisplayDate(d.timestamp);
            if (!days[date]) days[date] = { date, despachos: 0, cobros: 0 };
            days[date].despachos += d.totalAmount;
        });
        filteredStorePayments.forEach(p => {
            const date = p.date;
            if (!days[date]) days[date] = { date, despachos: 0, cobros: 0 };
            days[date].cobros += p.amount;
        });
        return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredDispatches, filteredStorePayments]);

    const profitabilityData = useMemo(() => {
        const productProfit: Record<string, { name: string, profit: number, revenue: number, retailProfit: number }> = {};
        const storeProfit: Record<string, { name: string, profit: number, revenue: number, retailProfit: number }> = {};

        filteredDispatches.forEach(d => {
            const store = stores.find(s => s.id === d.storeId);
            const storeName = store?.name || 'Desconocida';

            if (!storeProfit[d.storeId]) {
                storeProfit[d.storeId] = {
                    name: storeName,
                    profit: 0,
                    revenue: 0,
                    retailProfit: 0,
                    orderCount: 0,
                    debt: store?.totalDebt || 0
                } as any;
            }
            (storeProfit[d.storeId] as any).orderCount = ((storeProfit[d.storeId] as any).orderCount || 0) + 1;

            d.items.forEach(item => {
                const p = products.find(prod => prod.id === item.productId);
                if (p) {
                    const cost = (p.purchaseCost || 0) + (p.purchaseTax || 0) + (p.purchaseFreight || 0);
                    const itemProfit = (item.unitSupplyPrice - cost) * item.quantity;
                    const itemRetailProfit = (p.retailPrice - cost) * item.quantity;
                    const itemRevenue = item.unitSupplyPrice * item.quantity;

                    if (!productProfit[item.productId]) {
                        productProfit[item.productId] = { name: p.name, profit: 0, revenue: 0, retailProfit: 0 };
                    }
                    productProfit[item.productId].profit += itemProfit;
                    productProfit[item.productId].revenue += itemRevenue;
                    productProfit[item.productId].retailProfit += itemRetailProfit;

                    storeProfit[d.storeId].profit += itemProfit;
                    storeProfit[d.storeId].revenue += itemRevenue;
                    storeProfit[d.storeId].retailProfit += itemRetailProfit;
                }
            });
        });

        // Asegurar que tiendas sin despachos en el periodo pero con deuda también aparezcan si se desea, 
        // pero el usuario pidió medir volumen de compra/ventas, así que nos enfocamos en los que tienen actividad.

        return {
            byProduct: Object.values(productProfit).sort((a, b) => b.profit - a.profit),
            byStore: Object.values(storeProfit).sort((a, b) => b.revenue - a.revenue), // Ordenar por volumen de compra
            totalProfit: Object.values(productProfit).reduce((acc, p) => acc + p.profit, 0),
            totalRetailProfit: Object.values(productProfit).reduce((acc, p) => acc + p.retailProfit, 0)
        };
    }, [filteredDispatches, products, stores]);

    const getDispatchDocData = (dispatch: StockDispatch): DocumentData => {
        const store = stores.find(st => st.id === dispatch.storeId);
        return {
            type: 'dispatch',
            id: dispatch.id,
            reference: dispatch.dispatchNumber,
            date: new Date(dispatch.timestamp).toLocaleDateString(),
            amount: dispatch.totalAmount,
            storeName: store?.name,
            storeAddress: store?.location,
            driverName: dispatch.driverName,
            vehiclePlate: dispatch.vehiclePlate,
            items: dispatch.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                const fullName = [product?.name, product?.brand, product?.presentation].filter(Boolean).join(' ');
                return { name: fullName || 'Producto', quantity: item.quantity, unitPrice: item.unitSupplyPrice };
            }),
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: dispatch.authorizedBy,
            dueDate: dispatch.dueDate ? (dispatch.dueDate.includes('-') ? dispatch.dueDate.split('-').reverse().join('/') : dispatch.dueDate) : undefined
        };
    };

    const getStorePaymentDocData = (payment: StorePayment): DocumentData => {
        const store = stores.find(st => st.id === payment.storeId);
        return {
            type: 'store_payment',
            id: payment.id,
            reference: payment.reference || payment.id.substr(-6),
            date: new Date(payment.date).toLocaleString(),
            amount: payment.amount,
            storeName: store?.name,
            method: payment.method,
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: payment.authorizedBy
        };
    };

    const handlePrintThermal = (type: 'dispatch' | 'store_payment' | 'invoice' | 'payment', id: string) => {
        if (type === 'dispatch') {
            const d = dispatches.find(disp => disp.id === id);
            if (!d) return;
            const docData = getDispatchDocData(d);
            smartPrint(docData, { size: (printerSize as PrinterSize), printCount: d.printCount || 0 }, printDocument);
            onIncrementDispatchPrintCount?.(id);
        } else if (type === 'store_payment') {
            const p = storePayments.find(pay => pay.id === id);
            if (!p) return;
            const docData = getStorePaymentDocData(p);
            smartPrint(docData, { size: (printerSize as PrinterSize), printCount: p.printCount || 0 }, printDocument);
            onIncrementStorePaymentPrintCount?.(id);
        } else if (type === 'invoice') {
            const i = invoices.find(inv => inv.id === id);
            if (!i) return;
            const docData = getInvoiceDocData(i);
            smartPrint(docData, { size: (printerSize as PrinterSize), printCount: 0 }, printDocument);
        } else if (type === 'payment') {
            const p = supplierPayments.find(pay => pay.id === id);
            if (!p) return;
            const docData = getSupplierPaymentDocData(p);
            smartPrint(docData, { size: (printerSize as PrinterSize), printCount: 0 }, printDocument);
        }
    };

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
                const fullName = [product?.name, product?.brand, product?.presentation].filter(Boolean).join(' ');
                return { name: fullName || 'Producto', quantity: item.quantity, unitPrice: item.unitCost };
            }),
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: invoice.authorizedBy
        };
    };

    const getSupplierPaymentDocData = (payment: SupplierPayment): DocumentData => {
        const supplier = suppliers.find(sup => sup.id === payment.supplierId);
        return {
            type: 'payment',
            id: payment.id,
            reference: payment.reference,
            date: payment.date,
            amount: payment.amount,
            supplierName: supplier?.name,
            method: payment.method,
            concept: payment.invoiceNumber ? `Pago de Factura ${payment.invoiceNumber}` : 'Pago General',
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: payment.authorizedBy
        };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-full">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Auditoría Financiera PAGOMATIC</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Extracto Consolidado de Operaciones</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 no-print">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-gray-200 rounded-md px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-brand-primary" />
                    <span className="text-gray-300 font-black">→</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-gray-200 rounded-md px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-brand-primary" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
                <div className="bg-white border-l-4 border-blue-600 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efectividad Global</p>
                    <p className="text-3xl font-black text-blue-600 tracking-tighter">{periodDispatchTotal > 0 ? ((periodInflow / periodDispatchTotal) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white border-l-4 border-orange-500 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Suministros</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">${periodDispatchTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white border-l-4 border-emerald-500 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Cobrado (Caja)</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">${periodInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inversión Proveedores</p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">${periodSupplierOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 no-print mb-6">
                <button onClick={() => setActiveTab('analytics')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'analytics' ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><ActivityIcon className="w-4 h-4" /> Inteligencia</div>
                </button>
                <button onClick={() => setActiveTab('profitability')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'profitability' ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><DollarSignIcon className="w-4 h-4" /> Rentabilidad</div>
                </button>
                <button onClick={() => setActiveTab('dispatches')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'dispatches' ? 'bg-white border-orange-500 text-orange-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><ClockIcon className="w-4 h-4" /> Despachos</div>
                </button>
                <button onClick={() => setActiveTab('storePayments')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'storePayments' ? 'bg-white border-emerald-500 text-emerald-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><DollarSignIcon className="w-4 h-4" /> Cobranza</div>
                </button>
                <button onClick={() => setActiveTab('invoices')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'invoices' ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><SearchIcon className="w-4 h-4" /> Facturas</div>
                </button>
                <button onClick={() => setActiveTab('supplierPayments')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'supplierPayments' ? 'bg-white border-red-500 text-red-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><DollarSignIcon className="w-4 h-4" /> Pagos Prov.</div>
                </button>
                <button onClick={() => setActiveTab('vault')} className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'vault' ? 'bg-white border-red-600 text-red-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2"><ClockIcon className="w-4 h-4" /> Bóveda (Anulados)</div>
                </button>
            </div>

            <div className="min-h-[600px]">
                {activeTab === 'analytics' && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white rounded-sm shadow-sm border-t-4 border-blue-600">
                                <div className="px-8 py-4 border-b bg-gray-50/10 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Ranking de Desempeño Operativo</h3>
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Top 5 Sucursales Activas</p>
                                </div>
                                <div className="p-10">
                                    <div className="h-[350px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={storeSalesData.slice(0, 5)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }} tickFormatter={(value) => `$${value / 1000}k`} />
                                                <Tooltip
                                                    cursor={{ fill: '#f9fafb' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    labelStyle={{ fontWeight: 900, color: '#111827', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
                                                />
                                                <Bar dataKey="ventas" name="Ventas" radius={[4, 4, 0, 0]}>
                                                    {storeSalesData.slice(0, 5).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-sm shadow-sm border-t-4 border-purple-600">
                                <div className="px-6 py-3 border-b bg-gray-50/30 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase">Distribución Regional</h3>
                                </div>
                                <div className="p-4 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={regionalData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {regionalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profitability' && (
                    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-emerald-700 p-6 rounded-lg text-white shadow-sm flex justify-between items-center relative overflow-hidden group">
                                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><ActivityIcon className="w-32 h-32" /></div>
                                    <div className="relative z-10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Utilidad Mayorista Recaudada</p>
                                        <h3 className="text-3xl font-black tracking-tighter">${profitabilityData.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                        <p className="text-[8px] font-bold mt-2 bg-white/10 inline-block px-3 py-1 rounded uppercase">Margen Operativo</p>
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-6 rounded-lg text-white shadow-sm flex justify-between items-center relative overflow-hidden group">
                                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><UsersIcon className="w-32 h-32" /></div>
                                    <div className="relative z-10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Utilidad Retail Potencial</p>
                                        <h3 className="text-3xl font-black tracking-tighter text-brand-accent">${profitabilityData.totalRetailProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                        <p className="text-[8px] font-bold mt-2 bg-brand-accent/20 inline-block px-3 py-1 rounded uppercase text-brand-accent">Beneficio Proyectado</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-8">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
                                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                                        <ActivityIcon className="w-5 h-5 text-brand-primary" />
                                        Balance Comercial por Sucursal
                                    </h4>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Periodo Seleccionado</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                                            <tr>
                                                <th className="px-6 py-4">Sucursal</th>
                                                <th className="px-6 py-4 text-center">Pedidos</th>
                                                <th className="px-6 py-4 text-right">Vol. Compra ($)</th>
                                                <th className="px-6 py-4 text-right">Deuda Actual ($)</th>
                                                <th className="px-6 py-4 text-right">Rentabilidad ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {profitabilityData.byStore.map((st: any, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-black text-gray-900 uppercase text-[10px]">{st.name}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-[10px] font-black text-gray-600">
                                                            {st.orderCount} ops.
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-gray-900">${st.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-5 text-right font-black text-red-600">${st.debt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-5 text-right font-black text-emerald-600">+${st.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
                                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Estado de Insumos Críticos</h4>
                                    <span className="bg-emerald-600 text-white px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest">Análisis de Rotación</span>
                                </div>
                                <div className="p-8 flex flex-col md:flex-row gap-8 justify-between items-stretch">
                                    {profitabilityData.byProduct.slice(0, 5).map((p, idx) => {
                                        const maxProfit = Math.max(...profitabilityData.byProduct.map(prod => prod.profit));
                                        const perc = (p.profit / maxProfit) * 100;
                                        const icons = [DollarSignIcon, ActivityIcon, SearchIcon, ClockIcon, UsersIcon];
                                        return (
                                            <InfographicBar
                                                key={idx}
                                                index={idx}
                                                label={`#${idx + 1}`}
                                                value={p.profit}
                                                percentage={perc}
                                                color={COLORS[(idx + 2) % COLORS.length]} // Diferentes colores
                                                icon={icons[idx % icons.length]}
                                                title={p.name}
                                                desc={`Genera una utilidad total de $${p.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} en el periodo seleccionado.`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dispatches' && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-8 py-4 bg-orange-600 text-white flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest">Registro Maestro de Despachos</h3>
                            <div className="text-right"><p className="text-xl font-black tracking-tighter">Total Folios: ${periodDispatchTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                        <th className="px-8 py-5 text-left">Folio Operativo</th>
                                        <th className="px-8 py-5 text-left">Fecha y Hora</th>
                                        <th className="px-8 py-5 text-left">Sucursal Destino</th>
                                        <th className="px-8 py-5 text-left">Responsable MTC</th>
                                        <th className="px-8 py-5 text-right">Monto Neto</th>
                                        <th className="px-8 py-5 text-center">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeDispatches.map((d, idx) => (
                                        <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-6 text-center">
                                                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                            </td>
                                            <td className="px-8 py-6 font-black text-slate-900 truncate">#{d.dispatchNumber}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-xs">{d.timestamp.split(',')[0]}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{d.timestamp.split(',')[1]?.trim() || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-black text-slate-600 uppercase text-xs">{stores.find(s => s.id === d.storeId)?.name}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[8px] font-black text-indigo-700">{currentUser?.name?.charAt(0) || 'A'}</div>
                                                    <span className="text-[10px] font-black uppercase text-slate-500">{currentUser?.name || 'Admin'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg text-orange-600">${d.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-8 py-6 text-center">
                                                <ActionButtons
                                                    printLabel={getPrintButtonLabel()}
                                                    size="sm"
                                                    onView={() => setShowDispatchDetail(d)}
                                                    onPrint={() => handlePrintThermal('dispatch', d.id)}
                                                    onWhatsApp={() => shareViaWhatsApp({
                                                        type: 'dispatch',
                                                        id: d.id,
                                                        reference: d.dispatchNumber,
                                                        date: d.timestamp,
                                                        amount: d.totalAmount,
                                                        storeName: stores.find(s => s.id === d.storeId)?.name,
                                                        items: d.items.map(i => ({
                                                            name: products.find(p => p.id === i.productId)?.name || 'Producto',
                                                            quantity: i.quantity,
                                                            unitPrice: i.unitSupplyPrice
                                                        })),
                                                        generatedBy: currentUser?.name,
                                                        userRole: currentUser?.roles?.join(', ')
                                                    })}
                                                    onDelete={() => {
                                                        // Lógica personalizada para preguntar destino del stock
                                                        const choice = window.prompt(
                                                            `🛑 ANULACIÓN DE DESPACHO CAUTELAR\n\n¿Qué desea hacer con la mercancía de este despacho?\n\n1. REINGRESAR AL INVENTARIO (Devolución/Cancelación)\n2. DAR DE BAJA (Merma, Pérdida o Regalo)\n\nEscriba el número de opción (1 o 2):`,
                                                            "1"
                                                        );

                                                        if (choice === "1") {
                                                            if (window.confirm(`¿Confirmas que la mercancía REINGRESARÁ al stock y se anulará la deuda?`)) {
                                                                onAnularDispatch(d.id, true);
                                                            }
                                                        } else if (choice === "2") {
                                                            if (window.confirm(`⚠️ IMPORTANTE: La mercancía se dará de BAJA (Pérdida/Merma) y NO volverá al stock. El cliente NO deberá nada.\n\n¿Proceder?`)) {
                                                                onAnularDispatch(d.id, false);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'storePayments' && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-8 py-4 bg-emerald-600 text-white flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest">Control Interno de Cobranza</h3>
                            <div className="text-right"><p className="text-xl font-black tracking-tighter">Recaudación: ${periodInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                        <th className="px-8 py-5 text-left">Fecha y Hora</th>
                                        <th className="px-8 py-5 text-left">Sucursal</th>
                                        <th className="px-8 py-5 text-left">Responsable MTC</th>
                                        <th className="px-8 py-5 text-right">Monto Abono</th>
                                        <th className="px-8 py-5 text-center">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeStorePayments.map((p, idx) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-6 text-center">
                                                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-xs">{p.date.split(',')[0]}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{p.date.split(',')[1]?.trim() || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-black uppercase text-slate-600">{stores.find(s => s.id === p.storeId)?.name}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[8px] font-black text-emerald-700">{currentUser?.name?.charAt(0) || 'A'}</div>
                                                    <span className="text-[10px] font-black uppercase text-slate-500">{currentUser?.name || 'Admin'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg text-emerald-600">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-8 py-6 text-center">
                                                <ActionButtons
                                                    printLabel={getPrintButtonLabel()}
                                                    size="sm"
                                                    onView={() => setShowStorePaymentDetail(p)}
                                                    onPrint={() => handlePrintThermal('store_payment', p.id)}
                                                    onWhatsApp={() => shareViaWhatsApp(getStorePaymentDocData(p))}
                                                    onDelete={() => {
                                                        if (window.confirm('¿Anular este cobro? La deuda de la sucursal aumentará inmediatamente.')) {
                                                            onAnularStorePayment(p.id);
                                                        }
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-8 py-4 bg-indigo-700 text-white flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest">Facturación y Pasivos Proveedores</h3>
                            <div className="text-right"><p className="text-xl font-black tracking-tighter">Total Facturado: ${periodInvoicesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                        <th className="px-8 py-5 text-left">Folio Factura</th>
                                        <th className="px-8 py-5 text-left">Fecha Registro</th>
                                        <th className="px-8 py-5 text-left">Proveedor</th>
                                        <th className="px-8 py-5 text-left">Responsable MTC</th>
                                        <th className="px-8 py-5 text-right">Monto Total</th>
                                        <th className="px-8 py-5 text-center">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredInvoices.map((i, idx) => (
                                        <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-6 text-center">
                                                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                            </td>
                                            <td className="px-8 py-6 font-black text-slate-900">#{i.invoiceNumber}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-xs">{i.date.split(',')[0]}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{i.date.split(',')[1]?.trim() || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-black uppercase text-slate-600">{suppliers.find(s => s.id === i.supplierId)?.name}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[8px] font-black text-indigo-700">{currentUser?.name?.charAt(0) || 'A'}</div>
                                                    <span className="text-[10px] font-black uppercase text-slate-500">{currentUser?.name || 'Admin'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg text-indigo-600">${i.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-8 py-6 text-center">
                                                <ActionButtons
                                                    printLabel={getPrintButtonLabel()}
                                                    size="sm"
                                                    onView={() => setShowInvoiceDetail(i)}
                                                    onPrint={() => handlePrintThermal('invoice', i.id)}
                                                    onWhatsApp={() => shareViaWhatsApp(getInvoiceDocData(i))}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'supplierPayments' && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-8 py-4 bg-red-700 text-white flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest">Comprobantes de Pago a Terceros</h3>
                            <div className="text-right"><p className="text-xl font-black tracking-tighter">Egreso: ${periodSupplierOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                        <th className="px-8 py-5 text-left">Fecha y Hora</th>
                                        <th className="px-8 py-5 text-left">Proveedor</th>
                                        <th className="px-8 py-5 text-left">Responsable MTC</th>
                                        <th className="px-8 py-5 text-left">Referencia / Fac</th>
                                        <th className="px-8 py-5 text-right">Monto Pago</th>
                                        <th className="px-8 py-5 text-center">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeSupplierPayments.length === 0 ? (
                                        <tr><td colSpan={7} className="px-8 py-10 text-center text-gray-400 font-bold text-xs uppercase">No hay pagos registrados en este periodo</td></tr>
                                    ) : (
                                        activeSupplierPayments.map((p, idx) => (
                                            <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-6 text-center">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 text-xs">{p.date.split(',')[0]}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{p.date.split(',')[1]?.trim() || '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-xs font-black uppercase text-slate-600">{suppliers.find(s => s.id === p.supplierId)?.name || 'Desconocido'}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-[8px] font-black text-red-700">{currentUser?.name?.charAt(0) || 'A'}</div>
                                                        <span className="text-[10px] font-black uppercase text-slate-500">{currentUser?.name || 'Admin'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-xs font-bold text-slate-500">
                                                    {p.reference}
                                                    {p.invoiceNumber && <span className="block text-[10px] text-indigo-500 font-black">Fac: {p.invoiceNumber}</span>}
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-lg text-red-600">-${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <ActionButtons
                                                        size="sm"
                                                        onView={() => setShowSupplierPaymentDetail(p)}
                                                        onPrint={() => handlePrintThermal('payment', p.id)}
                                                        onWhatsApp={() => shareViaWhatsApp(getSupplierPaymentDocData(p))}
                                                        onDelete={() => {
                                                            if (window.confirm('¿Anular este pago al proveedor? La deuda se restablecerá.')) {
                                                                onAnularPayment(p.id);
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'vault' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        {/* DESPACHOS ANULADOS */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                            <div className="px-8 py-4 bg-slate-800 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Bóveda: Despachos Reversados</h3>
                                    <p className="text-[9px] opacity-70 uppercase tracking-widest">Auditoría de Operaciones Reversadas</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black tracking-tighter">${cancelledDispatchTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                        <tr>
                                            <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                            <th className="px-8 py-5 text-left">Folio</th>
                                            <th className="px-8 py-5 text-left">Fecha y Hora</th>
                                            <th className="px-8 py-5 text-left">Responsable</th>
                                            <th className="px-8 py-5 text-left">Sucursal</th>
                                            <th className="px-8 py-5 text-right opacity-50">Monto</th>
                                            <th className="px-8 py-5 text-center">Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-400">
                                        {cancelledDispatches.length === 0 ? (
                                            <tr><td colSpan={6} className="px-8 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-300">La bóveda está vacía (Sin anulaciones)</td></tr>
                                        ) : (
                                            cancelledDispatches.map((d, idx) => (
                                                <tr key={d.id} className="hover:bg-red-50 transition-colors group">
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                                    </td>
                                                    <td className="px-8 py-6 font-black line-through decoration-red-500">#{d.dispatchNumber}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col opacity-60">
                                                            <span className="font-black text-slate-900 text-xs">{d.timestamp.split(',')[0]}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{d.timestamp.split(',')[1]?.trim() || '---'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2 opacity-60">
                                                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-black text-slate-700">{currentUser?.name?.charAt(0) || 'A'}</div>
                                                            <span className="text-[10px] font-black uppercase text-slate-500">{currentUser?.name || 'Admin'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 uppercase text-xs">{stores.find(s => s.id === d.storeId)?.name}</td>
                                                    <td className="px-8 py-6 text-right font-black line-through decoration-red-500">${d.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <ActionButtons
                                                            size="sm"
                                                            onView={() => setShowDispatchDetail(d)}
                                                            onPrint={() => handlePrintThermal('dispatch', d.id)}
                                                            onWhatsApp={() => shareViaWhatsApp({
                                                                type: 'dispatch',
                                                                id: d.id,
                                                                reference: d.dispatchNumber,
                                                                date: d.timestamp,
                                                                amount: d.totalAmount,
                                                                storeName: stores.find(s => s.id === d.storeId)?.name,
                                                                items: d.items.map(i => ({
                                                                    name: products.find(p => p.id === i.productId)?.name || 'Producto',
                                                                    quantity: i.quantity,
                                                                    unitPrice: i.unitSupplyPrice
                                                                })),
                                                                generatedBy: currentUser?.name,
                                                                userRole: currentUser?.roles?.join(', ')
                                                            })}
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PAGOS ANULADOS */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                            <div className="px-8 py-4 bg-slate-700 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Bóveda: Cobranza Anulada</h3>
                                    <p className="text-[9px] opacity-70 uppercase tracking-widest">Registro de Ingresos Cancelados</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black tracking-tighter">${cancelledStorePaymentsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                        <tr>
                                            <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                            <th className="px-8 py-5 text-left">Referencia</th>
                                            <th className="px-8 py-5 text-left">Fecha y Hora</th>
                                            <th className="px-8 py-5 text-left">Responsable</th>
                                            <th className="px-8 py-5 text-left">Sucursal</th>
                                            <th className="px-8 py-5 text-right opacity-50">Monto</th>
                                            <th className="px-8 py-5 text-center">Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-400">
                                        {cancelledStorePayments.length === 0 ? (
                                            <tr><td colSpan={6} className="px-8 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-300">Sin pagos anulados</td></tr>
                                        ) : (
                                            cancelledStorePayments.map((p, idx) => (
                                                <tr key={p.id} className="hover:bg-red-50 transition-colors group">
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                                    </td>
                                                    <td className="px-8 py-6 font-black line-through decoration-red-500">{p.reference || p.id.split('-').pop()}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col opacity-60">
                                                            <span className="font-black text-slate-900 text-xs">{p.date.split(',')[0]}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.date.split(',')[1]?.trim() || '---'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2 opacity-60">
                                                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-black text-slate-700">{currentUser?.name?.charAt(0) || 'A'}</div>
                                                            <span className="text-[10px] font-black uppercase text-slate-500">{currentUser?.name || 'Admin'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 uppercase text-xs">{stores.find(s => s.id === p.storeId)?.name}</td>
                                                    <td className="px-8 py-6 text-right font-black line-through decoration-red-500">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <ActionButtons
                                                            size="sm"
                                                            onView={() => setShowStorePaymentDetail(p)}
                                                            onPrint={() => handlePrintThermal('store_payment', p.id)}
                                                            onWhatsApp={() => shareViaWhatsApp(getStorePaymentDocData(p))}
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PAGOS A PROVEEDORES ANULADOS */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                            <div className="px-8 py-4 bg-slate-600 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Bóveda: Pagos a Prov. Anulados</h3>
                                    <p className="text-[9px] opacity-70 uppercase tracking-widest">Egresos Reversados a Proveedores</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black tracking-tighter">${cancelledSupplierPaymentsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                                        <tr>
                                            <th className="px-8 py-5 text-center w-12 text-slate-400">#</th>
                                            <th className="px-8 py-5 text-left">Referencia</th>
                                            <th className="px-8 py-5 text-left">Fecha y Hora</th>
                                            <th className="px-8 py-5 text-left">Proveedor</th>
                                            <th className="px-8 py-5 text-right opacity-50">Monto</th>
                                            <th className="px-8 py-5 text-center">Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-400">
                                        {cancelledSupplierPayments.length === 0 ? (
                                            <tr><td colSpan={6} className="px-8 py-12 text-center text-xs font-bold uppercase tracking-widest text-gray-300">Sin pagos a proveedores anulados</td></tr>
                                        ) : (
                                            cancelledSupplierPayments.map((p, idx) => (
                                                <tr key={p.id} className="hover:bg-red-50 transition-colors group">
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-[10px] font-black text-gray-400 group-hover:bg-white transition-colors">{idx + 1}</div>
                                                    </td>
                                                    <td className="px-8 py-6 font-black line-through decoration-red-500">{p.reference}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col opacity-60">
                                                            <span className="font-black text-slate-900 text-xs">{p.date.split(',')[0]}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.date.split(',')[1]?.trim() || '---'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 uppercase text-xs">{suppliers.find(s => s.id === p.supplierId)?.name || 'Desconocido'}</td>
                                                    <td className="px-8 py-6 text-right font-black line-through decoration-red-500">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <ActionButtons
                                                            size="sm"
                                                            onView={() => setShowSupplierPaymentDetail(p)}
                                                            onPrint={() => handlePrintThermal('payment', p.id)}
                                                            onWhatsApp={() => shareViaWhatsApp(getSupplierPaymentDocData(p))}
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDispatchDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6 no-print">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-gray-900 text-white flex justify-between items-center">
                            <div>
                                <h4 className="text-lg font-black uppercase tracking-widest">Detalle Operativo</h4>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Folio Maestro #{showDispatchDetail.dispatchNumber}</p>
                            </div>
                            <button onClick={() => setShowDispatchDetail(null)} className="p-2 bg-gray-800 rounded-md text-white hover:bg-gray-700 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="max-h-[400px] overflow-y-auto pr-4 space-y-4">
                                {showDispatchDetail.items.map((item, idx) => {
                                    const p = products.find(prod => prod.id === item.productId);
                                    return (
                                        <div key={idx} className="bg-white p-4 rounded-md border border-gray-100 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 bg-gray-50 rounded border border-gray-100 flex items-center justify-center p-1"><img src={p?.imageUrl} className="max-h-full object-contain" alt="" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-900 uppercase leading-none">{p?.name}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Cantidad: {item.quantity} {p?.presentation ? `| ${p.presentation}` : ''}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-gray-900 tracking-tighter">${(item.unitSupplyPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="pt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                                <div className="text-right flex-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Totalizado del Movimiento</p>
                                    <p className="text-2xl font-black text-orange-600">${showDispatchDetail.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                {showDispatchDetail.authorizedBy && (
                                    <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 ml-4">
                                        <p className="text-[8px] font-black text-emerald-600 uppercase text-center">Autorizado</p>
                                        <p className="text-[10px] font-black text-emerald-900 uppercase italic">{showDispatchDetail.authorizedBy}</p>
                                    </div>
                                )}
                                <button onClick={() => setShowDispatchDetail(null)} className="ml-8 bg-gray-900 text-white px-8 py-3 rounded font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-colors">Cerrar Detalle</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showStorePaymentDetail && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowStorePaymentDetail(null)}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-8 bg-emerald-600 text-white border-b-8 border-emerald-700 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-widest">Recibo de Abono</h4>
                                <p className="text-xs font-bold opacity-60">REF: {showStorePaymentDetail.reference || showStorePaymentDetail.id.substr(-6)}</p>
                            </div>
                            <button onClick={() => setShowStorePaymentDetail(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Recibido</p>
                                <p className="text-5xl font-black text-emerald-600 tracking-tighter">${showStorePaymentDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-6 border-y border-dashed border-gray-100 text-left">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Sucursal</p>
                                    <p className="text-sm font-black text-gray-800 uppercase">{stores.find(st => st.id === showStorePaymentDetail.storeId)?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Método</p>
                                    <p className="text-sm font-black text-gray-800 uppercase">{showStorePaymentDetail.method}</p>
                                </div>
                            </div>
                            {showStorePaymentDetail.authorizedBy && (
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Documento Autorizado</span>
                                    <span className="text-xs font-black text-emerald-900 italic uppercase">POR: {showStorePaymentDetail.authorizedBy}</span>
                                </div>
                            )}
                            {(showStorePaymentDetail as any).status === 'cancelled' && (
                                <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 text-red-600 font-black uppercase text-xs tracking-widest">
                                    ESTE ABONO HA SIDO ANULADO
                                </div>
                            )}
                        </div>
                        <div className="p-8 bg-gray-50 flex gap-4">
                            <button onClick={() => setShowStorePaymentDetail(null)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">Cerrar</button>
                            <button onClick={() => {
                                if (showStorePaymentDetail) handlePrintThermal('store_payment', showStorePaymentDetail.id);
                            }} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            {showSupplierPaymentDetail && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowSupplierPaymentDetail(null)}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-8 bg-red-600 text-white border-b-8 border-red-700 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-widest">Comprobante de Pago</h4>
                                <p className="text-xs font-bold opacity-60">REF: {showSupplierPaymentDetail.reference}</p>
                            </div>
                            <button onClick={() => setShowSupplierPaymentDetail(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Pagado</p>
                                <p className="text-5xl font-black text-red-600 tracking-tighter">${showSupplierPaymentDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-6 border-y border-dashed border-gray-100 text-left">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Proveedor</p>
                                    <p className="text-sm font-black text-gray-800 uppercase">{suppliers.find(s => s.id === showSupplierPaymentDetail.supplierId)?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Método</p>
                                    <p className="text-sm font-black text-gray-800 uppercase">{showSupplierPaymentDetail.method}</p>
                                </div>
                            </div>
                            {showSupplierPaymentDetail.authorizedBy && (
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Documento Autorizado</span>
                                    <span className="text-xs font-black text-emerald-900 italic uppercase">POR: {showSupplierPaymentDetail.authorizedBy}</span>
                                </div>
                            )}
                            {(showSupplierPaymentDetail as any).status === 'cancelled' && (
                                <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 text-red-600 font-black uppercase text-xs tracking-widest">
                                    ESTE PAGO HA SIDO ANULADO
                                </div>
                            )}
                        </div>
                        <div className="p-8 bg-gray-50 flex gap-4">
                            <button onClick={() => setShowSupplierPaymentDetail(null)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">Cerrar</button>
                            <button onClick={() => {
                                if (showSupplierPaymentDetail) handlePrintThermal('payment', showSupplierPaymentDetail.id);
                            }} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            {showInvoiceDetail && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowInvoiceDetail(null)}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-8 bg-indigo-600 text-white border-b-4 border-indigo-700 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-widest">Detalle de Factura</h4>
                                <p className="text-xs font-bold opacity-60">#{showInvoiceDetail.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setShowInvoiceDetail(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-8 border-b border-dashed border-gray-100 pb-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Proveedor</p>
                                    <p className="text-sm font-black text-gray-800 uppercase">{suppliers.find(s => s.id === showInvoiceDetail.supplierId)?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha</p>
                                    <p className="text-sm font-black text-gray-800 uppercase">{showInvoiceDetail.date}</p>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto pr-4 space-y-3">
                                {showInvoiceDetail.items.map((item, idx) => {
                                    const p = products.find(prod => prod.id === item.productId);
                                    return (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                            <div className="flex gap-3 items-center">
                                                <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-gray-100"><img src={p?.imageUrl} className="max-h-full object-contain" alt="" /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-800 uppercase">{p?.name || 'Insumo'}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Cant: {item.quantity} x ${item.unitCost.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <p className="font-black text-indigo-600 text-sm">${(item.quantity * item.unitCost).toLocaleString()}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-6 border-t font-black flex justify-between items-center">
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Total de Factura</p>
                                    <p className="text-3xl text-indigo-600 tracking-tighter">${showInvoiceDetail.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                {showInvoiceDetail.authorizedBy && (
                                    <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 ml-4">
                                        <p className="text-[8px] font-black text-emerald-600 uppercase text-center">Autorizado</p>
                                        <p className="text-[10px] font-black text-emerald-900 uppercase italic">{showInvoiceDetail.authorizedBy}</p>
                                    </div>
                                )}
                                <button onClick={() => setShowInvoiceDetail(null)} className="bg-gray-900 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
