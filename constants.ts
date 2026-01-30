import { UserRole } from './types';

export type View = 'dashboard' | 'inventory' | 'stores' | 'suppliers' | 'dispatches' | 'reports' | 'security' | 'personnel' | 'quick-access' | 'admin-center';

export type MenuConfig = { view: View, label: string, roles: UserRole[] };

export const MENU_ITEMS: MenuConfig[] = [
    { view: 'quick-access', label: 'Inicio Rápido', roles: ['ADMIN', 'AUDITOR', 'DESPACHOS', 'COMPRAS', 'COBRANZA'] },
    { view: 'admin-center', label: 'Mando de Control', roles: ['ADMIN'] },
    { view: 'dashboard', label: 'Panel de Control', roles: ['ADMIN', 'AUDITOR', 'DESPACHOS', 'COMPRAS', 'COBRANZA'] },
    { view: 'dispatches', label: 'Nuevo Despacho (POS)', roles: ['ADMIN', 'DESPACHOS', 'COMPRAS'] },
    { view: 'inventory', label: 'Inventario / Almacén', roles: ['ADMIN', 'COMPRAS'] },
    { view: 'stores', label: 'Gestión de Sucursales', roles: ['ADMIN', 'COBRANZA'] },
    { view: 'suppliers', label: 'Facturas Proveedores', roles: ['ADMIN', 'COMPRAS'] },
    { view: 'reports', label: 'Finanzas e Inteligencia', roles: ['ADMIN', 'AUDITOR'] },
    { view: 'personnel', label: 'Gestión de Equipo', roles: ['ADMIN'] },
    { view: 'security', label: 'Bóveda y Auditoría', roles: ['ADMIN'] },
];
