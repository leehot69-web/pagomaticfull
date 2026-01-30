import React, { useState, useEffect, useRef } from 'react';
import type { Product, Supplier } from '../types';
import { SearchIcon, ActivityIcon, DollarSignIcon, TrashIcon, XIcon } from './IconComponents';
import { useNotifications } from '../NotificationSystem';
import { ActionButtons, printDocument, shareViaWhatsApp, PrintIcon, type DocumentData } from '../utils/shareUtils';
import { printThermal, type PrinterSize } from '../utils/thermalPrinterUtils';

interface ProductsDashboardProps {
    products: Product[];
    suppliers: Supplier[];
    onAddProduct: (p: any) => void;
    onUpdateProduct: (id: string, updates: any) => void;
    onDeleteProduct: (id: string) => void;
    onManualAdjust?: (pId: string, qty: number, rsn: string) => void;
    printerSize?: string;
    isAdmin?: boolean;
}

export const ProductsDashboard: React.FC<ProductsDashboardProps> = ({
    products = [], suppliers = [], onAddProduct, onUpdateProduct, onDeleteProduct, onManualAdjust,
    printerSize = '80mm', isAdmin = false
}) => {
    const { notify, confirm } = useNotifications();
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdjustModal, setShowAdjustModal] = useState<Product | null>(null);
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustReason, setAdjustReason] = useState('Compra Directa Dueño (Sin Factura)');

    const searchInputRef = useRef<HTMLInputElement>(null);

    // ATAJOS DE TECLADO CONTEXTUALES (F1-F12)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    if (view !== 'add') {
                        setForm({
                            name: '',
                            supplierId: suppliers[0]?.id || '',
                            purchaseCost: 0,
                            purchaseTax: 0,
                            purchaseFreight: 0,
                            supplyPrice: 0,
                            retailPrice: 0,
                            brand: '',
                            presentation: '',
                            imageUrl: 'https://placehold.co/400x400/0D254C/FFFFFF/png?text=Producto',
                            color: '#3b82f6'
                        });
                        setView('add');
                    }
                    break;
                case 'F2':
                    e.preventDefault();
                    if (view === 'list') searchInputRef.current?.focus();
                    break;
                case 'F10':
                    e.preventDefault();
                    setView('list');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, suppliers]);

    const [form, setForm] = useState({
        name: '',
        supplierId: '',
        purchaseCost: 0,
        purchaseTax: 0,
        purchaseFreight: 0,
        supplyPrice: 0,
        retailPrice: 0,
        brand: '',
        presentation: '',
        imageUrl: 'https://placehold.co/400x400/0D254C/FFFFFF/png?text=Producto',
        color: '#3b82f6'
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    const handleSave = () => {
        const supplierName = suppliers.find(s => s.id === form.supplierId)?.name || 'Sin Proveedor';
        const productData = { ...form, supplierName };

        if (view === 'add') {
            onAddProduct(productData);
            notify('Producto creado con éxito', 'success');
        } else if (selectedProduct) {
            onUpdateProduct(selectedProduct.id, productData);
            notify('Producto actualizado', 'success');
        }
        setView('list');
    };

    const handleConfirmAdjustment = async () => {
        if (!showAdjustModal || !adjustQty) return;
        const qty = Number(adjustQty);
        const isLoss = qty < 0;

        if (qty === 0) {
            notify('Ingrese una cantidad distinta de cero', 'warning');
            return;
        }

        if (await confirm({
            message: isLoss
                ? `¿CONFIRMAR NOTA DE BAJA? Se restarán ${Math.abs(qty)} unidades de "${showAdjustModal.name}" como pérdida (Merma/Siniestro).`
                : `¿CONFIRMAR ENTRADA DIRECTA? Se sumarán ${qty} unidades al stock de "${showAdjustModal.name}" sin generar deuda.`,
            confirmText: isLoss ? 'CONFIRMAR PÉRDIDA' : 'CONFIRMAR ENTRADA'
        })) {
            if (onManualAdjust) {
                onManualAdjust(showAdjustModal.id, qty, adjustReason);
                notify(isLoss ? 'Baja de inventario registrada' : 'Stock actualizado manualmente', isLoss ? 'warning' : 'success');
                setShowAdjustModal(null);
                setAdjustQty('');
            }
        }
    };

    const handlePrintInventory = () => {
        const docData: DocumentData = {
            type: 'store_inventory',
            id: `inv-rep-${Date.now()}`,
            reference: `INV-${new Date().toISOString().split('T')[0]}`,
            date: new Date().toLocaleString(),
            amount: products.reduce((acc, p) => acc + (p.stock * p.purchaseCost), 0),
            items: products.map(p => ({
                name: p.name,
                quantity: p.stock,
                unitPrice: p.supplyPrice
            }))
        };
        printThermal(docData, { size: (printerSize as PrinterSize), printCount: 0 });
        notify('Generando reporte técnico de inventario térmico...', 'info');
    };

    const renderList = () => (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                <div className="relative w-full md:w-96">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400" />
                    </span>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar en el catálogo..."
                        className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-brand-primary transition-all font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => {
                        setForm({
                            name: '',
                            supplierId: suppliers[0]?.id || '',
                            purchaseCost: 0,
                            purchaseTax: 0,
                            purchaseFreight: 0,
                            supplyPrice: 0,
                            retailPrice: 0,
                            brand: '',
                            presentation: '',
                            imageUrl: 'https://placehold.co/400x400/0D254C/FFFFFF/png?text=Producto',
                            color: '#3b82f6'
                        });
                        setView('add');
                    }}
                    className="bg-brand-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all"
                >
                    + Nuevo Producto
                </button>
            </div>

            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-4 pb-20">
                    {filteredProducts.map(p => (
                        <div key={p.id} className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100 flex flex-col group hover:shadow-lg transition-all h-full">
                            <div className="h-32 bg-gray-50 flex items-center justify-center p-4 relative shrink-0">
                                {isAdmin && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteProduct(p.id); }}
                                        className="absolute top-2 left-2 p-1.5 bg-white/90 text-gray-300 hover:text-red-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="Eliminar Producto"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black shadow-sm uppercase ${p.stock <= 5 ? 'bg-red-500 text-white' :
                                        p.stock >= 500 ? 'bg-orange-500 text-white' :
                                            'bg-white/80 text-gray-500'
                                        }`}>
                                        Stock: {p.stock}
                                    </div>
                                    <div className="w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: p.color }}></div>
                                </div>
                                <img src={p.imageUrl} alt={p.name} className="max-h-full object-contain group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="p-4 flex-grow flex flex-col">
                                <p className="text-[8px] font-black uppercase text-brand-primary mb-1 truncate">{p.supplierName} {p.brand ? `• ${p.brand}` : ''}</p>
                                <h4 className="font-black text-gray-800 uppercase text-xs leading-tight mb-1 line-clamp-2">{p.name}</h4>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-3">{p.presentation || 'Sin presentación'}</p>

                                <div className="space-y-1 mb-4 bg-gray-50 p-3 rounded-xl">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[8px] font-black text-gray-400 uppercase">Suministro</span>
                                        <span className="font-black text-brand-primary text-base">${(p.supplyPrice || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setShowAdjustModal(p)}
                                        className="bg-emerald-50 text-emerald-600 border border-emerald-100 py-2 rounded-xl font-black uppercase text-[8px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        title="Incrementar Stock Manual"
                                    >
                                        + Stock
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedProduct(p);
                                            setForm({
                                                ...p,
                                                brand: p.brand || '',
                                                presentation: p.presentation || ''
                                            });
                                            setView('edit');
                                        }}
                                        className="bg-gray-50 py-2 rounded-xl font-black uppercase text-[8px] tracking-widest text-gray-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                                    >
                                        Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[40px] p-20 text-center border-4 border-dashed border-gray-100 mx-4">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ActivityIcon className="text-gray-300 w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">Catálogo Vacío</h3>
                    <p className="text-gray-400 font-bold mt-2">No se encontraron productos en el inventario.</p>
                </div>
            )}
        </div>
    );

    const renderForm = () => (
        <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 border-2 animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-10 border-b flex justify-between items-center bg-gray-50/50">
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Ficha de Producto</h3>
                <button onClick={() => setView('list')} className="text-gray-400 hover:text-red-500 transition-colors">
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest font-mono">Nombre del Producto</label>
                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none focus:border-brand-primary" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest font-mono">Proveedor Principal</label>
                        <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none">
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest font-mono">Marca</label>
                            <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none focus:border-brand-primary" placeholder="Ej. Kraft, Plumrose..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest font-mono">Presentación</label>
                            <input type="text" value={form.presentation} onChange={e => setForm({ ...form, presentation: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none focus:border-brand-primary" placeholder="Ej. 1Kg, Pack x12..." />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900 p-10 rounded-[32px] text-white">
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest font-mono">Precio Suministro ($)</label>
                            <input type="number" step="0.01" value={form.supplyPrice} onChange={e => setForm({ ...form, supplyPrice: Number(e.target.value) })} className="w-full bg-transparent border-b-4 border-brand-primary text-5xl font-black outline-none" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-10 bg-gray-50 flex gap-4">
                <button onClick={() => setView('list')} className="flex-1 py-4 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button onClick={handleSave} className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Guardar en Catalogo</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-end no-print px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handlePrintInventory}
                        className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-brand-primary transition-all shadow-lg"
                    >
                        <PrintIcon className="w-4 h-4" /> Imp. Inventario
                    </button>
                    <div className="bg-brand-primary p-4 rounded-3xl shadow-2xl"><ActivityIcon className="w-10 h-10 text-white" /></div>
                    <div>
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-0.5">Logística Central</p>
                        <h2 className="text-4xl font-black text-gray-900 mb-1 uppercase tracking-tighter">Inventario Maestro</h2>
                        <p className="text-gray-400 font-bold text-sm">Control de Stock y Suministros B2B.</p>
                    </div>
                </div>
            </div>
            {view === 'list' && renderList()}
            {(view === 'add' || view === 'edit') && renderForm()}

            {showAdjustModal && (() => {
                const isLoss = Number(adjustQty) < 0;
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className={`p-10 border-b-8 transition-colors ${isLoss ? 'bg-red-600 border-red-700' : 'bg-emerald-600 border-emerald-700'} text-white`}>
                                <h4 className="text-3xl font-black uppercase tracking-tighter">
                                    {isLoss ? 'Nota de Baja (Pérdida)' : 'Entrada de Stock Directa'}
                                </h4>
                                <p className="text-xs font-bold uppercase mt-2 opacity-60">Producto: {showAdjustModal.name}</p>
                            </div>
                            <div className="p-10 space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">
                                        {isLoss ? 'Cantidad a Retirar (Pérdida)' : 'Cantidad a Ingresar (Producción)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={adjustQty}
                                        onChange={e => setAdjustQty(e.target.value)}
                                        className={`w-full bg-gray-50 border-4 border-gray-100 p-8 rounded-[2.5rem] text-6xl font-black outline-none transition-colors text-center ${isLoss ? 'text-red-600 focus:border-red-500' : 'text-emerald-600 focus:border-emerald-500'}`}
                                        placeholder="0"
                                        autoFocus
                                    />
                                    <p className="mt-4 text-center text-[10px] font-bold text-gray-400 uppercase">
                                        {isLoss ? 'Use números negativos para registrar pérdidas' : 'Use números positivos para registrar producción local'}
                                    </p>
                                </div>

                                {!isLoss && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-2">N° RESPALDO: Orden de Producción / Compra (*) </label>
                                        <input
                                            type="text"
                                            value={adjustReason.startsWith('ORD-') ? adjustReason : ''}
                                            onChange={e => setAdjustReason(e.target.value.toUpperCase())}
                                            className="w-full bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl font-black outline-none text-sm text-emerald-900 placeholder:text-emerald-200"
                                            placeholder="EJ: ORD-2024-001"
                                            required
                                        />
                                        <p className="mt-2 text-[9px] font-bold text-emerald-400 uppercase">Este campo es OBLIGATORIO para cargar inventario manual.</p>
                                    </div>
                                )}

                                {isLoss && (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Motivo / Observación del Auditor</label>
                                        <input
                                            type="text"
                                            value={adjustReason}
                                            onChange={e => setAdjustReason(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold outline-none text-xs text-gray-500 uppercase"
                                            placeholder="Ej: Producto vencido, Robo, Error de conteo..."
                                        />
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => { setShowAdjustModal(null); setAdjustReason(''); }} className="flex-1 font-black text-xs uppercase text-gray-400 tracking-widest">Cancelar</button>
                                    <button
                                        onClick={() => {
                                            if (!isLoss && (!adjustReason || adjustReason.length < 3)) {
                                                notify('DEBE INGRESAR UN NÚMERO DE ORDEN DE RESPALDO', 'error');
                                                return;
                                            }
                                            handleConfirmAdjustment();
                                        }}
                                        className={`flex-1 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl transition-all text-white ${isLoss ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                    >
                                        {isLoss ? 'Aplicar Baja' : 'Cargar Inventario'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* BARRA DE ATAJOS ESTILO POS (FOOTER) */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white h-10 flex items-center px-6 gap-6 z-50 overflow-x-auto no-print">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-gray-300">F1</span>
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Nuevo Insumo</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-gray-300">F2</span>
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Buscar</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-gray-300">F10</span>
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Volver a Lista</span>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Almacén Central Activo</span>
                </div>
            </div>
        </div>
    );
};
