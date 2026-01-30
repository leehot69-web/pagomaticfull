import React, { useMemo } from 'react';
import type { DashboardMetrics, Store, UserRole, StockDispatch, StorePayment, Invoice, SupplierPayment } from '../types';
import { DollarSignIcon, WalletIcon, UsersIcon, ActivityIcon, XIcon, ClockIcon } from './IconComponents';

interface DashboardProps {
  metrics: DashboardMetrics;
  stores: Store[];
  dispatches: StockDispatch[];
  storePayments: StorePayment[];
  invoices: Invoice[];
  supplierPayments: SupplierPayment[];
  onNavigate: (view: any, storeId?: string) => void;
  userRoles: UserRole[];
  alertThresholdDays?: number;
  onUpdateAlertThreshold?: (days: number) => void;
  suppliers: any[]; // Add suppliers prop
}

const InfoBox: React.FC<{ icon: React.FC<{ className?: string }>; label: string; value: string; colorClass: string; footerLabel?: string }> = ({ icon: Icon, label, value, colorClass, footerLabel }) => (
  <div className="bg-white rounded-sm shadow-sm flex overflow-hidden border border-gray-200">
    <div className={`w-20 sm:w-24 flex items-center justify-center shrink-0 ${colorClass}`}>
      <Icon className="w-8 h-8 text-white/90" />
    </div>
    <div className="flex-1 p-4 bg-white flex flex-col justify-center">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-black text-gray-800 tracking-tight">{value}</span>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  metrics, stores = [], dispatches = [], storePayments = [], invoices = [], supplierPayments = [],
  onNavigate, userRoles, alertThresholdDays = 3, onUpdateAlertThreshold, suppliers = []
}) => {
  const [showAuditModal, setShowAuditModal] = React.useState(false);
  const chartData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0); // Inicio del día local

      const dayDispatches = dispatches.filter(disp => {
        if (disp.status === 'cancelled') return false;
        const itemDate = new Date(disp.timestamp);
        return itemDate.getFullYear() === d.getFullYear() &&
          itemDate.getMonth() === d.getMonth() &&
          itemDate.getDate() === d.getDate();
      }).reduce((sum, disp) => sum + disp.totalAmount, 0);

      const dayCollections = storePayments.filter(pay => {
        if ((pay as any).status === 'cancelled') return false;
        const itemDate = new Date(pay.date);
        return itemDate.getFullYear() === d.getFullYear() &&
          itemDate.getMonth() === d.getMonth() &&
          itemDate.getDate() === d.getDate();
      }).reduce((sum, pay) => sum + pay.amount, 0);

      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      days.push({
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        dispatched: dayDispatches,
        collected: dayCollections
      });
    }

    // Calcular escala para el gráfico
    const maxVal = Math.max(...days.map(d => Math.max(d.dispatched, d.collected, 1000)));
    return days.map(d => ({
      ...d,
      hDisp: (d.dispatched / maxVal) * 100,
      hColl: (d.collected / maxVal) * 100
    }));
  }, [dispatches, storePayments]);

  // CÁLCULO DE INDICADORES EN TIEMPO REAL
  const operationMetrics = useMemo(() => {
    const totalDispatched = dispatches.filter(d => d.status !== 'cancelled').reduce((acc, d) => acc + d.totalAmount, 0);
    const totalCollected = storePayments.filter(p => (p as any).status !== 'cancelled').reduce((acc, p) => acc + p.amount, 0);
    const collectionRate = totalDispatched > 0 ? (totalCollected / totalDispatched) * 100 : 0;

    const inventoryFlow = totalDispatched > 0 ? (totalDispatched / (totalDispatched + metrics.inventoryValueAtCost)) * 100 : 0;

    const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
    const totalPaidToSuppliers = supplierPayments.filter(p => (p as any).status !== 'cancelled').reduce((acc, p) => acc + p.amount, 0);
    const supplierLiquidation = totalInvoiced > 0 ? (totalPaidToSuppliers / totalInvoiced) * 100 : 0;

    return {
      collection: Math.min(collectionRate, 100),
      flow: Math.min(inventoryFlow, 100),
      liquidation: Math.min(supplierLiquidation, 100)
    };
  }, [dispatches, storePayments, invoices, supplierPayments, metrics.inventoryValueAtCost]);

  const criticalDebtors = useMemo(() => {
    return stores
      .filter(s => s.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 3);
  }, [stores]);

  const canSeeMoneyIn = userRoles.some(r => ['ADMIN', 'COBRANZA', 'AUDITOR'].includes(r));
  const canSeeMoneyOut = userRoles.some(r => ['ADMIN', 'COMPRAS', 'AUDITOR'].includes(r));
  const canSeeInventory = userRoles.some(r => ['ADMIN', 'COMPRAS', 'AUDITOR'].includes(r));

  // CÁLCULO DE ALERTAS DE PAGO CRÍTICAS
  const criticalPayments = useMemo(() => {
    const now = new Date();
    return invoices
      .filter(inv => {
        const debt = inv.totalAmount - (inv.amountPaid || 0);
        if (debt <= 0) return false; // Pagada

        // Calcular fecha límite
        let dueDate = new Date(inv.date);
        if (inv.dueDate) {
          dueDate = new Date(inv.dueDate);
        } else {
          // Default: 30 días si no se especifica
          dueDate.setDate(dueDate.getDate() + 30);
        }

        // Calcular días restantes
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // CRITERIO DE ALERTA: Vencida O vence en <= threshold días
        return diffDays <= alertThresholdDays;
      })
      .map(inv => {
        let dueDate = new Date(inv.date);
        if (inv.dueDate) dueDate = new Date(inv.dueDate);
        else dueDate.setDate(dueDate.getDate() + 30);

        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...inv,
          dueDateStr: dueDate.toISOString().split('T')[0],
          daysRemaining: diffDays
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [invoices, alertThresholdDays]);

  const renderAuditModal = () => {
    if (!showAuditModal) return null;

    const grossProfit = (metrics.totalProfit || 0) + (metrics.totalLosses || 0);
    const netProfit = metrics.totalProfit || 0;
    const losses = metrics.totalLosses || 0;

    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-8 border-gray-100">
          <div className="p-10 bg-gray-50 border-b flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Balance de Salud Financiera</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Auditoría Interna • Sin IA • Datos Reales</p>
            </div>
            <button onClick={() => setShowAuditModal(false)} className="bg-gray-200 hover:bg-black hover:text-white p-3 rounded-full transition-all">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-10 flex-1 overflow-y-auto space-y-12">
            {/* Indicador General */}
            <div className="text-center space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Estado de Resultado Neto</p>
              <h3 className={`text-7xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <div className={`inline-block px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {netProfit >= 0 ? '✓ Balance en Positivo' : '⚠️ Balance en Déficit'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* GANANCIAS (VERDE) */}
              <div className="bg-emerald-50 rounded-[40px] p-8 border-2 border-emerald-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200">
                    <ActivityIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-emerald-800 font-black uppercase text-xs tracking-widest">Utilidad Operativa (Bruta)</h4>
                </div>
                <p className="text-3xl font-black text-emerald-700 tracking-tighter mb-4">${grossProfit.toLocaleString()}</p>
                <ul className="space-y-3">
                  <li className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase">
                    <span>Márgenes de Despacho</span>
                    <span className="font-black">+$ {grossProfit.toLocaleString()}</span>
                  </li>
                  <li className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase border-t border-emerald-200 pt-3">
                    <span>Eficiencia de Cobro</span>
                    <span className="font-black">{operationMetrics.collection.toFixed(1)}%</span>
                  </li>
                </ul>
              </div>

              {/* PERDIDAS (ROJO) */}
              <div className="bg-red-50 rounded-[40px] p-8 border-2 border-red-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg shadow-red-200">
                    <ActivityIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-red-800 font-black uppercase text-xs tracking-widest">Fugas e Incoherencias (Pérdidas)</h4>
                </div>
                <p className="text-3xl font-black text-red-700 tracking-tighter mb-4">-${losses.toLocaleString()}</p>
                <ul className="space-y-3">
                  <li className="flex justify-between text-[10px] font-bold text-red-600 uppercase">
                    <span>Mermas / Daños / Robos</span>
                    <span className="font-black">-$ {losses.toLocaleString()}</span>
                  </li>
                  <li className="flex justify-between text-[10px] font-bold text-red-600 uppercase border-t border-red-200 pt-3 opacity-60">
                    <span>Siniestros en Ruta</span>
                    <span className="font-black">Incluido</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* BALANCE PATRIMONIAL */}
            <div className="bg-slate-900 rounded-[40px] p-10 text-white">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-slate-500">Balance Cuentas x Cobrar vs Pagar</h4>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Activos (Sucursales nos deben)</p>
                    <p className="text-2xl font-black tracking-tighter text-emerald-400">${metrics.totalAccountsReceivable.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pasivos (Debemos a Proveedores)</p>
                    <p className="text-2xl font-black tracking-tighter text-red-400">${metrics.totalAccountsPayable.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex border-2 border-slate-700">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(metrics.totalAccountsReceivable / (metrics.totalAccountsReceivable + metrics.totalAccountsPayable)) * 100}%` }}></div>
                  <div className="bg-red-500 h-full" style={{ width: `${(metrics.totalAccountsPayable / (metrics.totalAccountsReceivable + metrics.totalAccountsPayable)) * 100}%` }}></div>
                </div>
                <p className="text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Ratio de Cobrabilidad vs Exigibilidad Proveedores
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 text-center border-t">
            <button
              onClick={() => setShowAuditModal(false)}
              className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
            >
              Cerrar Informe de Auditoría
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {renderAuditModal()}

      {/* 4 Info Boxes - AdminLTE Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeMoneyIn && (
          <InfoBox
            icon={WalletIcon}
            label="Cuentas por Cobrar"
            value={`$${metrics.totalAccountsReceivable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            colorClass="bg-[#00c0ef]"
          />
        )}
        {canSeeMoneyOut && (
          <InfoBox
            icon={ActivityIcon}
            label="Cuentas por Pagar"
            value={`$${metrics.totalAccountsPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            colorClass="bg-[#dd4b39]"
          />
        )}
        {canSeeInventory && (
          <InfoBox
            icon={DollarSignIcon}
            label="Caja Central (Valor Inv)"
            value={`$${metrics.inventoryValueAtCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            colorClass="bg-[#605ca8]"
          />
        )}
        {userRoles.includes('ADMIN') && (
          <div className="bg-gradient-to-br from-brand-primary to-blue-700 rounded-sm shadow-sm flex overflow-hidden border border-blue-400 animate-pulse-subtle group cursor-pointer hover:scale-[1.02] transition-all" onClick={() => setShowAuditModal(true)}>
            <div className="w-20 sm:w-24 flex items-center justify-center shrink-0 bg-black/20">
              <ActivityIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 p-4 flex flex-col justify-center">
              <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Auditoría Financiera</span>
              <span className="text-[9px] font-bold text-white/50 uppercase">Ver Salud del Sistema</span>
              <span className="mt-1 text-xs font-black text-white underline underline-offset-4">CONSULTAR AQUÍ</span>
            </div>
          </div>
        )}
        <InfoBox
          icon={ActivityIcon}
          label="Sucursales Activas"
          value={metrics.activeStores.toString()}
          colorClass="bg-[#f39c12]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Recap Placeholder Style */}
        <div className="lg:col-span-2 bg-white rounded-sm shadow-sm border-t-4 border-[#3c8dbc]">
          <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Resumen Operativo Mensual</h3>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#00c0ef]"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <p className="text-center text-xs font-black text-gray-400 mb-10 uppercase tracking-[0.3em]">Flujo de Despacho vs Cobranza (Real vs Proyectado)</p>
                <div className="h-80 bg-gray-50/50 rounded-[40px] flex items-end justify-between px-6 pb-12 pt-20 gap-4 border border-gray-100 relative overflow-hidden shadow-inner">
                  {/* Patrón de Fondo Estilo Infografía */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: 'calc(100% / 7) 100%' }}></div>

                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full">

                      {/* Badge Circular Flotante (Estilo Infografía) */}
                      <div className="absolute -top-16 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-gray-50 z-10 group-hover:scale-110 transition-transform">
                        <span className="text-[10px] font-black text-gray-900">{d.label.split(' ')[0]}</span>
                      </div>

                      <div className="flex w-full h-full items-end justify-center gap-1 px-1">
                        {/* Barra de Despacho (Azul Moderno) */}
                        <div
                          className="relative flex-1 bg-gradient-to-t from-[#3c8dbc] to-[#00c0ef] rounded-t-2xl shadow-xl transition-all duration-1000 group-hover:brightness-110 overflow-hidden"
                          style={{ height: `${Math.max(d.hDisp, 5)}%` }}
                        >
                          {/* Etiqueta de Valor */}
                          <div className="absolute top-2 left-0 right-0 text-center">
                            <span className="text-[7px] font-black text-white/90 uppercase tracking-tighter">${(d.dispatched / 1000).toFixed(1)}k</span>
                          </div>
                          {/* Patrón de Rayas en la Base */}
                          <div className="absolute bottom-0 left-0 right-0 h-4 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }}></div>
                        </div>

                        {/* Barra de Cobranza (Verde Moderno) */}
                        <div
                          className="relative flex-1 bg-gradient-to-t from-[#00a65a] to-[#00ce6e] rounded-t-2xl shadow-xl transition-all duration-1000 delay-100 group-hover:brightness-110 overflow-hidden"
                          style={{ height: `${Math.max(d.hColl, 5)}%` }}
                        >
                          <div className="absolute top-2 left-0 right-0 text-center">
                            <span className="text-[7px] font-black text-white/90 uppercase tracking-tighter">${(d.collected / 1000).toFixed(1)}k</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-4 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }}></div>
                        </div>
                      </div>

                      {/* Tooltip Detallado */}
                      <div className="absolute -top-28 opacity-0 group-hover:opacity-100 bg-gray-900/95 backdrop-blur-sm text-white p-3 rounded-2xl shadow-2xl z-30 transition-all duration-300 pointer-events-none scale-90 group-hover:scale-100 border border-white/10 min-w-[120px]">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">{d.label}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-[8px] font-bold text-blue-300 uppercase">Enviado:</span>
                            <span className="text-[9px] font-black">${d.dispatched.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-[8px] font-bold text-green-300 uppercase">Cobrado:</span>
                            <span className="text-[9px] font-black">${d.collected.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] font-black text-gray-400 mt-4 uppercase tracking-[0.1em]">{d.label.split(' ')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-64 space-y-6">
                <p className="text-xs font-black text-gray-700 uppercase border-b pb-2">Indicadores Operativos</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-gray-500">Cobranza Realizada</span>
                      <span className="text-gray-900">{operationMetrics.collection.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#00c0ef] h-full transition-all duration-1000" style={{ width: `${operationMetrics.collection}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-gray-500">Flujo de Inventario</span>
                      <span className="text-gray-900">{operationMetrics.flow.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#00a65a] h-full transition-all duration-1000" style={{ width: `${operationMetrics.flow}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-gray-500">Liquidación a Proveedores</span>
                      <span className="text-gray-900">{operationMetrics.liquidation.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#dd4b39] h-full transition-all duration-1000" style={{ width: `${operationMetrics.liquidation}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Stores/Debtors */}
        <div className="bg-white rounded-sm shadow-sm border-t-4 border-[#f39c12]">
          <div className="px-4 py-3 border-b bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Alertas de Cartera</h3>
          </div>
          <div className="p-4 space-y-3">
            {criticalDebtors.map(store => (
              <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-sm border-l-4 border-red-500">
                <div>
                  <p className="text-xs font-black text-gray-800 uppercase tracking-tighter leading-none">{store.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{store.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-red-600">${store.totalDebt.toLocaleString()}</p>
                  <button
                    onClick={() => onNavigate('stores', store.id)}
                    className="text-[8px] font-black text-blue-500 uppercase hover:underline"
                  > Ver Estado</button>
                </div>
              </div>
            ))}
            {criticalDebtors.length === 0 && (
              <p className="text-center py-10 text-xs text-gray-400 font-bold uppercase">Sin deudas críticas</p>
            )}
          </div>
          <div className="p-4 bg-gray-50 border-t items-center flex justify-center">
            <button onClick={() => onNavigate('stores')} className="text-[10px] font-black text-[#3c8dbc] uppercase tracking-widest hover:underline">Ver Todas las Sucursales</button>
          </div>
        </div>
      </div>

      {/* WIDGET DE PAGOS CRÍTICOS (NUEVO) */}
      {criticalPayments.length > 0 && (
        <div className="bg-white rounded-sm shadow-sm border-t-4 border-red-600 animate-in slide-in-from-bottom-6 duration-500">
          <div className="px-6 py-4 border-b bg-red-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-200">
                <ClockIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Pagos Críticos a Proveedores</h3>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  Facturas Vencidas o por Vencer (Urgente)
                </p>
              </div>
            </div>

            {/* CONFIGURACIÓN DE ALERTA */}
            {onUpdateAlertThreshold && (
              <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-red-100 shadow-sm">
                <span className="text-[9px] font-black text-gray-400 uppercase">Alertar antes de:</span>
                <select
                  value={alertThresholdDays}
                  onChange={(e) => onUpdateAlertThreshold(Number(e.target.value))}
                  className="bg-red-50 text-red-700 font-black text-xs p-1 rounded outline-none border-transparent focus:border-red-500"
                >
                  <option value={1}>1 Día</option>
                  <option value={2}>2 Días</option>
                  <option value={3}>3 Días</option>
                  <option value={5}>5 Días</option>
                  <option value={7}>7 Días</option>
                  <option value={15}>15 Días</option>
                  <option value={30}>30 Días</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {criticalPayments.map(inv => (
              <div key={inv.id} className="relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rounded-full opacity-20 ${inv.daysRemaining < 0 ? 'bg-red-600' : 'bg-orange-500'}`}></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${inv.daysRemaining < 0 ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}>
                    {inv.daysRemaining < 0 ? `Vencida hace ${Math.abs(inv.daysRemaining)} días` : `Vence en ${inv.daysRemaining} días`}
                  </div>
                  <span className="text-2xl font-black text-gray-800 tracking-tighter">
                    ${(inv.totalAmount - (inv.amountPaid || 0)).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] font-black uppercase text-gray-400">Factura #{inv.invoiceNumber}</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">
                    {suppliers.find(s => s.id === inv.supplierId)?.name || 'Proveedor Desconocido'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500">
                    Vencimiento: {inv.dueDateStr}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                  <button
                    onClick={() => onNavigate('suppliers')}
                    className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                  >
                    Pagar Ahora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};