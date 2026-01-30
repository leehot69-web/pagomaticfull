import Dexie, { type Table } from 'dexie';
import type { Supplier, Store, Product, Invoice, StockDispatch, StorePayment, SupplierPayment, StockAdjustment, User } from './types';

export class PagomaticDB extends Dexie {
    suppliers!: Table<Supplier>;
    stores!: Table<Store>;
    products!: Table<Product>;
    invoices!: Table<Invoice>;
    dispatches!: Table<StockDispatch>;
    storePayments!: Table<StorePayment>;
    supplierPayments!: Table<SupplierPayment>;
    stockAdjustments!: Table<StockAdjustment>;
    backups!: Table<{ id: string, date: string, data: string }>;
    auditLogs!: Table<any>;
    users!: Table<User>;
    settings!: Table<{ id: string, value: any }>;

    constructor() {
        super('PagomaticDatabase');
        this.version(6).stores({
            suppliers: 'id, name',
            stores: 'id, name',
            products: 'id, name, supplierId',
            invoices: 'id, supplierId, invoiceNumber, date',
            dispatches: 'id, dispatchNumber, storeId, status, dueDate',
            storePayments: 'id, storeId, date',
            supplierPayments: 'id, supplierId, invoiceId, date',
            stockAdjustments: 'id, productId, timestamp',
            backups: 'id, date',
            auditLogs: 'id, entity, action, timestamp',
            users: 'id, username, *roles',
            settings: 'id'
        });
    }
}

export const db = new PagomaticDB();

export const seedDatabase = async () => {
    // 5. USUARIOS INICIALES (CONTROL DE ACCESO)
    const userData: User[] = [
        { id: 'u-admin', username: 'admin', name: 'Super Administrador', roles: ['ADMIN'], password: '123' },
        { id: 'u-compras', username: 'compras', name: 'Jefe de Compras', roles: ['COMPRAS'] },
        { id: 'u-logistics', username: 'despachos', name: 'Encargado de Logística', roles: ['DESPACHOS'] },
        { id: 'u-box', username: 'cobranza', name: 'Cajero de Sucursales', roles: ['COBRANZA'] }
    ];
    await db.users.bulkPut(userData);

    // Seed settings if empty
    if (await db.settings.count() === 0) {
        await db.settings.put({ id: 'storeName', value: 'MAYORISTA POCHO' });
        await db.settings.put({ id: 'printerSize', value: '80mm' });
        await db.settings.put({ id: 'requireDispatchApproval', value: false });
        await db.settings.put({ id: 'requirePaymentApproval', value: false });
        await db.settings.put({ id: 'requireInvoiceApproval', value: false });
    }

    console.log("Usuarios y ajustes de seguridad creados.");

    // Verificamos si ya aplicamos la actualización del menú (Seed Version 2)
    const seedVersion = await db.settings.get('db_seed_version');

    if (!seedVersion || seedVersion.value < 5) {
        console.log("Aplicando actualización de datos v5 (Stock Masivo 100u)...");
        await Promise.all([
            db.products.clear(),
            db.suppliers.clear(),
            db.stores.clear(),
            db.invoices.clear(),
            db.dispatches.clear(),
            db.storePayments.clear(),
            db.supplierPayments.clear(),
            db.stockAdjustments.clear(),
            db.auditLogs.clear()
        ]);
        await db.settings.put({ id: 'db_seed_version', value: 5 });
    } else {
        // Si ya estamos en la versión correcta y hay datos, no hacemos nada
        if (await db.products.count() > 0) return;
    }

    console.log("Generando Ecosistema de Datos (Menú Real)...");

    // 1. PROVEEDORES
    const supplierData: Supplier[] = [
        { id: 'sup-01', name: 'Distribuidora Central de Alimentos', taxId: 'J-30000001-1', phone: '0212-1110011', totalVolume: 0, debt: 0, bankAccount: '0102-0001-...', color: '#3b82f6' },
        { id: 'sup-02', name: 'EuroVinos & Licores Import', taxId: 'J-30000002-2', phone: '0212-2220022', totalVolume: 0, debt: 0, bankAccount: '0134-0022-...', color: '#ec4899' },
        { id: 'sup-03', name: 'Equipos y Menaje Profesional', taxId: 'J-30000003-3', phone: '0212-3330033', totalVolume: 0, debt: 0, bankAccount: '0105-0033-...', color: '#f59e0b' },
        { id: 'sup-04', name: 'Almacenes Cárnicos del Norte', taxId: 'J-30000004-4', phone: '0212-4440044', totalVolume: 0, debt: 0, bankAccount: '0108-0044-...', color: '#dc2626' },
        { id: 'sup-local', name: 'PRODUCCIÓN PROPIA (LOCAL)', taxId: 'V-PROPIO', phone: '-', totalVolume: 0, debt: 0, bankAccount: 'CAJA CHICA', color: '#6b7280' }
    ];
    await db.suppliers.bulkPut(supplierData);

    // 2. PRODUCTOS
    const productData: Product[] = [
        // --- PROTEÍNAS (UNIDADES O KG) ---
        { id: 'p-carn-01', name: 'Carne de Hamburguesa (Unidad)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 0.85, purchaseTax: 0, purchaseFreight: 0.05, supplyPrice: 1.20, retailPrice: 1.50, imageUrl: 'https://placehold.co/400x400/8B0000/FFFFFF/png?text=Carne+H', color: '#8B0000', stock: 100, maxStock: 2000, brand: 'Cárnicos del Norte', presentation: 'Caja x 50 Unid', unit: 'u' },
        { id: 'p-carn-02', name: 'Filet de Pollo (Kg)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 4.50, purchaseTax: 0, purchaseFreight: 0.20, supplyPrice: 5.50, retailPrice: 7.00, imageUrl: 'https://placehold.co/400x400/F5F5DC/000000/png?text=Pollo', color: '#F5F5DC', stock: 100, maxStock: 500, brand: 'Granja Vital', presentation: 'Bolsa x 5Kg', unit: 'kg' },
        { id: 'p-carn-03', name: 'Pernil Horneado (Kg)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 6.80, purchaseTax: 0, purchaseFreight: 0.20, supplyPrice: 8.50, retailPrice: 10.00, imageUrl: 'https://placehold.co/400x400/cd7f32/FFFFFF/png?text=Pernil', color: '#cd7f32', stock: 100, maxStock: 300, brand: 'Selecto', presentation: 'Pieza Sellada', unit: 'kg' },
        { id: 'p-carn-04', name: 'Chuleta Ahumada (Kg)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 5.20, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 6.50, retailPrice: 8.00, imageUrl: 'https://placehold.co/400x400/ff6347/FFFFFF/png?text=Chuleta', color: '#ff6347', stock: 100, maxStock: 400, brand: 'AhumaMax', presentation: 'Paquete x 2Kg', unit: 'kg' },
        { id: 'p-carn-05', name: 'Carne Mechada Preparada (Kg)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 7.50, purchaseTax: 0, purchaseFreight: 0.20, supplyPrice: 9.50, retailPrice: 12.00, imageUrl: 'https://placehold.co/400x400/8b4513/FFFFFF/png?text=Mechada', color: '#8b4513', stock: 100, maxStock: 200, brand: 'Cocina Real', presentation: 'Envase al Vacío', unit: 'kg' },
        { id: 'p-carn-06', name: 'Salchicha de Perro (Unid)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 0.15, purchaseTax: 0, purchaseFreight: 0.02, supplyPrice: 0.25, retailPrice: 0.40, imageUrl: 'https://placehold.co/400x400/ff4500/FFFFFF/png?text=Salchicha', color: '#ff4500', stock: 100, maxStock: 5000, brand: 'Zander', presentation: 'Paquete x 22 Unid', unit: 'u' },
        { id: 'p-carn-07', name: 'Pepperoni Rebanado (Kg)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 12.00, purchaseTax: 0, purchaseFreight: 0.50, supplyPrice: 15.00, retailPrice: 18.00, imageUrl: 'https://placehold.co/400x400/a52a2a/FFFFFF/png?text=Pepperoni', color: '#a52a2a', stock: 100, maxStock: 100, brand: 'ItaliaMia', presentation: 'Bolsa 1kg', unit: 'kg' },
        { id: 'p-carn-08', name: 'Jamón Ahumado Rebanado (Kg)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 6.00, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 7.50, retailPrice: 9.00, imageUrl: 'https://placehold.co/400x400/ffb6c1/000000/png?text=Jamon', color: '#ffb6c1', stock: 100, maxStock: 400, brand: 'Plumrose', presentation: 'Pack 1kg', unit: 'kg' },
        { id: 'p-carn-09', name: 'Tocineta (Kg)', supplierId: 'sup-04', supplierName: 'Almacenes Cárnicos', purchaseCost: 9.00, purchaseTax: 0, purchaseFreight: 0.20, supplyPrice: 11.50, retailPrice: 14.00, imageUrl: 'https://placehold.co/400x400/ffcad4/000000/png?text=Tocineta', color: '#ffcad4', stock: 100, maxStock: 150, brand: 'Elite', presentation: 'Paquete x 1Kg', unit: 'kg' },

        // --- LÁCTEOS ---
        { id: 'p-lact-01', name: 'Queso Mozzarella Rayado (Kg)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 5.50, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 6.80, retailPrice: 8.50, imageUrl: 'https://placehold.co/400x400/fffafa/000000/png?text=Mozzarella', color: '#fffafa', stock: 100, maxStock: 1000, brand: 'Lácteos Andes', presentation: 'Bolsas x 2Kg', unit: 'kg' },
        { id: 'p-lact-02', name: 'Queso Amarillo Rebanado (Kg)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 7.20, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 9.00, retailPrice: 11.00, imageUrl: 'https://placehold.co/400x400/ffd700/000000/png?text=Queso+Amarillo', color: '#ffd700', stock: 100, maxStock: 300, brand: 'Torondoy', presentation: 'Pack 1kg', unit: 'kg' },
        { id: 'p-lact-03', name: 'Queso Blanco Cebú (Kg)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 4.80, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 6.00, retailPrice: 7.50, imageUrl: 'https://placehold.co/400x400/ffffff/000000/png?text=Queso+Blanco', color: '#ffffff', stock: 100, maxStock: 500, brand: 'Finca', presentation: 'Bloque x 2.5kg', unit: 'kg' },

        // --- VÍVERES ---
        { id: 'p-viv-01', name: 'Harina de Trigo Pizza (Saco 45Kg)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 35.00, purchaseTax: 0, purchaseFreight: 2.00, supplyPrice: 42.00, retailPrice: 50.00, imageUrl: 'https://placehold.co/400x400/f5deb3/000000/png?text=Harina+Trigo', color: '#f5deb3', stock: 100, maxStock: 100, brand: 'Monalisa', presentation: 'Saco 45Kg', unit: 'kg' },
        { id: 'p-viv-02', name: 'Harina de Maíz (Bulto 20Kg)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 18.00, purchaseTax: 0, purchaseFreight: 1.00, supplyPrice: 22.00, retailPrice: 28.00, imageUrl: 'https://placehold.co/400x400/fffacd/000000/png?text=Harina+Maiz', color: '#fffacd', stock: 100, maxStock: 150, brand: 'P.A.N.', presentation: 'Bulto 20 x 1Kg', unit: 'kg' },
        { id: 'p-viv-03', name: 'Salsa de Tomate Pizza (Galón)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 10.00, purchaseTax: 0, purchaseFreight: 0.50, supplyPrice: 12.50, retailPrice: 16.00, imageUrl: 'https://placehold.co/400x400/ff0000/FFFFFF/png?text=Salsa+Pizza', color: '#ff0000', stock: 100, maxStock: 200, brand: 'Pomodoro', presentation: 'Cuñete 19L', unit: 'u' },
        { id: 'p-viv-04', name: 'Aceite Vegetal (Cuñete 18L)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 28.00, purchaseTax: 0, purchaseFreight: 1.00, supplyPrice: 35.00, retailPrice: 42.00, imageUrl: 'https://placehold.co/400x400/daa520/FFFFFF/png?text=Aceite', color: '#daa520', stock: 100, maxStock: 80, brand: 'Vatel', presentation: 'Cuñete 18L', unit: 'u' },
        { id: 'p-viv-05', name: 'Mayonesa (Galón)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 14.00, purchaseTax: 0, purchaseFreight: 0, supplyPrice: 18.50, retailPrice: 24.00, imageUrl: 'https://placehold.co/400x400/ffffff/000000/png?text=Mayo', color: '#ffffff', stock: 100, maxStock: 100, brand: 'Kraft', presentation: 'Galón 3.8L', unit: 'u' },

        // --- PANIFICACIÓN / BASES ---
        { id: 'p-pan-01', name: 'Pan de Hamburguesa (Paquete x 8)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 2.20, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 3.00, retailPrice: 4.50, imageUrl: 'https://placehold.co/400x400/deb887/000000/png?text=Pan+H', color: '#deb887', stock: 100, maxStock: 500, brand: 'Bimbo', presentation: 'Bolsa x 8 Unid', unit: 'u' },
        { id: 'p-pan-02', name: 'Pan de Perro Caliente (Paquete x 10)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 1.80, purchaseTax: 0, purchaseFreight: 0.10, supplyPrice: 2.50, retailPrice: 3.80, imageUrl: 'https://placehold.co/400x400/f5f5dc/000000/png?text=Pan+P', color: '#f5f5dc', stock: 100, maxStock: 500, brand: 'Holsum', presentation: 'Bolsa x 10 Unid', unit: 'u' },
        { id: 'p-pan-03', name: 'Tequeños Crudos (Bandeja x 50)', supplierId: 'sup-01', supplierName: 'Distribuidora Central', purchaseCost: 8.00, purchaseTax: 0, purchaseFreight: 0.50, supplyPrice: 11.00, retailPrice: 15.00, imageUrl: 'https://placehold.co/400x400/fff8dc/000000/png?text=Tequenos', color: '#fff8dc', stock: 100, maxStock: 200, brand: 'Artesanal', presentation: 'Bandeja x 50', unit: 'u' },

        // --- VERDURAS / FRESCOS ---
        { id: 'p-verd-01', name: 'Papa para Freír (Saco 45Kg)', supplierId: 'sup-03', supplierName: 'Equipos y Menaje', purchaseCost: 25.00, purchaseTax: 0, purchaseFreight: 2.00, supplyPrice: 35.00, retailPrice: 45.00, imageUrl: 'https://placehold.co/400x400/daa520/FFFFFF/png?text=Papa', color: '#daa520', stock: 100, maxStock: 100, brand: 'Campo', presentation: 'Saco 45Kg', unit: 'kg' },
        { id: 'p-verd-02', name: 'Cebolla Blanca (Saco 20Kg)', supplierId: 'sup-03', supplierName: 'Equipos y Menaje', purchaseCost: 15.00, purchaseTax: 0, purchaseFreight: 1.00, supplyPrice: 20.00, retailPrice: 30.00, imageUrl: 'https://placehold.co/400x400/ffffff/000000/png?text=Cebolla', color: '#ffffff', stock: 100, maxStock: 50, brand: 'Campo', presentation: 'Saco 20Kg', unit: 'kg' },

        // --- BEBIDAS ---
        { id: 'p-bebi-01', name: 'Refresco 1.5L (Caja x 6)', supplierId: 'sup-02', supplierName: 'EuroVinos', purchaseCost: 8.50, purchaseTax: 1.36, purchaseFreight: 0.50, supplyPrice: 12.00, retailPrice: 18.00, imageUrl: 'https://placehold.co/400x400/cc0000/FFFFFF/png?text=Refresco', color: '#cc0000', stock: 100, maxStock: 200, brand: 'Coca-Cola', presentation: 'Caja x 6 Botellas', unit: 'u' },
        { id: 'p-bebi-02', name: 'Agua Mineral 600ml (Caja x 24)', supplierId: 'sup-02', supplierName: 'EuroVinos', purchaseCost: 6.00, purchaseTax: 0, purchaseFreight: 1.00, supplyPrice: 9.00, retailPrice: 15.00, imageUrl: 'https://placehold.co/400x400/00bfff/FFFFFF/png?text=Agua', color: '#00bfff', stock: 100, maxStock: 100, brand: 'Minalba', presentation: 'Caja x 24 Botellas', unit: 'u' },

        // --- EMPAQUES ---
        { id: 'p-empa-01', name: 'Caja de Pizza Familiar (Pack x 50)', supplierId: 'sup-03', supplierName: 'Equipos y Menaje', purchaseCost: 12.00, purchaseTax: 0, purchaseFreight: 1.00, supplyPrice: 18.00, retailPrice: 25.00, imageUrl: 'https://placehold.co/400x400/8b4513/FFFFFF/png?text=Cajas', color: '#8b4513', stock: 100, maxStock: 500, brand: 'CartonExpress', presentation: 'Atado x 50', unit: 'u' }
    ];
    await db.products.bulkPut(productData);

    // --- GENERAR FACTURAS DE STOCK INICIAL (100u POR PRODUCTO) ---
    // Agrupamos productos por proveedor
    const productsBySupplier: { [key: string]: Product[] } = {};
    productData.forEach(p => {
        if (!productsBySupplier[p.supplierId]) productsBySupplier[p.supplierId] = [];
        productsBySupplier[p.supplierId].push(p);
    });

    const initialInvoices: Invoice[] = [];

    // Creamos una factura por proveedor con 100u de cada producto
    Object.keys(productsBySupplier).forEach(supId => {
        const prods = productsBySupplier[supId];
        const items = prods.map(p => ({
            productId: p.id,
            quantity: 100, // <--- AQUÍ ESTÁN LAS 100 UNIDADES
            unitCost: p.purchaseCost,
            unitTax: p.purchaseTax,      // Agregado unitTax
            unitFreight: p.purchaseFreight, // Agregado unitFreight
            totalItemCost: (p.purchaseCost + p.purchaseTax + p.purchaseFreight) * 100 // Agregado totalItemCost
        }));

        const subtotal = items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0);
        const taxAmount = items.reduce((acc, i) => acc + (i.quantity * i.unitTax || 0), 0);
        const freightAmount = items.reduce((acc, i) => acc + (i.quantity * i.unitFreight || 0), 0);
        const total = subtotal + taxAmount + freightAmount;

        initialInvoices.push({
            id: `inv-init-${supId}`,
            invoiceNumber: `INIT-100-${supId.split('-')[1]}`,
            supplierId: supId,
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días crédito
            items: items,
            status: 'pending',
            totalAmount: total,
            amountPaid: 0,
            notes: 'Stock Inicial Automático (100u por producto)'
        });
    });

    await db.invoices.bulkPut(initialInvoices);

    // Actualizamos el stock físico (aunque ya se definió en productData, esto asegura consistencia futura si cambiamos lógica)
    // En este punto, 'productData' ya tiene stock=100, así que el bulkPut anterior ya lo puso bien.
    // No hace falta otro update.

    const invoiceData: Invoice[] = [
        {
            id: 'inv-2026-001',
            supplierId: 'sup-04',
            invoiceNumber: 'FAC-STOCK-POCHO',
            date: '2026-01-20',
            totalAmount: 12500,
            amountPaid: 0,
            status: 'pending',
            items: [
                { productId: 'p-carn-01', quantity: 500, unitCost: 0.85, unitTax: 0, unitFreight: 0.05, totalItemCost: 450 },
                { productId: 'p-carn-02', quantity: 800, unitCost: 4.50, unitTax: 0, unitFreight: 0.20, totalItemCost: 3760 }
            ],
            notes: 'Factura de prueba'
        }
    ];
    await db.invoices.bulkPut(invoiceData);

    // 3. SUCURSALES (ACTUALIZADAS A NUEVA LISTA)
    const storeData: Store[] = [
        { id: 'st-01', name: 'Pocho Burger', location: 'Altamira', color: '#dc2626', totalDebt: 0, lastDispatch: '-', manager: 'Encargado Pocho', phone: '-', address: 'Sector Altamira', terminals: [], config: { allowsCredit: true, maxDebtLimit: 25000, paymentTermDays: 15 } },
        { id: 'st-02', name: 'Pocho Bistro', location: 'Tierra Negra', color: '#10b981', totalDebt: 0, lastDispatch: '-', manager: 'Encargado Pocho', phone: '-', address: 'Sector Tierra Negra', terminals: [], config: { allowsCredit: true, maxDebtLimit: 30000, paymentTermDays: 15 } },
        { id: 'st-03', name: 'Pocho Mar y Tierra', location: 'Club Hipico', color: '#3b82f6', totalDebt: 0, lastDispatch: '-', manager: 'Encargado Pocho', phone: '-', address: 'Sector Club Hipico', terminals: [], config: { allowsCredit: true, maxDebtLimit: 50000, paymentTermDays: 20 } },
        { id: 'st-04', name: 'Pizzeria Margarita', location: 'Varillal', color: '#f59e0b', totalDebt: 0, lastDispatch: '-', manager: 'Admin Margarita', phone: '-', address: 'Dirección Varillal', terminals: [], config: { allowsCredit: true, maxDebtLimit: 15000, paymentTermDays: 10 } },
        { id: 'st-05', name: 'Mi Ranchito', location: 'Mar y Leña', color: '#8b5cf6', totalDebt: 0, lastDispatch: '-', manager: 'Gerente Ranchito', phone: '-', address: 'Via el Aeropuerto', terminals: [], config: { allowsCredit: true, maxDebtLimit: 60000, paymentTermDays: 30 } },
        { id: 'st-06', name: 'Mar y Leña', location: 'Via el Aeropuerto', color: '#6366f1', totalDebt: 0, lastDispatch: '-', manager: 'Admin Mar y Leña', phone: '-', address: 'Via el Aeropuerto', terminals: [], config: { allowsCredit: true, maxDebtLimit: 25000, paymentTermDays: 15 } }
    ];
    await db.stores.bulkPut(storeData);

    // 4. DESPACHOS E INGRESOS DE EJEMPLO (HISTÓRICOS PARA EL GRÁFICO)
    const generateHistoricalData = () => {
        const dispatches: StockDispatch[] = [];
        const payments: StorePayment[] = [];
        const now = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString();

            // Despacho diario
            dispatches.push({
                id: `disp-hist-${i}`,
                dispatchNumber: `D-HIST-0${i}`,
                storeId: i % 2 === 0 ? 'st-01' : 'st-02',
                timestamp: dateStr,
                status: 'active',
                totalAmount: 2000 + (Math.random() * 3000),
                driverName: 'Transporte Histórico',
                vehiclePlate: 'HIST-001',
                items: [{ productId: 'p-carn-01', quantity: 100, unitSupplyPrice: 1.20 }],
                returns: []
            });

            // Cobranza diaria (un poco menos que el despacho para mostrar deuda)
            payments.push({
                id: `pay-hist-${i}`,
                storeId: i % 2 === 0 ? 'st-01' : 'st-02',
                amount: 1500 + (Math.random() * 2000),
                date: dateStr,
                method: 'Transferencia',
                reference: `REF-H-0${i}`
            });
        }
        return { dispatches, payments };
    };

    const hist = generateHistoricalData();
    await db.dispatches.bulkPut(hist.dispatches);
    await db.storePayments.bulkPut(hist.payments);
};
