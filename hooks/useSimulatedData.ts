import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase } from '../db';
import { createInternalBackup } from '../utils/backupUtils';
import type { DashboardMetrics, Product, Supplier, Store, StockDispatch, CartItem, Invoice, SupplierPayment, StorePayment, ReturnReason, ProductReturn, StockAdjustment, User } from '../types';
import { useState } from 'react';
import { useNotifications } from '../NotificationSystem';

export const generateId = (prefix: string) => {
    const isCryptoSupported = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    return isCryptoSupported ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useSimulatedData = () => {
    const { notify, confirm, prompt } = useNotifications();
    // Seed database and start auto-backup on mount
    useEffect(() => {
        seedDatabase().then(async () => {
            // Asegurar que el Proveedor Local exista siempre
            const local = await db.suppliers.get('sup-local');
            if (!local) {
                await db.suppliers.add({
                    id: 'sup-local',
                    name: 'PRODUCCIÓN PROPIA (LOCAL)',
                    taxId: 'V-PROPIO',
                    phone: '-',
                    totalVolume: 0,
                    debt: 0,
                    bankAccount: 'CAJA CHICA',
                    color: '#6b7280'
                });
            }
        });

        // Respaldo Automático cada 10 minutos
        const backupInterval = setInterval(() => {
            console.log("Generando respaldo de seguridad automático...");
            createInternalBackup();
        }, 10 * 60 * 1000);

        return () => clearInterval(backupInterval);
    }, []);

    // REACCIÓN EN TIEMPO REAL A LOS DATOS DE DEXIE
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
    const stores = useLiveQuery(() => db.stores.toArray()) || [];
    const dispatches = useLiveQuery(() => db.dispatches.toArray()) || [];
    const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
    const storePayments = useLiveQuery(() => db.storePayments.toArray()) || [];
    const payments = useLiveQuery(() => db.supplierPayments.toArray()) || [];
    const manualAdjustments = useLiveQuery(() => db.stockAdjustments.toArray()) || [];
    const allUsers = useLiveQuery(() => db.users.toArray()) || [];
    const storeNameSetting = useLiveQuery(() => db.settings.get('storeName'));
    const printerSizeSetting = useLiveQuery(() => db.settings.get('printerSize'));
    const reqDispApp = useLiveQuery(() => db.settings.get('requireDispatchApproval'));
    const reqPayApp = useLiveQuery(() => db.settings.get('requirePaymentApproval'));
    const reqInvApp = useLiveQuery(() => db.settings.get('requireInvoiceApproval'));
    const quickAccessSet = useLiveQuery(() => db.settings.get('quickAccessConfig'));
    const pinnedBrandsSet = useLiveQuery(() => db.settings.get('pinnedBrands'));
    const showBrandFilterSet = useLiveQuery(() => db.settings.get('showBrandFilter'));

    const storeName = storeNameSetting?.value || 'POCHO CASA MATRIZ';
    const printerSize = printerSizeSetting?.value || '80mm';
    const requireDispatchApproval = reqDispApp?.value || false;
    const requirePaymentApproval = reqPayApp?.value || false;
    const requireInvoiceApproval = reqInvApp?.value || false;
    const quickAccessConfig = quickAccessSet?.value || [
        'dispatches', 'stores', 'inventory', 'suppliers_load', 'suppliers_pay', 'reports_vault', 'reports_intel', 'personnel', 'security'
    ];
    const pinnedBrands = pinnedBrandsSet?.value || [];
    const showBrandFilter = showBrandFilterSet?.value !== false; // Default to true

    // --- SESIÓN SIMULADA ---
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('pagomatic_user');
            if (!saved) return null;
            const parsed = JSON.parse(saved);
            // Migración: Si tiene 'role' pero no 'roles', lo convertimos
            if (parsed && parsed.role && !parsed.roles) {
                parsed.roles = [parsed.role];
            }
            if (parsed && !parsed.roles) parsed.roles = [];
            return parsed;
        } catch (e) {
            return null;
        }
    });

    const login = async (username: string) => {
        const user = await db.users.where('username').equals(username).first();
        if (user) {
            // Verificación de Password/PIN si existe
            if (user.password) {
                const pass = await prompt({
                    title: 'CONTROL DE ACCESO',
                    message: `PERFIL: ${user.name}\nIngrese su clave de acceso:`,
                    inputType: 'password'
                });
                if (pass === null) return false; // Usuario pulsó cancelar (Volver)
                if (pass !== user.password) {
                    notify('Clave de acceso incorrecta', 'error');
                    return false;
                }
            }

            // Aseguramos que roles sea un array (por seguridad)
            const sanitizedUser = { ...user, roles: user.roles || [] };
            setCurrentUser(sanitizedUser);
            localStorage.setItem('pagomatic_user', JSON.stringify(sanitizedUser));
            notify(`Bienvenido, ${user.name}`, 'success');
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('pagomatic_user');
    };

    // --- CÁLCULOS DINÁMICOS (Reactivos a cualquier cambio en Dexie) ---

    // 1. Stock Central (Facturas + Ajustes Manuales + Devoluciones Buen Estado - Despachos)
    const calculatedProducts = useMemo(() => {
        return products.map(p => {
            const billEntries = invoices.reduce((sum, inv) => {
                const item = inv.items.find(it => it.productId === p.id);
                return sum + (item?.quantity || 0);
            }, 0);

            const manualEntries = manualAdjustments
                .filter(adj => adj.productId === p.id)
                .reduce((sum, adj) => sum + adj.quantity, 0);

            const exits = dispatches
                .filter(d => d.status !== 'cancelled' && d.approvalStatus !== 'pending') // CRITICAL: Only count as exit if NOT cancelled AND NOT pending
                .reduce((sum, d) => {
                    const item = d.items.find(it => it.productId === p.id);
                    if (!item) return sum;

                    const returnedGood = (d.returns || [])
                        .filter(r => r.productId === p.id && r.reason === 'good_condition')
                        .reduce((acc, r) => acc + r.quantity, 0);

                    return sum + (item.quantity - returnedGood);
                }, 0);

            return { ...p, stock: Math.max(0, billEntries + manualEntries - exits) };
        });
    }, [products, invoices, dispatches, manualAdjustments]);

    // 2. Estado de Cuenta de Proveedores
    const calculatedInvoices = useMemo(() => invoices.map(inv => {
        const totalPaid = payments
            .filter(p => p.invoiceId === inv.id && (p as any).status !== 'cancelled' && p.approvalStatus !== 'pending')
            .reduce((sum, p) => sum + p.amount, 0);
        const status: 'paid' | 'partial' | 'pending' = totalPaid >= inv.totalAmount - 0.05 ? 'paid' : (totalPaid > 0.05 ? 'partial' : 'pending');
        return { ...inv, amountPaid: totalPaid, status };
    }), [invoices, payments]);

    const calculatedSuppliers = useMemo(() => suppliers.map(s => {
        const sInvoices = invoices.filter(i => i.supplierId === s.id && (i as any).approvalStatus !== 'pending');
        const sPayments = payments.filter(p => p.supplierId === s.id && (p as any).status !== 'cancelled' && p.approvalStatus !== 'pending');
        const totalPurchased = sInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPaid = sPayments.reduce((sum, p) => sum + p.amount, 0);
        return { ...s, totalVolume: totalPurchased, debt: Math.max(0, totalPurchased - totalPaid) };
    }), [suppliers, invoices, payments]);

    // 3. Estado de Cuenta de Sucursales
    const calculatedStores = useMemo(() => stores.map(s => {
        const sDispatches = dispatches.filter(d => d.storeId === s.id && d.status !== 'returned' && d.status !== 'cancelled' && d.approvalStatus !== 'pending');
        const sPayments = storePayments.filter(p => p.storeId === s.id && (p as any).status !== 'cancelled' && (p as any).approvalStatus !== 'pending');

        let totalDebtFromDispatches = 0;
        sDispatches.forEach(d => {
            const returnedValue = (d.returns || []).reduce((acc, r) => {
                const item = d.items.find(i => i.productId === r.productId);
                return acc + (r.quantity * (item?.unitSupplyPrice || 0));
            }, 0);

            let amount = Number(d.totalAmount);
            // Fallback: Si totalAmount está corrupto/cero, calcular basado en items
            if (!amount || isNaN(amount)) {
                amount = d.items.reduce((sum, i) => sum + (i.quantity * i.unitSupplyPrice), 0);
            }

            totalDebtFromDispatches += (amount - returnedValue);
        });

        const totalIn = sPayments.reduce((acc, p) => {
            const amt = Number(p.amount);
            return acc + (isNaN(amt) ? 0 : amt);
        }, 0);

        return { ...s, totalDebt: Math.max(0, totalDebtFromDispatches - totalIn) };
    }), [stores, dispatches, storePayments]);

    // 4. Utilidad Operativa
    const totalProfit = useMemo(() => {
        return dispatches.filter(d => d.status !== 'cancelled' && d.approvalStatus !== 'pending').reduce((total, d) => {
            return total + d.items.reduce((sum, item) => {
                const p = products.find(prod => prod.id === item.productId);
                const returnedAny = (d.returns || [])
                    .filter(r => r.productId === item.productId)
                    .reduce((acc, r) => acc + r.quantity, 0);

                const effectiveQty = item.quantity - returnedAny;
                const cost = (p?.purchaseCost || 0) + (p?.purchaseTax || 0) + (p?.purchaseFreight || 0);
                const margin = item.unitSupplyPrice - cost;
                return sum + (margin * effectiveQty);
            }, 0);
        }, 0);
    }, [dispatches, products]);

    const metrics: DashboardMetrics = useMemo(() => {
        const totalReceivable = calculatedStores.reduce((acc, s) => acc + (s.totalDebt || 0), 0);
        const totalPayable = calculatedSuppliers.reduce((acc, s) => acc + (s.debt || 0), 0);

        // Calcular Pérdidas (Mermas y Siniestros) desde Notas de Baja
        const totalLosses = invoices
            .filter(inv => inv.supplierId === 'sup-local' && inv.invoiceNumber.startsWith('BAJA'))
            .reduce((sum, inv) => {
                // Sumamos el valor absoluto del costo de los items en bajada
                const lossVal = inv.items.reduce((s, it) => s + (Math.abs(it.quantity) * it.unitCost), 0);
                return sum + lossVal;
            }, 0);

        // 2. Pérdidas por Devoluciones Dañadas/Vencidas/Extraviadas en Despachos
        const dispatchLosses = dispatches.reduce((sum, d) => {
            const badReturns = (d.returns || []).filter(r => r.reason !== 'good_condition');
            return sum + badReturns.reduce((acc, r) => {
                const p = products.find(prod => prod.id === r.productId);
                const cost = (p?.purchaseCost || 0) + (p?.purchaseTax || 0) + (p?.purchaseFreight || 0);
                return acc + (r.quantity * cost);
            }, 0);
        }, 0);

        const netLosses = totalLosses + dispatchLosses;

        return {
            totalAccountsReceivable: totalReceivable,
            totalAccountsPayable: totalPayable,
            inventoryValueAtCost: calculatedProducts.reduce((acc, p) => acc + (p.stock * p.purchaseCost), 0),
            activeStores: stores.length,
            totalProfit: totalProfit - netLosses, // Utilidad neta real
            totalLosses: netLosses // Métricas unificadas de pérdida
        };
    }, [calculatedStores, calculatedSuppliers, calculatedProducts, stores.length, totalProfit, invoices, dispatches]);

    // --- ACCIONES ESCRITURA EN DEXIE ---

    const handleManualStockAdjustment = async (pId: string, qty: number, rsn: string) => {
        const prod = products.find(p => p.id === pId);
        if (!prod) return;
        
        await db.transaction('rw', [db.stockAdjustments, db.invoices, db.auditLogs], async () => {
            const isLoss = qty < 0;
            let supplierId = 'sup-local';
            let invoiceNumber = '';
            let finalReason = rsn;

            if (!isLoss && rsn.includes('|')) {
                const parts = rsn.split('|');
                supplierId = parts[0] || 'sup-local';
                invoiceNumber = parts[1] || '';
                finalReason = `ENTRADA MANUAL: ${invoiceNumber}`;
            }

            const adjustmentId = generateId('adj');
            const finalFolio = invoiceNumber || adjustmentId.slice(-6).toUpperCase();

            // 1. Registrar el Ajuste Técnico
            await db.stockAdjustments.add({
                id: adjustmentId,
                productId: pId,
                quantity: qty,
                reason: finalReason,
                timestamp: new Date().toISOString()
            });

            // 2. Generar Documento de Respaldo (Factura o Nota de Baja)
            const invoiceId = generateId('inv-adj');

            await db.invoices.add({
                id: invoiceId,
                supplierId: supplierId,
                invoiceNumber: invoiceNumber ? invoiceNumber : `${isLoss ? 'BAJA' : 'VIRT'}-${finalFolio}`,
                date: new Date().toISOString().split('T')[0],
                totalAmount: isLoss ? 0 : (qty * prod.purchaseCost),
                amountPaid: isLoss ? 0 : (qty * prod.purchaseCost),
                status: 'paid',
                notes: `${isLoss ? '⚠️ NOTA DE BAJA (MERMA/ROBO)' : 'ENTRADA DE STOCK'}: ${finalReason}`,
                items: [{
                    productId: pId,
                    quantity: qty,
                    unitCost: prod.purchaseCost,
                    unitTax: 0,
                    unitFreight: 0,
                    totalItemCost: Math.abs(qty * prod.purchaseCost)
                }]
            });

            await logAction(isLoss ? 'anular' : 'create', 'invoice', invoiceId, `${isLoss ? 'Merma registrada' : 'Entrada manual'}: ${qty} unidades. Motivo: ${finalReason}`);
        });
    };

    const handleDispatch = async (cart: CartItem[], sId: string, dNum: string, driver?: string, plate?: string) => {
        const store = calculatedStores.find(s => s.id === sId);
        const total = cart.reduce((acc, i) => acc + i.supplyPrice * i.quantity, 0);

        // 1. Verificar Stock Real
        for (const item of cart) {
            const p = calculatedProducts.find(prod => prod.id === item.id);
            if (!p || p.stock < item.quantity) return { success: false, reason: 'stock' };
        }

        // 2. Control de Crédito (Límites y Facturas Vencidas)
        if (store) {
            // Sucursal Inactiva/Suspendida
            if (store.active === false) {
                await logAction('block', 'store', sId, `Intento de despacho bloqueado: Sucursal suspendida.`);
                return { success: false, reason: 'inactive' };
            }

            // Límite de Deuda
            const limit = store.config?.maxDebtLimit || 20000;
            if ((store.totalDebt + total) > limit) {
                await logAction('block', 'store', sId, `Intento de despacho bloqueado por límite de crédito ($${store.totalDebt.toLocaleString()} + $${total.toLocaleString()} > $${limit.toLocaleString()})`);
                return { success: false, reason: 'credit_limit' };
            }

            // Facturas Vencidas
            const overdue = dispatches.filter(d => {
                if (d.storeId !== sId || d.status !== 'active' || !d.dueDate || new Date(d.dueDate) >= new Date()) return false;
                
                // Si la tienda no tiene deuda global, no hay facturas vencidas realmente
                if (store.totalDebt <= 0.05) return false;

                const returnedValue = (d.returns || []).reduce((acc, r) => {
                    const item = d.items.find(i => i.productId === r.productId);
                    return acc + (r.quantity * (item?.unitSupplyPrice || 0));
                }, 0);
                const netAmount = d.totalAmount - returnedValue;
                const paid = storePayments
                    .filter(p => p.dispatchId === d.id && p.status !== 'cancelled')
                    .reduce((sum, p) => sum + p.amount, 0);
                
                // Asumimos que si no hay abonos ligados a este despacho, pero hay deuda global y esta factura está vencida,
                // la factura podría estar pendiente. Para ser estrictos y permitir operar, solo bloqueamos
                // si estamos seguros de que la factura específica tiene saldo pendiente (usando dispatchId)
                // O si la tienda tiene deuda global y hay una factura vieja
                return netAmount > paid + 0.05;
            });

            if (overdue.length > 0 && store.totalDebt > 0) {
                await logAction('block', 'store', sId, `Intento de despacho bloqueado por ${overdue.length} factura(s) vencida(s)`);
                return { success: false, reason: 'overdue' };
            }
        }

        const now = new Date();
        const due = new Date();
        const paymentTerm = store?.config?.paymentTermDays || 15; // Usar plazo de la sucursal o 15 días por defecto
        due.setDate(now.getDate() + paymentTerm);

        const dispatchId = generateId('disp');
        
        await db.transaction('rw', [db.dispatches, db.auditLogs], async () => {
            await db.dispatches.add({
                id: dispatchId,
                dispatchNumber: dNum,
                storeId: sId,
                timestamp: now.toISOString(),
                status: 'active', // Ensure status is set
                dueDate: due.toISOString().split('T')[0],
                items: cart.map(c => ({ productId: c.id, quantity: c.quantity, unitSupplyPrice: c.supplyPrice })),
                returns: [],
                totalAmount: total,
                driverName: driver || '',
                vehiclePlate: plate || '',
                printCount: 0,
                approvalStatus: requireDispatchApproval ? 'pending' : 'approved'
            });

            if (requireDispatchApproval) {
                await logAction('create', 'dispatch', dispatchId, `Despacho #${dNum} pendiente de aprobación.`);
            } else {
                await logAction('create', 'dispatch', dispatchId, `Nuevo despacho #${dNum} por $${total.toLocaleString()}`);
            }
        });

        if (requireDispatchApproval) {
            notify(`El despacho #${dNum} ha sido enviado a sala de espera para aprobación del Administrador.`, 'info');
            return { success: true, id: dispatchId, pending: true };
        }

        return { success: true, id: dispatchId };
    };

    const handlePartialReturn = async (dispatchId: string, productId: string, qty: number, reason: ReturnReason) => {
        const dispatch = await db.dispatches.get(dispatchId);
        if (!dispatch) return;

        await db.transaction('rw', [db.dispatches, db.auditLogs], async () => {
            const newReturn: ProductReturn = {
                id: generateId('ret'),
                dispatchId,
                productId,
                quantity: qty,
                reason,
                timestamp: new Date().toISOString()
            };

            const existingReturns = dispatch.returns || [];
            const newReturns = [...existingReturns, newReturn];
            const totalSent = dispatch.items.reduce((acc, i) => acc + i.quantity, 0);
            const totalReturned = newReturns.reduce((acc, r) => acc + r.quantity, 0);

            await db.dispatches.update(dispatchId, {
                returns: newReturns,
                status: totalReturned >= totalSent ? 'returned' : 'partial_return'
            });

            const reasonMsg = reason === 'damaged' ? 'Dañado/Merma' : reason === 'expired' ? 'Vencido' : reason === 'lost' ? 'Extraviado' : 'Buen Estado';
            await logAction('update', 'dispatch', dispatchId, `Devolución parcial (${qty} unidades) de producto: ${productId}. Motivo: ${reasonMsg}`);
        });
    };

    const handleReturnDispatch = async (id: string) => {
        const dispatch = await db.dispatches.get(id);
        if (!dispatch) return;

        await db.transaction('rw', [db.dispatches, db.auditLogs], async () => {
            const fullReturns: ProductReturn[] = dispatch.items.map(item => ({
                id: generateId(`ret-${item.productId}`),
                dispatchId: id,
                productId: item.productId,
                quantity: item.quantity,
                reason: 'good_condition',
                timestamp: new Date().toISOString()
            }));

            await db.dispatches.update(id, {
                status: 'returned',
                returns: fullReturns
            });
            await logAction('update', 'dispatch', id, `Devolución TOTAL del despacho #${dispatch.dispatchNumber}`);
        });
    };

    const handleAddSupplier = async (s: any) => {
        const id = s.id || generateId('sup');
        await db.suppliers.add({ ...s, id, totalVolume: 0, debt: 0 });
        return id;
    };

    const handleAddStore = async (st: any) => {
        const id = st.id || generateId('store');
        await db.stores.add({ ...st, id, totalDebt: 0, terminals: [], lastDispatch: '-' });
        return id;
    };

    const handleAddProduct = async (p: any) => {
        const id = p.id || generateId('prod');
        await db.products.add({ ...p, id, stock: 0 });
        return id;
    };

    const handleAddInvoice = async (inv: any) => {
        // VALIDACIÓN ANTI-DUPLICADO
        const duplicado = invoices.find(
            i => i.supplierId === inv.supplierId && 
                 i.invoiceNumber.trim().toUpperCase() === inv.invoiceNumber.trim().toUpperCase() &&
                 i.id !== inv.id
        );

        if (duplicado) {
            notify(`ERROR DE INTEGRIDAD: Ya existe la factura #${inv.invoiceNumber} registrada para este proveedor. Carga rechazada.`, 'error');
            return false;
        }

        const invoiceId = inv.id || generateId('inv');
        const approvalPending = requireInvoiceApproval;

        await db.transaction('rw', [db.invoices, db.auditLogs, db.products], async () => {
            await db.invoices.add({
                ...inv,
                id: invoiceId,
                approvalStatus: approvalPending ? 'pending' : 'approved'
            });
            
            await logAction('create', 'invoice', invoiceId, `Nueva factura de compra #${inv.invoiceNumber} registrada.`);

            // Si no requiere aprobación, aplicar efectos de inmediato (Estilo Guaicaipuro)
            if (!approvalPending) {
                for (const item of inv.items) {
                    const product = await db.products.get(item.productId);
                    if (product) {
                        const updates: any = {
                            purchaseCost: item.unitCost,
                            purchaseTax: item.unitTax,
                            purchaseFreight: item.unitFreight,
                        };
                        if (item.newRetailPrice && item.newRetailPrice > 0) updates.retailPrice = item.newRetailPrice;
                        if (item.newSupplyPrice && item.newSupplyPrice > 0) updates.supplyPrice = item.newSupplyPrice;
                        
                        await db.products.update(item.productId, updates);
                        await logAction('update', 'product', item.productId, `Precios actualizados por Factura #${inv.invoiceNumber}`, product, updates);
                    }
                }
            }
        });

        if (approvalPending) {
            notify(`La factura #${inv.invoiceNumber} requiere aprobación del Administrador.`, 'info');
        } else {
            notify(`Factura #${inv.invoiceNumber} cargada y precios de catálogo actualizados.`, 'success');
        }
        return true;
    };

    const handleAddStorePayment = async (p: any) => {
        const id = p.id || generateId('sp');
        await db.transaction('rw', [db.storePayments, db.auditLogs], async () => {
            await db.storePayments.add({
                ...p,
                id,
                printCount: 0,
                approvalStatus: requirePaymentApproval ? 'pending' : 'approved'
            });
            await logAction('create', 'store_payment', id, `Nuevo abono por $${p.amount.toLocaleString()} registrado.`);
        });
        if (requirePaymentApproval) {
            notify(`Abono por $${p.amount.toLocaleString()} requiere aprobación.`, 'info');
        }
        return id;
    };

    const handleAddPayment = async (p: any) => {
        const id = p.id || generateId('pay');
        await db.transaction('rw', [db.supplierPayments, db.auditLogs], async () => {
            await db.supplierPayments.add({
                ...p,
                id,
                approvalStatus: requirePaymentApproval ? 'pending' : 'approved'
            });
            await logAction('create', 'supplier_payment', id, `Pago a proveedor por $${p.amount.toLocaleString()} registrado.`);
        });
        if (requirePaymentApproval) {
            notify(`Pago de $${p.amount.toLocaleString()} requiere aprobación.`, 'info');
        }
    };

    const logAction = async (action: any, entity: any, entityId: string, details: string, oldValue?: any, newValue?: any) => {
        await db.auditLogs.add({
            id: generateId('log'),
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || 'Sistema Automático',
            action,
            entity,
            entityId,
            details,
            timestamp: new Date().toISOString(),
            oldValue,
            newValue
        });
    };

    const requestAdminApproval = async (actionLabel: string) => {
        const password = await prompt({
            title: 'AUTORIZACIÓN REQUERIDA',
            message: `ACCIÓN PROTEGIDA: ${actionLabel}\nIngrese la clave de Administrador para confirmar:`,
            inputType: 'password'
        });
        if (!password) return false;

        const adminUser = await db.users.filter(u => u.roles.includes('ADMIN')).first();
        if (adminUser?.password === password) return true;

        notify('Clave de administrador incorrecta', 'error');
        await logAction('block', 'security', 'auth', `Intento fallido de autorización para: ${actionLabel}`);
        return false;
    };

    const handleAnularDispatch = async (id: string, isSiniestro: boolean = false) => {
        if (!await requestAdminApproval(isSiniestro ? 'REGISTRAR SINIESTRO (SAQUEO/ROBO)' : 'ANULAR DESPACHO')) return;

        await db.transaction('rw', [db.dispatches, db.storePayments, db.invoices, db.auditLogs], async () => {
            const dispatch = await db.dispatches.get(id);
            if (!dispatch) return;

            // Marcar despacho como anulado (borra deuda de sucursal)
            await db.dispatches.update(id, { status: 'cancelled' });

            // CORRECCIÓN: Cancelar todos los pagos parciales asociados a este despacho
            // para evitar que se contabilicen como ingresos sin deuda que respalde
            const relatedPayments = await db.storePayments.filter(p => p.dispatchId === id).toArray();
            for (const payment of relatedPayments) {
                if (payment.status !== 'cancelled') {
                    await db.storePayments.update(payment.id, { status: 'cancelled' });
                    await logAction('anular', 'store_payment', payment.id, `Pago cancelado automáticamente por anulación del despacho #${dispatch.dispatchNumber}`);
                }
            }

            if (isSiniestro) {
                // Si es SINIESTRO, el stock NO regresa al inventario.
                // Para que no regrese, debemos sacarlo formalmente mediante NOTA DE BAJA
                const docId = generateId('baja-sin');
                await db.invoices.add({
                    id: docId,
                    supplierId: 'sup-local',
                    invoiceNumber: `BAJA-SIN-${dispatch.dispatchNumber}`,
                    date: new Date().toISOString().split('T')[0],
                    totalAmount: 0,
                    amountPaid: 0,
                    status: 'paid',
                    notes: `❌ PÉRDIDA POR SINIESTRO EN RUTA: Despacho #${dispatch.dispatchNumber} Saqueado/Robado.`,
                    items: dispatch.items.map(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return {
                            productId: item.productId,
                            quantity: -item.quantity, // Salida definitiva
                            unitCost: prod?.purchaseCost || 0,
                            unitTax: 0,
                            unitFreight: 0,
                            totalItemCost: item.quantity * (prod?.purchaseCost || 0)
                        };
                    })
                });
                await logAction('anular', 'dispatch', id, `SINIESTRO REGISTRADO: Despacho #${dispatch.dispatchNumber} marcado como pérdida total.`);
            } else {
                // Si es ERROR ADMINISTRATIVO, el stock regresa automáticamente
                // (porque quitamos el 'status: cancelled' del cálculo de exits en calculatedProducts)
                const paymentsCancelled = relatedPayments.filter(p => p.status === 'cancelled').length;
                await logAction('anular', 'dispatch', id, `Anulación por error: Despacho #${dispatch.dispatchNumber}. Stock retornado.${paymentsCancelled > 0 ? ` ${paymentsCancelled} pago(s) cancelado(s) automáticamente.` : ''}`);
            }
        });
    };

    const handleAnularPayment = async (id: string) => {
        if (!await requestAdminApproval('ANULAR PAGO PROVEEDOR')) return;
        await logAction('anular', 'payment', id, 'Anulación de pago a proveedor');
        await db.supplierPayments.update(id, { status: 'cancelled' } as any);
    };

    const handleAnularStorePayment = async (id: string) => {
        if (!await requestAdminApproval('ANULAR COBRO SUCURSAL')) return;
        await logAction('anular', 'store', id, 'Anulación de cobro a sucursal');
        await db.storePayments.update(id, { status: 'cancelled' } as any);
    };

    const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().toArray()) || [];

    return {
        metrics,
        products: calculatedProducts,
        suppliers: calculatedSuppliers,
        stores: calculatedStores,
        dispatches,
        invoices: calculatedInvoices,
        payments,
        storePayments,
        auditLogs,
        quickAccessConfig,
        pinnedBrands,
        showBrandFilter,
        currentUser,
        users: allUsers,
        storeName,
        printerSize,
        handleUpdateStoreName: async (name: string) => await db.settings.put({ id: 'storeName', value: name.toUpperCase() }),
        handleUpdatePrinterSize: async (size: string) => await db.settings.put({ id: 'printerSize', value: size }),
        handleIncrementDispatchPrintCount: async (id: string) => {
            const d = await db.dispatches.get(id);
            if (d) await db.dispatches.update(id, { printCount: (d.printCount || 0) + 1 });
        },
        handleIncrementStorePaymentPrintCount: async (id: string) => {
            const p = await db.storePayments.get(id);
            if (p) await db.storePayments.update(id, { printCount: (p.printCount || 0) + 1 });
        },
        login,
        logout,
        handleDispatch,
        handlePartialReturn,
        handleReturnDispatch,
        handleManualStockAdjustment,
        requireDispatchApproval,
        requirePaymentApproval,
        requireInvoiceApproval,
        handleUpdateAppSettings: async (id: string, value: any) => {
            await db.settings.put({ id, value });
            notify('Ajuste administrador actualizado', 'success');
        },
        handleUpdateQuickAccessConfig: async (config: string[]) => {
            await db.settings.put({ id: 'quickAccessConfig', value: config });
            notify('Panel de accesos actualizado', 'success');
        },
        handleUpdatePinnedBrands: async (brands: string[]) => {
            await db.settings.put({ id: 'pinnedBrands', value: brands });
            notify('Marcas favoritas actualizadas', 'success');
        },
        handleUpdateShowBrandFilter: async (show: boolean) => {
            await db.settings.put({ id: 'showBrandFilter', value: show });
            notify(`Filtro de marcas ${show ? 'habilitado' : 'deshabilitado'}`, 'success');
        },
        handleApproveDocument: async (entity: string, id: string) => {
            const authData = {
                approvalStatus: 'approved',
                authorizedBy: currentUser?.name || 'Administrador',
                authorizedAt: new Date().toISOString()
            } as any;

            await db.transaction('rw', [db.dispatches, db.supplierPayments, db.storePayments, db.invoices, db.auditLogs, db.products], async () => {
                if (entity === 'dispatch') await db.dispatches.update(id, authData);
                if (entity === 'payment') await db.supplierPayments.update(id, authData);
                if (entity === 'store_payment') await db.storePayments.update(id, authData);
                
                if (entity === 'invoice') {
                    await db.invoices.update(id, authData);
                    const inv = await db.invoices.get(id);
                    if (inv) {
                        // APLICAR CAMBIOS DE PRECIOS AL CATÁLOGO (ESTILO GUAICAIPURO)
                        for (const item of inv.items) {
                            const product = await db.products.get(item.productId);
                            if (product) {
                                const updates: any = {
                                    purchaseCost: item.unitCost,
                                    purchaseTax: item.unitTax,
                                    purchaseFreight: item.unitFreight,
                                };
                                if (item.newRetailPrice && item.newRetailPrice > 0) updates.retailPrice = item.newRetailPrice;
                                if (item.newSupplyPrice && item.newSupplyPrice > 0) updates.supplyPrice = item.newSupplyPrice;
                                
                                await db.products.update(item.productId, updates);
                                await logAction('update', 'product', item.productId, `Catálogo actualizado por aprobación de Factura #${inv.invoiceNumber}`, product, updates);
                            }
                        }
                    }
                }

                await logAction('update', entity as any, id, `Documento aprobado por ${currentUser?.name || 'Administrador'}`);
            });
            notify('Documento aprobado correctamente', 'success');
        },
        handleRejectDocument: async (entity: string, id: string, reason: string) => {
            // Need to wrap in transaction dynamically based on entity, or simply enclose both
            await db.transaction('rw', [db.dispatches, db.supplierPayments, db.storePayments, db.invoices, db.auditLogs], async () => {
                if (entity === 'dispatch') await db.dispatches.update(id, { approvalStatus: 'rejected', status: 'cancelled' });
                if (entity === 'payment') await db.supplierPayments.update(id, { approvalStatus: 'rejected', status: 'cancelled' } as any);
                if (entity === 'store_payment') await db.storePayments.update(id, { approvalStatus: 'rejected', status: 'cancelled' } as any);
                if (entity === 'invoice') await db.invoices.update(id, { approvalStatus: 'rejected' });
                await logAction('anular', entity as any, id, `Documento rechazado: ${reason}`);
            });
            notify('Documento rechazado/anulado', 'warning');
        },
        handleAddUser: async (u: any) => await db.users.add({ ...u, id: generateId('u') }),
        handleDeleteUser: async (id: string) => await db.users.delete(id),
        handleUpdateUser: async (id: string, updates: any) => await db.users.update(id, updates),
        handleAddSupplier,
        handleUpdateSupplier: async (id: string, updates: any) => {
            const oldSupplier = await db.suppliers.get(id);
            await db.suppliers.update(id, updates);
            await logAction('update', 'supplier', id, `Actualización de proveedor`, oldSupplier, updates);
            notify('Proveedor actualizado correctamente', 'success');
        },
        handleDeleteSupplier: async (id: string) => {
            const supplier = calculatedSuppliers.find(s => s.id === id);
            if (!supplier) return;
            if (supplier.debt > 0.1) {
                notify(`ERROR: No se puede eliminar a "${supplier.name}" porque tiene una deuda pendiente de $${supplier.debt.toLocaleString()}.`, 'error');
                return;
            }
            if (!await confirm({
                title: 'ELIMINAR PROVEEDOR',
                message: `¿ESTÁ SEGURO? Se eliminará permanentemente al proveedor "${supplier.name}".`,
                confirmText: 'SÍ, ELIMINAR',
                cancelText: 'CANCELAR'
            })) return;
            await db.suppliers.delete(id);
            await logAction('delete', 'supplier', id, `Proveedor eliminado: ${supplier.name}`);
            notify('Proveedor eliminado correctamente', 'success');
        },
        handleAddStore,
        handleUpdateStore: async (id: string, updates: any) => {
            const oldStore = await db.stores.get(id);
            await db.stores.update(id, updates);
            await logAction('update', 'store', id, `Actualización de sucursal`, oldStore, updates);
            notify('Sucursal actualizada correctamente', 'success');
        },
        handleDeleteStore: async (id: string) => {
            const store = calculatedStores.find(s => s.id === id);
            if (!store) return;
            if (store.totalDebt > 0.1) {
                notify(`ERROR: No se puede eliminar "${store.name}" porque tiene una deuda activa de $${store.totalDebt.toLocaleString()}.`, 'error');
                return;
            }
            if (!await confirm({
                title: 'ELIMINAR SUCURSAL',
                message: `¿ESTÁ SEGURO? Se eliminará la sucursal "${store.name}" y todo su historial.`,
                confirmText: 'SÍ, ELIMINAR',
                cancelText: 'CANCELAR'
            })) return;
            await db.stores.delete(id);
            await logAction('delete', 'store', id, `Sucursal eliminada: ${store.name}`);
            notify('Sucursal eliminada correctamente', 'success');
        },
        handleAddProduct,
        handleUpdateProduct: async (id: string, updates: any) => {
            const oldProduct = await db.products.get(id);
            await db.products.update(id, updates);
            await logAction('update', 'product', id, `Actualización de producto`, oldProduct, updates);
            notify('Producto actualizado correctamente', 'success');
        },
        handleDeleteProduct: async (id: string) => {
            const product = calculatedProducts.find(p => p.id === id);
            if (!product) return;
            if (product.stock > 0) {
                notify(`ERROR: No se puede eliminar "${product.name}" porque aún tiene ${product.stock} unidades en stock central.`, 'error');
                return;
            }
            if (!await confirm({
                title: 'ELIMINAR PRODUCTO',
                message: `¿ELIMINAR PRODUCTO? Se borrará "${product.name}" del catálogo.`,
                confirmText: 'SÍ, ELIMINAR',
                cancelText: 'CANCELAR'
            })) return;
            await db.products.delete(id);
            await logAction('delete', 'product', id, `Producto eliminado: ${product.name}`);
            notify('Producto eliminado correctamente', 'success');
        },
        handleAddInvoice,
        handleAddStorePayment,
        handleAddPayment,
        handleAnularDispatch,
        handleAnularPayment,
        handleAnularStorePayment,
        handleAddTerminal: () => { },
        handleDeleteTerminal: () => { },
        confirm,
        prompt
    };
};