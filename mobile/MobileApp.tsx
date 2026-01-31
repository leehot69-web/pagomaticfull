import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { NotificationProvider, useNotifications } from '../NotificationSystem';
import './mobile.css';

// Iconos como componentes simples
const HomeIcon = () => <span>🏠</span>;
const TruckIcon = () => <span>📦</span>;
const MoneyIcon = () => <span>💰</span>;
const ChartIcon = () => <span>📊</span>;
const SettingsIcon = () => <span>⚙️</span>;
const StoreIcon = () => <span>🏪</span>;
const BoxIcon = () => <span>📦</span>;
const AlertIcon = () => <span>⚠️</span>;
const ArrowRightIcon = () => <span>→</span>;
const BackIcon = () => <span>←</span>;
const UserIcon = () => <span>👤</span>;

type MobileView = 'home' | 'stores' | 'store-detail' | 'dispatches' | 'payments' | 'reports' | 'settings';

interface MobileAppContentProps { }

const MobileAppContent: React.FC<MobileAppContentProps> = () => {
    const { notify } = useNotifications();
    const {
        metrics,
        products,
        suppliers,
        stores,
        dispatches,
        invoices,
        payments,
        storePayments,
        currentUser,
        login,
        logout,
        users,
        storeName,
        handleAddStorePayment,
    } = useSimulatedData();

    const [currentView, setCurrentView] = useState<MobileView>('home');
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

    // Calcular alertas pendientes
    const pendingAlerts = React.useMemo(() => {
        const alerts: Array<{ type: string; message: string; icon: string }> = [];

        // Despachos con pagos vencidos
        const now = new Date();
        const overdueDispatches = dispatches.filter(d => {
            if (d.status !== 'active') return false;
            if (!d.dueDate) return false;
            return new Date(d.dueDate) < now;
        });

        if (overdueDispatches.length > 0) {
            alerts.push({
                type: 'overdue',
                message: `${overdueDispatches.length} pago(s) vencido(s)`,
                icon: '💳'
            });
        }

        // Productos con stock bajo
        const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 10));
        if (lowStockProducts.length > 0) {
            alerts.push({
                type: 'stock',
                message: `${lowStockProducts.length} producto(s) con stock bajo`,
                icon: '📦'
            });
        }

        // Facturas pendientes de proveedores
        const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'partial');
        if (pendingInvoices.length > 3) {
            alerts.push({
                type: 'invoices',
                message: `${pendingInvoices.length} facturas por pagar`,
                icon: '📄'
            });
        }

        return alerts;
    }, [dispatches, products, invoices]);

    // Ya no calculamos storeDebts aquí, usamos stores del hook que ya trae totalDebt
    const sortedStores = React.useMemo(() => {
        return [...stores].sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0));
    }, [stores]);

    // Auth móvil
    if (!currentUser) {
        return (
            <div className="mobile-app">
                <div className="mobile-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="mobile-logo" style={{ fontSize: '28px', marginBottom: '8px' }}>PAGOMATIC</div>
                        <p style={{ color: 'var(--mobile-text-muted)', fontSize: '12px' }}>{storeName || 'Sistema de Gestión'}</p>
                    </div>

                    <p style={{ color: 'var(--mobile-text-secondary)', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
                        Seleccione su perfil:
                    </p>

                    <div className="mobile-list">
                        {users.map(u => (
                            <div
                                key={u.id}
                                className="mobile-list-item"
                                onClick={() => login(u.username)}
                            >
                                <div
                                    className="mobile-list-item-avatar"
                                    style={{ background: 'linear-gradient(135deg, #00bcd4, #0097a7)' }}
                                >
                                    {u.name[0]}
                                </div>
                                <div className="mobile-list-item-content">
                                    <div className="mobile-list-item-title">{u.name}</div>
                                    <div className="mobile-list-item-subtitle">{u.roles.join(' • ')}</div>
                                </div>
                                <ArrowRightIcon />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar pantalla según vista actual
    const renderScreen = () => {
        switch (currentView) {
            case 'home':
                return (
                    <>
                        {/* Cards de métricas principales */}
                        <div
                            className="mobile-card mobile-card-highlight"
                            onClick={() => setCurrentView('stores')}
                        >
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">📈</div>
                                <div>
                                    <div className="mobile-card-value">
                                        ${metrics?.totalAccountsReceivable?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </div>
                                    <div className="mobile-card-sublabel">Saldo Pendiente</div>
                                </div>
                                <span className="mobile-card-arrow">→</span>
                            </div>
                        </div>

                        <div className="mobile-card">
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">💳</div>
                                <div>
                                    <div className="mobile-card-label">Por Pagar</div>
                                    <div className="mobile-card-value">
                                        ${metrics?.totalAccountsPayable?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </div>
                                    <div className="mobile-card-sublabel">Deuda Actual</div>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-card">
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">📦</div>
                                <div>
                                    <div className="mobile-card-label">Inventario</div>
                                    <div className="mobile-card-value">
                                        ${metrics?.inventoryValueAtCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </div>
                                    <div className="mobile-card-sublabel">Valor Total en Stock</div>
                                </div>
                            </div>
                        </div>

                        {/* Alertas */}
                        {pendingAlerts.length > 0 && (
                            <div className="mobile-card mobile-alert-card">
                                <div className="mobile-alert-content">
                                    <div className="mobile-alert-icon">⚠️</div>
                                    <div className="mobile-alert-text">
                                        <h4>{pendingAlerts.length} Alertas Pendientes</h4>
                                        <p>Toca para ver detalles</p>
                                    </div>
                                </div>
                                <div className="mobile-alert-badges">
                                    {pendingAlerts.slice(0, 3).map((alert, i) => (
                                        <div key={i} className="mobile-alert-badge">{alert.icon}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Acciones rápidas */}
                        <div className="mobile-quick-actions">
                            <div className="mobile-quick-action" onClick={() => setCurrentView('dispatches')}>
                                <div className="mobile-quick-action-icon">🚚</div>
                                <span>Despacho</span>
                            </div>
                            <div className="mobile-quick-action" onClick={() => setCurrentView('payments')}>
                                <div className="mobile-quick-action-icon">💵</div>
                                <span>Cobrar</span>
                            </div>
                            <div className="mobile-quick-action" onClick={() => setCurrentView('stores')}>
                                <div className="mobile-quick-action-icon">🏪</div>
                                <span>Sucursales</span>
                            </div>
                            <div className="mobile-quick-action" onClick={() => setCurrentView('reports')}>
                                <div className="mobile-quick-action-icon">📊</div>
                                <span>Reportes</span>
                            </div>
                        </div>

                        {/* Lista de sucursales con deuda */}
                        <h3 className="mobile-section-title">Sucursales con Saldo</h3>
                        <div className="mobile-list">
                            {sortedStores
                                .filter(s => s.totalDebt > 0)
                                .slice(0, 5)
                                .map(store => (
                                    <div
                                        key={store.id}
                                        className="mobile-list-item"
                                        onClick={() => {
                                            setSelectedStoreId(store.id);
                                            setCurrentView('store-detail');
                                        }}
                                    >
                                        <div
                                            className="mobile-list-item-avatar"
                                            style={{ background: store.color || '#3b82f6' }}
                                        >
                                            {store.name[0]}
                                        </div>
                                        <div className="mobile-list-item-content">
                                            <div className="mobile-list-item-title">{store.name}</div>
                                            <div className="mobile-list-item-subtitle">{store.location}</div>
                                        </div>
                                        <div className="mobile-list-item-value">
                                            <div className="mobile-list-item-amount danger">
                                                ${store.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="mobile-list-item-badge">Pendiente</div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                );

            case 'stores':
                return (
                    <>
                        <button className="mobile-back-btn" onClick={() => setCurrentView('home')}>
                            <BackIcon /> Inicio
                        </button>

                        <h3 className="mobile-section-title">Todas las Sucursales</h3>
                        <div className="mobile-list">
                            {sortedStores.map(store => (
                                <div
                                    key={store.id}
                                    className="mobile-list-item"
                                    onClick={() => {
                                        setSelectedStoreId(store.id);
                                        setCurrentView('store-detail');
                                    }}
                                >
                                    <div
                                        className="mobile-list-item-avatar"
                                        style={{ background: store.color || '#3b82f6' }}
                                    >
                                        {store.name[0]}
                                    </div>
                                    <div className="mobile-list-item-content">
                                        <div className="mobile-list-item-title">{store.name}</div>
                                        <div className="mobile-list-item-subtitle">{store.location}</div>
                                    </div>
                                    <div className="mobile-list-item-value">
                                        <div className={`mobile-list-item-amount ${store.totalDebt > 0 ? 'danger' : 'success'}`}>
                                            ${store.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="mobile-list-item-badge">
                                            {store.totalDebt > 0 ? 'Debe' : 'Al día'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );

            case 'store-detail':
                const store = stores.find(s => s.id === selectedStoreId);
                if (!store) return null;

                const storeDispatchesList = dispatches
                    .filter(d => d.storeId === store.id && d.status === 'active')
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                return (
                    <>
                        <button className="mobile-back-btn" onClick={() => setCurrentView('stores')}>
                            <BackIcon /> Sucursales
                        </button>

                        <div className="mobile-detail-header">
                            <div
                                className="mobile-detail-avatar"
                                style={{ background: store.color || '#3b82f6' }}
                            >
                                {store.name[0]}
                            </div>
                            <div className="mobile-detail-title">{store.name}</div>
                            <div className="mobile-detail-subtitle">{store.location}</div>
                        </div>

                        <div className="mobile-detail-stats">
                            <div className="mobile-detail-stat">
                                <div className="mobile-detail-stat-value" style={{ color: store.totalDebt > 0 ? 'var(--mobile-danger)' : 'var(--mobile-success)' }}>
                                    ${store.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="mobile-detail-stat-label">Deuda Total</div>
                            </div>
                            <div className="mobile-detail-stat">
                                <div className="mobile-detail-stat-value">{storeDispatchesList.length}</div>
                                <div className="mobile-detail-stat-label">Despachos Activos</div>
                            </div>
                        </div>

                        <button
                            className="mobile-btn mobile-btn-primary"
                            onClick={() => {
                                notify('Función de cobro próximamente', 'info');
                            }}
                            style={{ marginBottom: '20px' }}
                        >
                            💵 Registrar Cobro
                        </button>

                        <h3 className="mobile-section-title">Últimos Despachos</h3>
                        <div className="mobile-list">
                            {storeDispatchesList.slice(0, 10).map(dispatch => (
                                <div key={dispatch.id} className="mobile-list-item">
                                    <div
                                        className="mobile-list-item-avatar"
                                        style={{ background: 'var(--mobile-accent-gradient)' }}
                                    >
                                        📦
                                    </div>
                                    <div className="mobile-list-item-content">
                                        <div className="mobile-list-item-title">{dispatch.dispatchNumber}</div>
                                        <div className="mobile-list-item-subtitle">
                                            {new Date(dispatch.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="mobile-list-item-value">
                                        <div className="mobile-list-item-amount">
                                            ${dispatch.totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {storeDispatchesList.length === 0 && (
                                <div className="mobile-empty-state">
                                    <div className="mobile-empty-icon">📦</div>
                                    <div className="mobile-empty-title">Sin despachos</div>
                                    <div className="mobile-empty-text">Esta sucursal no tiene despachos activos</div>
                                </div>
                            )}
                        </div>
                    </>
                );

            case 'dispatches':
                return (
                    <>
                        <button className="mobile-back-btn" onClick={() => setCurrentView('home')}>
                            <BackIcon /> Inicio
                        </button>

                        <h3 className="mobile-section-title">Despachos Recientes</h3>
                        <div className="mobile-list">
                            {dispatches
                                .filter(d => d.status === 'active')
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .slice(0, 20)
                                .map(dispatch => {
                                    const dispatchStore = stores.find(s => s.id === dispatch.storeId);
                                    return (
                                        <div key={dispatch.id} className="mobile-list-item">
                                            <div
                                                className="mobile-list-item-avatar"
                                                style={{ background: dispatchStore?.color || '#3b82f6' }}
                                            >
                                                {dispatchStore?.name[0] || '?'}
                                            </div>
                                            <div className="mobile-list-item-content">
                                                <div className="mobile-list-item-title">{dispatch.dispatchNumber}</div>
                                                <div className="mobile-list-item-subtitle">
                                                    {dispatchStore?.name} • {new Date(dispatch.timestamp).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="mobile-list-item-value">
                                                <div className="mobile-list-item-amount">
                                                    ${dispatch.totalAmount.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <button
                            className="mobile-btn mobile-btn-primary"
                            style={{ marginTop: '20px' }}
                            onClick={() => notify('Crear despacho desde móvil - próximamente', 'info')}
                        >
                            🚚 Nuevo Despacho
                        </button>
                    </>
                );

            case 'payments':
                return (
                    <>
                        <button className="mobile-back-btn" onClick={() => setCurrentView('home')}>
                            <BackIcon /> Inicio
                        </button>

                        <h3 className="mobile-section-title">Cobros Recientes</h3>
                        <div className="mobile-list">
                            {storePayments
                                .filter(p => p.status !== 'cancelled')
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 20)
                                .map(payment => {
                                    const paymentStore = stores.find(s => s.id === payment.storeId);
                                    return (
                                        <div key={payment.id} className="mobile-list-item">
                                            <div
                                                className="mobile-list-item-avatar"
                                                style={{ background: 'var(--mobile-success)' }}
                                            >
                                                💵
                                            </div>
                                            <div className="mobile-list-item-content">
                                                <div className="mobile-list-item-title">{paymentStore?.name || 'Sucursal'}</div>
                                                <div className="mobile-list-item-subtitle">
                                                    {payment.method} • {new Date(payment.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="mobile-list-item-value">
                                                <div className="mobile-list-item-amount success">
                                                    +${payment.amount.toLocaleString()}
                                                </div>
                                                <div className="mobile-list-item-badge">{payment.reference}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <button
                            className="mobile-btn mobile-btn-primary"
                            style={{ marginTop: '20px' }}
                            onClick={() => setCurrentView('stores')}
                        >
                            💵 Registrar Cobro
                        </button>
                    </>
                );

            case 'reports':
                return (
                    <>
                        <button className="mobile-back-btn" onClick={() => setCurrentView('home')}>
                            <BackIcon /> Inicio
                        </button>

                        <h3 className="mobile-section-title">Resumen del Día</h3>

                        <div className="mobile-card">
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">📊</div>
                                <div>
                                    <div className="mobile-card-label">Ventas Hoy</div>
                                    <div className="mobile-card-value">
                                        ${dispatches
                                            .filter(d => new Date(d.timestamp).toDateString() === new Date().toDateString())
                                            .reduce((acc, d) => acc + d.totalAmount, 0)
                                            .toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-card">
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">💵</div>
                                <div>
                                    <div className="mobile-card-label">Cobros Hoy</div>
                                    <div className="mobile-card-value success">
                                        ${storePayments
                                            .filter(p => new Date(p.date).toDateString() === new Date().toDateString() && p.status !== 'cancelled')
                                            .reduce((acc, p) => acc + p.amount, 0)
                                            .toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-card">
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">🏪</div>
                                <div>
                                    <div className="mobile-card-label">Sucursales Activas</div>
                                    <div className="mobile-card-value">{stores.length}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-card">
                            <div className="mobile-card-header">
                                <div className="mobile-card-icon">📦</div>
                                <div>
                                    <div className="mobile-card-label">Productos en Stock</div>
                                    <div className="mobile-card-value">{products.length}</div>
                                </div>
                            </div>
                        </div>

                        <p style={{ textAlign: 'center', color: 'var(--mobile-text-muted)', fontSize: '12px', marginTop: '30px' }}>
                            Para reportes completos, use la versión de escritorio
                        </p>
                    </>
                );

            case 'settings':
                return (
                    <>
                        <button className="mobile-back-btn" onClick={() => setCurrentView('home')}>
                            <BackIcon /> Inicio
                        </button>

                        <div className="mobile-detail-header">
                            <div
                                className="mobile-detail-avatar"
                                style={{ background: 'linear-gradient(135deg, #00bcd4, #0097a7)' }}
                            >
                                {currentUser.name[0]}
                            </div>
                            <div className="mobile-detail-title">{currentUser.name}</div>
                            <div className="mobile-detail-subtitle">{currentUser.roles.join(' • ')}</div>
                        </div>

                        <div className="mobile-list">
                            <div className="mobile-list-item">
                                <div className="mobile-list-item-avatar" style={{ background: '#6366f1' }}>🏢</div>
                                <div className="mobile-list-item-content">
                                    <div className="mobile-list-item-title">Empresa</div>
                                    <div className="mobile-list-item-subtitle">{storeName}</div>
                                </div>
                            </div>

                            <div className="mobile-list-item">
                                <div className="mobile-list-item-avatar" style={{ background: '#f59e0b' }}>📱</div>
                                <div className="mobile-list-item-content">
                                    <div className="mobile-list-item-title">Versión</div>
                                    <div className="mobile-list-item-subtitle">Pagomatic Mobile v2.0</div>
                                </div>
                            </div>
                        </div>

                        <button
                            className="mobile-btn mobile-btn-danger"
                            style={{ marginTop: '30px' }}
                            onClick={() => {
                                logout();
                            }}
                        >
                            Cerrar Sesión
                        </button>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="mobile-app">
            {/* Header */}
            <div className="mobile-header">
                <div className="mobile-logo">PAGOMATIC</div>
                <div className="mobile-user-info">
                    <div className="mobile-user-greeting">
                        <span>Hola,</span>
                        <strong>{currentUser.name.split(' ')[0]}</strong>
                    </div>
                    <div
                        className="mobile-avatar"
                        onClick={() => setCurrentView('settings')}
                    >
                        {currentUser.name[0]}
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="mobile-content">
                {renderScreen()}
            </div>

            {/* Tab Bar */}
            <div className="mobile-tab-bar">
                <div
                    className={`mobile-tab-item ${currentView === 'home' ? 'active' : ''}`}
                    onClick={() => setCurrentView('home')}
                >
                    <span className="mobile-tab-icon">🏠</span>
                    <span className="mobile-tab-label">Home</span>
                </div>
                <div
                    className={`mobile-tab-item ${currentView === 'dispatches' ? 'active' : ''}`}
                    onClick={() => setCurrentView('dispatches')}
                >
                    <span className="mobile-tab-icon">📦</span>
                    <span className="mobile-tab-label">Despachos</span>
                </div>
                <div
                    className={`mobile-tab-item ${currentView === 'payments' ? 'active' : ''}`}
                    onClick={() => setCurrentView('payments')}
                >
                    <span className="mobile-tab-icon">💰</span>
                    <span className="mobile-tab-label">Pagos</span>
                </div>
                <div
                    className={`mobile-tab-item ${currentView === 'reports' ? 'active' : ''}`}
                    onClick={() => setCurrentView('reports')}
                >
                    <span className="mobile-tab-icon">📊</span>
                    <span className="mobile-tab-label">Reportes</span>
                </div>
                <div
                    className={`mobile-tab-item ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => setCurrentView('settings')}
                >
                    <span className="mobile-tab-icon">⚙️</span>
                    <span className="mobile-tab-label">Ajustes</span>
                </div>
            </div>
        </div>
    );
};

// Wrapper con NotificationProvider
const MobileApp: React.FC = () => (
    <NotificationProvider>
        <MobileAppContent />
    </NotificationProvider>
);

export default MobileApp;
