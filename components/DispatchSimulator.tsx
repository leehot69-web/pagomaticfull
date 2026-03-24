import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import type { Product, CartItem, Store, StockDispatch } from '../types';
import { SearchIcon, ActivityIcon, StoreIcon, XIcon, LogoIcon } from './IconComponents';
import { ActionButtons, PrintIcon, WhatsAppIcon, printDocument, shareViaWhatsApp, type DocumentData } from '../utils/shareUtils';
import { printThermal, smartPrint, getPrintButtonLabel, type PrinterSize } from '../utils/thermalPrinterUtils';
import { useNotifications } from '../NotificationSystem';

interface DispatchSimulatorProps {
    products: Product[];
    stores: Store[];
    dispatches: StockDispatch[];
    selectedStoreId: string;
    onStoreChange: (id: string) => void;
    onProcessDispatch: (dispatchNumber: string, driver?: string, plate?: string) => Promise<any>;
    cart: CartItem[];
    onAddToCart: (product: Product) => void;
    onRemoveFromCart: (productId: string) => void;
    onUpdateCartQuantity: (productId: string, quantity: number) => void;
    onClearCart: () => void;
    onAddStore: (store: any) => void;
    nextDispatchNumber: string;
    currentUser?: any;
    printerSize?: string;
    onIncrementDispatchPrintCount?: (id: string) => void;
    pinnedBrands?: string[];
    showBrandFilter?: boolean;
}

interface LastDispatchInfo {
    dispatchNumber: string;
    storeName: string;
    storeAddress: string;
    driverName: string;
    vehiclePlate: string;
    total: number;
    items: { name: string; quantity: number; unitPrice: number }[];
    id?: string;
    dueDate?: string;
}

export const DispatchSimulator: React.FC<DispatchSimulatorProps> = ({
    products,
    stores,
    dispatches,
    selectedStoreId,
    onStoreChange,
    onProcessDispatch,
    cart,
    onAddToCart,
    onRemoveFromCart,
    onUpdateCartQuantity,
    onClearCart,
    onAddStore,
    nextDispatchNumber,
    currentUser,
    printerSize = '80mm',
    onIncrementDispatchPrintCount,
    pinnedBrands = [],
    showBrandFilter = true
}) => {
    const { notify, confirm } = useNotifications();
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [logistics, setLogistics] = useState({ driverName: '', vehiclePlate: '' });
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastDispatch, setLastDispatch] = useState<LastDispatchInfo | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const getLastDispatchDocData = (): DocumentData | null => {
        if (!lastDispatch) return null;
        return {
            type: 'dispatch',
            id: 'last',
            reference: lastDispatch.dispatchNumber,
            date: new Date().toLocaleDateString(),
            amount: lastDispatch.total,
            storeName: lastDispatch.storeName,
            storeAddress: lastDispatch.storeAddress,
            driverName: lastDispatch.driverName,
            vehiclePlate: lastDispatch.vehiclePlate,
            items: lastDispatch.items,
            generatedBy: currentUser?.name,
            userRole: currentUser?.roles?.join(', '),
            authorizedBy: currentUser?.roles?.includes('ADMIN') ? currentUser?.name : undefined,
            dueDate: lastDispatch.dueDate
        };
    };

    const handlePrintThermal = (id: string | undefined) => {
        const d = dispatches.find(disp => disp.id === id);
        const docData = getLastDispatchDocData();
        if (docData) {
            smartPrint(docData, { size: (printerSize as PrinterSize), printCount: d?.printCount || 0 }, printDocument);
            onIncrementDispatchPrintCount?.(id || '');
        }
    };

    // Keyboard shortcuts removed as per user request

    const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
    const selectedStore = useMemo(() => stores.find(s => s.id === selectedStoreId), [stores, selectedStoreId]);
    const cartTotal = cart.reduce((total, item) => total + item.supplyPrice * item.quantity, 0);

    const isOverLimit = useMemo(() => {
        if (!selectedStore || !selectedStore.config?.maxDebtLimit) return false;
        return (selectedStore.totalDebt + cartTotal) > selectedStore.config.maxDebtLimit;
    }, [selectedStore, cartTotal]);

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F8' && cart.length > 0 && selectedStoreId && !isOverLimit) {
                e.preventDefault();
                handlePreProcess();
            }
            if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, selectedStoreId, isOverLimit]);

    useEffect(() => {
        if (selectedStoreId && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [selectedStoreId]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            // Usamos Brand como categoría temporal ya que category no existe en el tipo
            const matchesCategory = selectedCategory === 'TODOS' || (p.brand || '').toUpperCase() === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    // Categorías Únicas basadas en Marca
    const categories = useMemo(() => {
        if (pinnedBrands.length > 0) {
            return ['TODOS', ...pinnedBrands.map(b => b.toUpperCase())];
        }
        const cats = new Set<string>();
        products.forEach(p => { if (p.brand) cats.add(p.brand.toUpperCase()); });
        return ['TODOS', ...Array.from(cats).sort().slice(0, 5)];
    }, [products, pinnedBrands]);

    const [newStore, setNewStore] = useState({
        name: '',
        manager: '',
        phone: '',
        address: '',
        maxDebtLimit: 20000,
        paymentTermDays: 15
    });

    const handlePreProcess = () => {
        if (cart.length === 0 || !selectedStoreId || isOverLimit) return;
        setShowReviewModal(true);
    };

    const handleFinalConfirm = async () => {
        setIsProcessing(true);
        const dispatchInfo: LastDispatchInfo = {
            dispatchNumber: nextDispatchNumber,
            storeName: selectedStore?.name || '',
            storeAddress: selectedStore?.location || '',
            driverName: logistics.driverName,
            vehiclePlate: logistics.vehiclePlate,
            total: cartTotal,
            items: cart.map(item => ({ name: item.name, quantity: item.quantity, unitPrice: item.supplyPrice })),
            dueDate: (() => {
                const d = new Date();
                d.setDate(d.getDate() + (selectedStore?.config?.paymentTermDays || 15));
                return d.toLocaleDateString();
            })()
        };

        const result = (await onProcessDispatch(nextDispatchNumber, logistics.driverName, logistics.vehiclePlate)) as any;
        setIsProcessing(false);
        if (result && result.success) {
            if (result.pending) {
                // Si está pendiente, no mostramos el modal de éxito con botones de impresión
                // handleDispatch en App.tsx ya mandó el notify
                setLogistics({ driverName: '', vehiclePlate: '' });
                setShowReviewModal(false);
            } else {
                setLastDispatch({ ...dispatchInfo, id: result.id });
                setShowReviewModal(false);
                setShowSuccess(true);
                setLogistics({ driverName: '', vehiclePlate: '' });
            }
        }
    };



    return (
        <div className="h-screen flex font-sans bg-[#f4f7fa] overflow-hidden">
            {/* MAIN CONTENT AREA */}
            <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 h-full`}>
                <div className="flex-1 p-6 space-y-6 flex flex-col h-full overflow-hidden">

                    {!selectedStore ? (
                        /* SELECTION VIEW */
                        <div className="space-y-8 animate-in fade-in duration-500 flex-1">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Seleccione <span className="text-brand-primary">Sucursal</span></h2>
                                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-none mt-1">Directorio de Puntos de Venta Autorizados</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowStoreModal(true)}
                                        className="bg-green-700 text-white px-6 py-3 rounded-md font-black uppercase text-xs tracking-widest hover:bg-green-600 transition-all shadow-lg flex items-center gap-2 z-10 border border-green-800"
                                    >
                                        <StoreIcon className="w-5 h-5 fill-current" />
                                        <span>+ Nueva Sucursal</span>
                                    </button>
                                    <div className="bg-white px-6 py-3 rounded-md border border-gray-300 italic text-[10px] font-bold text-gray-500 shadow-sm">
                                        Total: {stores.length}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 overflow-y-auto max-h-[calc(100vh-200px)] pr-4 custom-scrollbar">
                                {stores.filter(st => st.active !== false).map(st => {
                                    const creditLimit = st.config?.maxDebtLimit || 0;
                                    const availableCredit = Math.max(0, creditLimit - st.totalDebt);
                                    const creditUsagePercent = creditLimit > 0 ? Math.min(100, (st.totalDebt / creditLimit) * 100) : 0;
                                    const isDeudaCritica = creditUsagePercent > 90;

                                    return (
                                        <button
                                            key={st.id}
                                            onClick={() => onStoreChange(st.id)}
                                            className="bg-white rounded-md shadow-md p-8 border border-gray-300 hover:border-brand-primary transition-all group relative overflow-hidden flex flex-col text-left"
                                        >
                                            <div className="relative z-10 flex-1">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200 shadow-sm group-hover:bg-brand-primary transition-colors duration-300">
                                                        <StoreIcon className="w-10 h-10 group-hover:fill-white text-gray-400 group-hover:text-white" />
                                                    </div>
                                                    {st.totalDebt > 0 && (
                                                        <div className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase shadow-sm ${isDeudaCritica ? 'bg-red-600 text-white animate-pulse' : 'bg-[#F97316] text-white'}`}>
                                                            {isDeudaCritica ? 'Límite Crítico' : 'Crédito Activo'}
                                                        </div>
                                                    )}
                                                </div>

                                                <h4 className="font-black text-2xl text-gray-900 uppercase tracking-tighter mb-1 leading-none group-hover:text-brand-primary transition-colors">{st.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">{st.location}</p>

                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Deuda</p>
                                                        <p className="text-lg font-black text-red-600 tracking-tighter">${st.totalDebt.toLocaleString()}</p>
                                                    </div>
                                                    <div className="bg-emerald-50 p-3 rounded-md border border-emerald-200">
                                                        <p className="text-[9px] font-black text-emerald-700/70 uppercase mb-1">Disponible</p>
                                                        <p className="text-lg font-black text-emerald-700 tracking-tighter">${availableCredit.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-400">
                                                        <span>Límite de Crédito</span>
                                                        <span>{creditUsagePercent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-sm overflow-hidden border border-gray-300">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${isDeudaCritica ? 'bg-red-600' : creditUsagePercent > 70 ? 'bg-[#F97316]' : 'bg-emerald-600'}`}
                                                            style={{ width: `${creditUsagePercent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-[9px] font-black text-brand-primary uppercase">Cargar Despacho →</span>
                                                <ActivityIcon className="w-4 h-4 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-md shadow-lg flex-shrink-0 animate-in slide-in-from-top-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-brand-primary p-2 rounded-md"><LogoIcon className="w-6 h-6 text-white" /></div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-tighter">Terminal de Despacho <span className="text-brand-accent">Pagomatic</span></h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sucursal: {selectedStore.name}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Folio de Carga</p>
                                        <p className="text-2xl font-black text-brand-accent tracking-tighter">{nextDispatchNumber}</p>
                                    </div>
                                    <button
                                        onClick={() => onStoreChange('')}
                                        className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/10"
                                    >
                                        <StoreIcon className="w-4 h-4 fill-white" />
                                        Salir / Volver
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0 overflow-hidden">
                                {/* LEFT: PRODUCTS */}
                                <div className="col-span-8 flex flex-col gap-4 h-full min-h-0">
                                    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-300 flex flex-col h-full min-h-0 overflow-hidden">
                                        <div className="flex flex-col gap-3 mb-4 flex-shrink-0">
                                            <div className="relative">
                                                <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    placeholder="Buscar productos (Nombre, Marca, Código) [CTRL+F]..."
                                                    className="w-full pl-16 pr-6 py-4 bg-gray-100 border-2 border-gray-300 rounded-md font-black uppercase text-xs outline-none focus:border-brand-primary focus:bg-white transition-all shadow-inner"
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            
                                            {showBrandFilter && (
                                                <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                                                    {categories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setSelectedCategory(cat)}
                                                            className={`px-4 py-2 rounded-md text-[9px] font-black uppercase transition-all whitespace-nowrap border ${selectedCategory === cat ? 'bg-[#F97316] text-white border-[#F97316] shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pb-4">
                                                {filteredProducts.map(product => {
                                                    const outOfStock = (product.stock || 0) <= 0;
                                                    const inCart = cart.find(c => c.id === product.id);
                                                    return (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => !outOfStock && onAddToCart(product)}
                                                            disabled={outOfStock}
                                                            className={`group bg-white p-3 rounded-md border border-gray-200 hover:border-brand-primary hover:shadow-md transition-all text-left relative overflow-hidden flex flex-col ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                                        >
                                                            {inCart && (
                                                                <div className="absolute top-0 right-0 p-1 bg-[#F97316] text-white text-[10px] font-black shadow-sm rounded-bl-md">
                                                                    x{inCart.quantity}
                                                                </div>
                                                            )}
                                                            <div className="w-12 h-12 bg-gray-50 rounded-md flex items-center justify-center p-2 mb-2 border border-gray-100 shadow-inner"><img src={product.imageUrl} className="max-h-full object-contain" alt={product.name} /></div>
                                                            <div className="flex-1">
                                                                <p className="font-black text-[10px] text-gray-900 uppercase leading-none mb-1 line-clamp-2">{product.name}</p>
                                                                <p className="text-[8px] font-bold text-gray-500 uppercase">{product.brand || 'S/M'}</p>
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                                                <p className="text-xs font-black text-brand-primary">${product.supplyPrice.toLocaleString()}</p>
                                                                <p className="text-[8px] font-bold text-gray-400">{product.stock} DISP</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: CART SUMMARY */}
                                <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
                                    <div className="bg-white rounded-md shadow-xl overflow-hidden border border-gray-300 flex flex-col h-full min-h-0 text-sm">
                                        <div className="px-6 py-4 bg-gray-900 text-white flex-shrink-0 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-base font-black uppercase tracking-tighter">Detalle de Mercancía</h3>
                                                <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{cart.length} Ítems en Selección</p>
                                            </div>
                                            {cart.length > 0 && (
                                                <button
                                                    onClick={onClearCart}
                                                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-md transition-all text-[10px] font-black uppercase border border-red-500/20"
                                                >
                                                    Vaciar
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar bg-gray-100 shadow-inner">
                                            {cart.map(item => (
                                                <div key={item.id} className="flex justify-between items-center group bg-white p-2 rounded-md border border-gray-200 shadow-sm transition-all hover:border-brand-primary">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <button onClick={() => onRemoveFromCart(item.id)} className="w-6 h-6 bg-red-50 text-red-500 rounded-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-all flex-shrink-0 border border-red-100">
                                                            <XIcon className="w-3 h-3" />
                                                        </button>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-black text-gray-900 uppercase truncate">{item.name}</p>
                                                            <p className="text-[8px] font-bold text-gray-500">${item.supplyPrice.toLocaleString()} unid.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center bg-gray-50 rounded border border-gray-300 overflow-hidden">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => onUpdateCartQuantity(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                                                                className="w-12 p-1 text-center font-black text-xs outline-none bg-white focus:bg-brand-primary/10 transition-colors"
                                                            />
                                                        </div>
                                                        <p className="font-black text-gray-900 text-xs w-16 text-right">${(item.supplyPrice * item.quantity).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20"><LogoIcon className="w-16 h-16 mb-4 grayscale" /><p className="text-xs font-black uppercase tracking-widest">Sin Productos</p></div>}
                                        </div>
                                        <div className="p-6 bg-white border-t-2 border-gray-300 flex-shrink-0">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-[10px] font-black text-gray-400 uppercase">Submonto</p>
                                                <p className="text-lg font-black text-gray-900 tracking-tighter">${cartTotal.toLocaleString()}</p>
                                            </div>
                                            <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-100">
                                                <p className="text-[12px] font-black text-gray-900 uppercase">Total a Facturar</p>
                                                <p className="text-4xl font-black text-[#F97316] tracking-tighter">${cartTotal.toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={handlePreProcess}
                                                disabled={cart.length === 0 || !selectedStoreId || isOverLimit}
                                                className={`w-full py-5 rounded-md font-black uppercase text-sm tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${cart.length === 0 || !selectedStoreId || isOverLimit ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-95 shadow-brand-primary/20'}`}
                                            >
                                                {isOverLimit ? 'LÍMITE DE CRÉDITO EXCEDIDO' : 'CONFIRMAR CARGA (F8)'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* FINANCIAL SIDEBAR (RIGHT) */}
            {selectedStore && (
                <div className="w-96 bg-white border-l border-gray-100 shadow-2xl animate-in slide-in-from-right-full duration-500 overflow-y-auto custom-scrollbar no-print flex-shrink-0 h-full">
                    <div className="p-8 space-y-8">
                        <div className="text-center">
                            <div className="w-32 h-32 bg-gray-50 rounded-md flex items-center justify-center border border-gray-100 shadow-sm mx-auto mb-6">
                                <StoreIcon className="w-20 h-20" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">{selectedStore.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">{selectedStore.location}</p>
                        </div>

                        <div className="bg-gray-100 p-6 rounded-md border border-gray-300 shadow-inner">
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-6 border-l-4 border-brand-primary pl-3">Distribución de Capital</p>
                            <div className="h-48 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Libre', value: Math.max(0, (selectedStore.config?.maxDebtLimit || 0) - selectedStore.totalDebt) },
                                                { name: 'Deuda', value: selectedStore.totalDebt }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            <Cell fill="#059669" stroke="#fff" strokeWidth={2} />
                                            <Cell fill="#dc2626" stroke="#fff" strokeWidth={2} />
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                    <p className="text-[8px] font-black text-gray-400 uppercase">DEUDA</p>
                                    <p className="text-2xl font-black text-gray-900">
                                        {((selectedStore.totalDebt / (selectedStore.config?.maxDebtLimit || 1)) * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-l-4 border-orange-500 pl-3">Último Historial</p>
                            <div className="space-y-2">
                                {(dispatches || [])
                                    .filter(d => d.storeId === selectedStore.id)
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                    .slice(0, 5)
                                    .map(d => (
                                        <div key={d.id} className="p-4 bg-white border border-gray-100 rounded-md flex justify-between items-center hover:border-[#F97316] transition-colors cursor-default">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-900 uppercase">#{d.dispatchNumber}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">{d.timestamp.split(',')[0]}</p>
                                            </div>
                                            <p className="text-xs font-black text-gray-900">${d.totalAmount.toLocaleString()}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
                    <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-300">
                        <div className="p-8 bg-gray-900 text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Confirmar Operación</h3>
                            <button onClick={() => setShowReviewModal(false)} className="text-gray-500 hover:text-white"><XIcon className="w-8 h-8" /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="bg-gray-50 p-6 rounded-md border border-gray-100 space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Subtotal:</span>
                                    <span className="text-lg font-black">${cartTotal.toLocaleString()}</span>
                                </div>
                                <div className="border-t-2 border-dashed border-gray-200 pt-4 flex justify-between">
                                    <span className="text-[10px] font-black text-gray-900 uppercase">Total Final:</span>
                                    <span className="text-3xl font-black text-brand-primary">${cartTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={handleFinalConfirm} disabled={isProcessing} className="w-full py-6 bg-[#F97316] text-white rounded-md font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                {isProcessing ? 'Procesando...' : 'Autorizar y Facturar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showStoreModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[400] flex items-center justify-center p-6">
                    <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-300">
                        <div className="p-8 bg-brand-primary text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Nueva Sucursal</h3>
                            <button onClick={() => setShowStoreModal(false)} className="bg-white/20 p-2 rounded-xl hover:bg-white/40"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Nombre Comercial</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-md font-bold text-sm outline-none focus:border-[#F97316] transition-all"
                                        placeholder="Ej. SUCURSAL NORTE"
                                        value={newStore.name}
                                        onChange={e => setNewStore({ ...newStore, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Dirección de Entrega</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-sm outline-none focus:border-brand-primary transition-all"
                                        placeholder="Calle, Ciudad, Sector..."
                                        value={newStore.address}
                                        onChange={e => setNewStore({ ...newStore, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Encargado</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-sm outline-none focus:border-brand-primary transition-all"
                                        placeholder="Nombre Responsable"
                                        value={newStore.manager}
                                        onChange={e => setNewStore({ ...newStore, manager: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Teléfono</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-sm outline-none focus:border-brand-primary transition-all"
                                        placeholder="+56 9..."
                                        value={newStore.phone}
                                        onChange={e => setNewStore({ ...newStore, phone: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Límite de Crédito ($)</label>
                                    <input
                                        type="number"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-sm outline-none focus:border-brand-primary transition-all"
                                        value={newStore.maxDebtLimit}
                                        onChange={e => setNewStore({ ...newStore, maxDebtLimit: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Días de Crédito</label>
                                    <input
                                        type="number"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-sm outline-none focus:border-brand-primary transition-all"
                                        value={(newStore as any).paymentTermDays}
                                        onChange={e => setNewStore({ ...newStore, paymentTermDays: parseInt(e.target.value) || 0 } as any)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onAddStore(newStore);
                                    setShowStoreModal(false);
                                    notify('Sucursal registrada con éxito', 'success');
                                }}
                                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-brand-primary transition-all"
                            >
                                Registrar Sucursal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && lastDispatch && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center p-10">
                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100">
                            <ActivityIcon className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">¡Despacho Exitoso!</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Folio #{lastDispatch.dispatchNumber} Procesado</p>

                        {currentUser?.roles?.includes('ADMIN') && (
                            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 inline-block mb-8">
                                <p className="text-[8px] font-black text-emerald-600 uppercase">Operación Autorizada</p>
                                <p className="text-[10px] font-black text-emerald-900 uppercase italic">POR: {currentUser.name}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handlePrintThermal(lastDispatch.id)} className="flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase"><PrintIcon className="w-4 h-4" /> {getPrintButtonLabel()}</button>
                            <button onClick={() => shareViaWhatsApp(getLastDispatchDocData()!)} className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase"><WhatsAppIcon className="w-4 h-4" /> WhatsApp</button>
                        </div>
                        <button onClick={() => setShowSuccess(false)} className="mt-8 text-[10px] font-black text-gray-400 uppercase hover:text-gray-900">Nueva Operación</button>
                    </div>
                </div>
            )}

            {/* POS FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white h-12 flex items-center px-8 gap-8 z-[100] no-print">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><span className="bg-white/10 px-2 py-1 rounded font-black text-[10px]">F2</span><span className="text-[10px] font-bold text-gray-400 uppercase">Buscar</span></div>
                    <div className="flex items-center gap-2"><span className="bg-white/10 px-2 py-1 rounded font-black text-[10px]">F8</span><span className="text-[10px] font-bold text-brand-accent uppercase">Facturar</span></div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Sistema Auditor en Línea</span>
                </div>
            </div>
        </div>
    );
};
