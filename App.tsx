import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DispatchSimulator } from './components/DispatchSimulator';
import { StoresDashboard } from './components/StoresDashboard';
import { SuppliersDashboard } from './components/SuppliersDashboard';
import { ProductsDashboard } from './components/ProductsDashboard';
import { ReportsDashboard } from './components/ReportsDashboard';
import { useSimulatedData } from './hooks/useSimulatedData';
import { NotificationProvider, useNotifications } from './NotificationSystem';
import { SecurityDashboard } from './components/SecurityDashboard';
import { PersonnelDashboard } from './components/PersonnelDashboard';
import QuickAccessPanel from './components/QuickAccessPanel';
import AdminCenter from './components/AdminCenter';
import { UsersIcon, ActivityIcon, DollarSignIcon, ClockIcon } from './components/IconComponents';
import { MENU_ITEMS, type View } from './constants';
import type { CartItem, Product } from './types';
import { type DocumentData } from './utils/shareUtils';
import { printThermal, type PrinterSize } from './utils/thermalPrinterUtils';
import MobileApp from './mobile/MobileApp';

const AppContent: React.FC = () => {
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
    auditLogs,
    currentUser,
    users,
    login,
    logout,
    storeName,
    printerSize,
    handleUpdateStoreName,
    handleUpdatePrinterSize,
    handleIncrementDispatchPrintCount,
    handleIncrementStorePaymentPrintCount,
    handleDispatch,
    handleReturnDispatch,
    handlePartialReturn,
    handleAnularDispatch,
    handleManualStockAdjustment,
    handleAddSupplier,
    handleAddInvoice,
    handleAddPayment,
    handleAnularPayment,
    handleAddStorePayment,
    handleAnularStorePayment,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddStore,
    handleUpdateStore,
    handleDeleteStore,
    handleDeleteSupplier,
    handleAddTerminal,
    handleDeleteTerminal,
    handleAddUser,
    handleDeleteUser,
    handleUpdateUser
  } = useSimulatedData();

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [reportsInitialTab, setReportsInitialTab] = useState<'analytics' | 'dispatches' | 'storePayments' | 'supplierPayments' | 'invoices' | 'profitability' | 'vault'>('analytics');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // NEW: Settings state for Alert Threshold
  const [alertThresholdDays, setAlertThresholdDays] = useState<number>(3); // Default to 3 days


  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prevCart.filter(item => item.id !== productId);
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } else {
      setCart(prevCart => prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const handleClearCart = () => setCart([]);

  const processDispatch = async (dispatchNumber: string, driver?: string, plate?: string) => {
    if (!selectedStoreId) {
      notify('Seleccione una sucursal destino', 'error');
      return;
    }
    const result = (await handleDispatch(cart, selectedStoreId, dispatchNumber, driver, plate)) as any;

    if (result.success && result.id) {
      if (result.pending) {
        // Si requiere aprobación, no imprimimos ni mostramos el modal de éxito normal
        setCart([]);
        setSelectedStoreId('');
        return { success: true, pending: true };
      }

      // Impresión Térmica Automática (Doble: Original + Copia)
      const store = stores.find(s => s.id === selectedStoreId);
      const docData: DocumentData = {
        type: 'dispatch',
        id: result.id,
        reference: dispatchNumber,
        date: new Date().toLocaleString(),
        amount: cart.reduce((acc, i) => acc + i.supplyPrice * i.quantity, 0),
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.supplyPrice })),
        storeName: store?.name,
        storeAddress: store?.location,
        driverName: driver,
        vehiclePlate: plate,
        generatedBy: currentUser?.name,
        userRole: currentUser?.roles?.join(', '),
        dueDate: (() => {
          const d = new Date();
          d.setDate(d.getDate() + (store?.config?.paymentTermDays || 15));
          return d.toLocaleDateString();
        })()
      };

      // Tiket 1: Original
      await printThermal({ ...docData, copyType: 'ORIGINAL' }, { size: (printerSize as PrinterSize) || '80mm', copyType: 'ORIGINAL' });
      // Tiket 2: Copia
      setTimeout(async () => {
        await printThermal({ ...docData, copyType: 'COPIA CHOFER' }, { size: (printerSize as PrinterSize) || '80mm', copyType: 'COPIA CHOFER' });
      }, 1000);

      handleIncrementDispatchPrintCount(result.id);
      handleIncrementDispatchPrintCount(result.id); // Increment twice since we printed twice

      setCart([]);
      setSelectedStoreId('');
      notify('Despacho registrado e impreso con éxito (2 copias)', 'success');
      return { success: true, id: result.id };
    } else {
      if (result.reason === 'credit_limit') {
        notify('BLOQUEADO: La sucursal supera su límite de crédito', 'error');
      } else if (result.reason === 'overdue') {
        notify('BLOQUEADO: La sucursal tiene facturas vencidas', 'error');
      } else if (result.reason === 'inactive') {
        notify('BLOQUEADO: La sucursal está suspendida/inactiva', 'error');
      } else if (result.reason === 'stock') {
        notify('ERROR: Stock insuficiente en almacén central', 'error');
      } else {
        notify('No se pudo procesar el despacho', 'error');
      }
      return false;
    }
  };

  const renderContent = () => {
    // Verificación de Permisos (RBAC)
    const canAccess = (view: View) => {
      const config = MENU_ITEMS.find(i => i.view === view);
      if (!config) return true; // If view is not explicitly configured, assume access (e.g., dashboard)
      return config.roles.some(r => currentUser?.roles?.includes(r));
    };

    if (!canAccess(currentView)) {
      return (
        <div className="bg-red-50 p-12 rounded-[40px] border-4 border-red-100 text-center">
          <ActivityIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-red-900 uppercase">Acceso Restringido</h3>
          <p className="text-red-600 font-bold mt-2">Su perfil de {currentUser?.roles?.join(', ')} no tiene permisos para este módulo.</p>
          <button onClick={() => setCurrentView('dashboard')} className="mt-8 bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">Volver al Inicio</button>
        </div>
      );
    }

    switch (currentView) {
      case 'quick-access':
        return <QuickAccessPanel onNavigate={setCurrentView} storeName={storeName} />;
      case 'admin-center':
        return <AdminCenter />;
      case 'reports':
        return (
          <ReportsDashboard
            dispatches={dispatches}
            storePayments={storePayments}
            supplierPayments={payments}
            invoices={invoices}
            stores={stores}
            suppliers={suppliers}
            products={products}
            onAnularDispatch={handleAnularDispatch}
            onAnularStorePayment={handleAnularStorePayment}
            onAnularPayment={handleAnularPayment}
            initialTab={reportsInitialTab}
            currentUser={currentUser}
            printerSize={printerSize}
            onIncrementDispatchPrintCount={handleIncrementDispatchPrintCount}
            onIncrementStorePaymentPrintCount={handleIncrementStorePaymentPrintCount}
          />
        );
      case 'inventory':
        return (
          <ProductsDashboard
            products={products}
            suppliers={suppliers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onManualAdjust={handleManualStockAdjustment}
            printerSize={printerSize}
            isAdmin={currentUser.roles.includes('ADMIN')}
          />
        );
      case 'suppliers':
        return (
          <SuppliersDashboard
            suppliers={suppliers}
            products={products}
            invoices={invoices}
            payments={payments}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={() => { }}
            onDeleteSupplier={handleDeleteSupplier}
            onAddInvoice={handleAddInvoice}
            onAddPayment={handleAddPayment}
            onAnularPayment={handleAnularPayment}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            isAdmin={currentUser.roles.includes('ADMIN')}
            onNavigateToReports={() => {
              setReportsInitialTab('supplierPayments');
              setCurrentView('reports');
            }}
            currentUser={currentUser}
            printerSize={printerSize}
          />
        );
      case 'security':
        return <SecurityDashboard
          storeName={storeName}
          onUpdateStoreName={handleUpdateStoreName}
          printerSize={printerSize}
          onUpdatePrinterSize={handleUpdatePrinterSize}
        />;
      case 'personnel':
        return <PersonnelDashboard users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} onUpdateUser={handleUpdateUser} storeName={storeName} />;
      case 'stores':
        return (
          <StoresDashboard
            stores={stores}
            dispatches={dispatches}
            products={products}
            storePayments={storePayments}
            onAddStore={handleAddStore}
            onUpdateStore={handleUpdateStore}
            onDeleteStore={handleDeleteStore}
            onAddTerminal={handleAddTerminal}
            onDeleteTerminal={handleDeleteTerminal}
            onAddStorePayment={handleAddStorePayment}
            onAnularStorePayment={handleAnularStorePayment}
            onAnularDispatch={handleAnularDispatch}
            onReturnDispatch={handleReturnDispatch}
            onPartialReturn={handlePartialReturn}
            externalStoreId={selectedStoreId}
            isAdmin={currentUser.roles.includes('ADMIN')}
            currentUser={currentUser}
            printerSize={printerSize}
            onIncrementDispatchPrintCount={handleIncrementDispatchPrintCount}
            onIncrementStorePaymentPrintCount={handleIncrementStorePaymentPrintCount}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            metrics={metrics}
            stores={stores}
            dispatches={dispatches}
            storePayments={storePayments}
            invoices={invoices}
            supplierPayments={payments}
            userRoles={currentUser?.roles || []}
            onNavigate={(view, storeId) => {
              setCurrentView(view);
              if (storeId) setSelectedStoreId(storeId);
            }}
            alertThresholdDays={alertThresholdDays}
            onUpdateAlertThreshold={setAlertThresholdDays}
            suppliers={suppliers}
          />
        );
      case 'dispatches':
        return (
          <DispatchSimulator
            products={products}
            stores={stores}
            dispatches={dispatches}
            selectedStoreId={selectedStoreId}
            onStoreChange={setSelectedStoreId}
            onProcessDispatch={processDispatch}
            cart={cart}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onClearCart={handleClearCart}
            onAddStore={handleAddStore}
            nextDispatchNumber={`F-${String(dispatches.length + 1).padStart(5, '0')}`}
            currentUser={currentUser}
            printerSize={printerSize}
            onIncrementDispatchPrintCount={handleIncrementDispatchPrintCount}
          />
        );
      default:
        return (
          <div className="bg-white p-12 rounded-sm border border-gray-200 text-center shadow-sm">
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">
              Bienvenido al Sistema Pagomatic. Seleccione una opción del menú lateral para comenzar.
            </p>
          </div>
        );
    }
  };

  const handleLogin = async (username: string) => {
    const success = await login(username);
    if (success) {
      // Redirigir según el primer rol para evitar el "desorden"
      const user = users.find(u => u.username === username);
      if (user?.roles.includes('ADMIN')) setCurrentView('admin-center');
      else if (user?.roles.includes('COMPRAS')) setCurrentView('inventory');
      else if (user?.roles.includes('COBRANZA')) setCurrentView('stores');
      else if (user?.roles.includes('AUDITOR')) setCurrentView('reports');
      else setCurrentView('dashboard');
    }
  };

  const Auth = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl p-12 animate-in zoom-in-95 duration-500 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary to-brand-accent"></div>
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100 rotate-3">
            <ActivityIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">PAGOMATIC</h1>
          <div className="inline-block bg-brand-primary/5 px-4 py-1.5 rounded-full border border-brand-primary/10">
            <p className="text-brand-primary font-black text-[10px] uppercase tracking-[0.2em]">{storeName || 'Licencia de Uso'}</p>
          </div>
          <p className="text-gray-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-4">Control Central de Seguridad</p>
        </div>
        <div className="space-y-4">
          {users.length > 0 ? (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase mb-4">Seleccione su Perfil para continuar:</p>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleLogin(u.username)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-brand-primary group rounded-2xl border-2 border-transparent hover:border-blue-400 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-brand-primary group-hover:bg-blue-400 group-hover:text-white transition-colors">
                    {u.name[0]}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 group-hover:text-white uppercase transition-colors">{u.name}</p>
                    <p className="text-[9px] font-black text-gray-400 group-hover:text-blue-100 uppercase tracking-widest transition-colors">{u.roles.join(' • ')}</p>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="py-10">
              <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-xs font-bold text-gray-400 uppercase">Cargando perfiles de seguridad...</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 text-[10px] font-black text-brand-primary border-b-2 border-brand-primary uppercase tracking-widest"
              >
                Click aquí si no cargan
              </button>
            </div>
          )}
        </div>

        <p className="mt-10 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Google Deepmind • Pagomatic v2.0</p>
      </div>
    </div>
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <div className="flex bg-[#ecf0f5] h-screen overflow-hidden text-gray-800 font-sans">
      <Sidebar
        activeView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          setSelectedStoreId(null);
        }}
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header
          onLogout={logout}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentUser={currentUser}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-light text-gray-700 uppercase">
              {MENU_ITEMS.find(i => i.view === currentView)?.label.split('(')[0] || 'Escritorio'} <span className="text-gray-400 text-sm lowercase tracking-normal font-normal">versión 2.0</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <ActivityIcon className="w-3 h-3" />
              <span>Inicio</span>
              <span>/</span>
              <span className="text-gray-600 font-black">{MENU_ITEMS.find(i => i.view === currentView)?.label.split('(')[0] || 'Escritorio'}</span>
            </div>
          </div>
          <div className="animate-in fade-in duration-500">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

interface AppProps {
  initialView?: View;
}

// Función para detectar si es un dispositivo móvil
const isMobileDevice = (): boolean => {
  // Detectar por ancho de pantalla
  if (typeof window !== 'undefined') {
    const isMobileWidth = window.innerWidth < 768;
    // Detectar por user agent (móviles y tablets pequeñas)
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // iPad específicamente se puede usar en modo desktop, así que no lo incluimos por defecto
    return isMobileWidth || isMobileUA;
  }
  return false;
};

const App: React.FC<AppProps> = () => {
  const [isMobile, setIsMobile] = useState<boolean>(isMobileDevice());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', handleResize);

    // Limpiar al desmontar
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Detección móvil desactivada temporalmente para restaurar servicio
  // Si es móvil, renderizar la app móvil
  if (isMobile) {
    return <MobileApp />;
  }
  */

  // Si es desktop, renderizar la app desktop normal
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;