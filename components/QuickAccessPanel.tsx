import React from 'react';
import {
    ActivityIcon,
    DollarSignIcon,
    UsersIcon,
    WalletIcon,
    ClockIcon,
    SearchIcon
} from './IconComponents';
import { View } from '../constants';

interface QuickAccessPanelProps {
    onNavigate: (view: View) => void;
    storeName: string;
}

// Custom icons for missing ones
const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8a2 2 0 012 2v9H6V9a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8V5a2 2 0 00-2-2H10a2 2 0 00-2 2v3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M12 12h.01" />
    </svg>
);

const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onNavigate, storeName }) => {
    const categories = [
        {
            title: 'Operaciones',
            items: [
                {
                    label: 'Nuevo Despacho',
                    desc: 'Carga de camiones y POS',
                    icon: TruckIcon,
                    color: 'bg-blue-600',
                    view: 'dispatches' as View
                },
                {
                    label: 'Gestión Sucursales',
                    desc: 'Cobros y administración',
                    icon: DollarSignIcon,
                    color: 'bg-emerald-600',
                    view: 'stores' as View
                },
                {
                    label: 'Consultar Stock',
                    desc: 'Inventario en tiempo real',
                    icon: PackageIcon,
                    color: 'bg-orange-500',
                    view: 'inventory' as View
                },
            ]
        },
        {
            title: 'Proveedores',
            items: [
                {
                    label: 'Cargar Factura',
                    desc: 'Entrada de mercancía',
                    icon: FileTextIcon,
                    color: 'bg-indigo-600',
                    view: 'suppliers' as View
                },
                {
                    label: 'Pagar Facturas',
                    desc: 'Egresos a terceros',
                    icon: CreditCardIcon,
                    color: 'bg-rose-600',
                    view: 'suppliers' as View
                },
            ]
        },
        {
            title: 'Control y Auditoría',
            items: [
                {
                    label: 'Bóveda',
                    desc: 'Movimientos anulados',
                    icon: ClockIcon,
                    color: 'bg-slate-800',
                    view: 'reports' as View
                },
                {
                    label: 'Inteligencia',
                    desc: 'Reportes y finanzas',
                    icon: ActivityIcon,
                    color: 'bg-purple-600',
                    view: 'reports' as View
                },
            ]
        },
        {
            title: 'Sistema',
            items: [
                {
                    label: 'Usuarios',
                    desc: 'Gestión de perfiles',
                    icon: UsersIcon,
                    color: 'bg-cyan-600',
                    view: 'personnel' as View
                },
                {
                    label: 'Seguridad',
                    desc: 'Configuración técnica',
                    icon: SettingsIcon,
                    color: 'bg-zinc-700',
                    view: 'security' as View
                },
            ]
        }
    ];

    return (
        <div className="h-full bg-slate-900 text-white p-4 md:p-6 animate-in fade-in duration-700 flex flex-col">
            {/* Header - More Compact */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Accesos Rápidos</h1>
                    <div className="inline-block bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <p className="text-emerald-400 font-black text-[8px] uppercase tracking-[0.2em]">
                            {storeName} • Sesión Maestra
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex gap-3">
                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Online</span>
                    </div>
                </div>
            </div>

            {/* Matrix Grid - Scrollable only if absolutely necessary but optimized for height */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((cat, idx) => (cat.items.length > 0 &&
                        <div key={idx} className="space-y-4">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 border-b border-slate-800 pb-2">
                                {cat.title}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {cat.items.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onNavigate(item.view)}
                                        className="group relative flex flex-col justify-center p-4 rounded-3xl aspect-[1.8/1] transition-all hover:scale-[1.03] active:scale-95 overflow-hidden shadow-2xl border-2 border-white/5 hover:border-white/20"
                                    >
                                        {/* Tile Background */}
                                        <div className={`${item.color} absolute inset-0 opacity-85 group-hover:opacity-100 transition-opacity`}></div>

                                        {/* Dynamic Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

                                        <div className="relative z-10 flex items-center gap-4">
                                            {/* Icon Container - Larger & High Contrast */}
                                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg group-hover:rotate-6 transition-transform shrink-0">
                                                <item.icon className="w-8 h-8 text-white" />
                                            </div>

                                            {/* Headline Text Info */}
                                            <div className="text-left overflow-hidden">
                                                <p className="text-[20px] md:text-[24px] font-[900] leading-[0.9] tracking-tighter text-white uppercase drop-shadow-md group-hover:scale-105 transition-transform origin-left">
                                                    {item.label}
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mt-1 truncate">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Corner Decoration */}
                                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-black/20 rounded-full blur-xl group-hover:bg-white/10 transition-colors"></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Insight - More Compact */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center opacity-40 shrink-0">
                <p className="text-[8px] font-black uppercase tracking-[0.4em]">Pagomatic POS Engine v2.0</p>
                <div className="flex gap-4">
                    <ClockIcon className="w-3 h-3" />
                    <SearchIcon className="w-3 h-3" />
                    <ActivityIcon className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};

export default QuickAccessPanel;
