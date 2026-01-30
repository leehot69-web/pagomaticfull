import React from 'react';

// Iconos compartidos
export const PrintIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

export const ViewIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

// Tipos de documentos
export type DocumentType = 'dispatch' | 'invoice' | 'payment' | 'store_payment' | 'store_inventory';

export interface DocumentData {
    type: DocumentType;
    id: string;
    reference: string;
    date: string;
    amount: number;
    items?: { name: string; quantity: number; unitPrice: number }[];
    // Despacho
    storeName?: string;
    storeAddress?: string;
    driverName?: string;
    vehiclePlate?: string;
    // Factura
    supplierName?: string;
    invoiceNumber?: string;
    // Pago
    method?: string;
    concept?: string;
    // Auditoría
    generatedBy?: string;
    userRole?: string;
    authorizedBy?: string;
    dueDate?: string;
    copyType?: string;
}

const getClausesForDoc = (type: DocumentType, dueDate?: string) => {
    switch (type) {
        case 'dispatch':
            return `
                1. La mercancía viaja por cuenta y riesgo del consignatario.<br>
                2. Verifique su pedido al momento de la recepción. No se aceptan reclamos posteriores.<br>
                3. Este documento es un respaldo de entrega logística.<br>
                ${dueDate ? `<strong style="color:#ef4444;">PAGAR ANTES DEL: ${dueDate}</strong>` : ''}
            `;
        case 'invoice':
            return `
                1. Toda factura vencida genera intereses de mora según tasa legal.<br>
                2. Esta nota constituye un compromiso de pago formal e irrevocable.<br>
                3. La firma implica aceptación de productos y precios descritos.<br>
                ${dueDate ? `<strong style="color:#ef4444;">VENCIMIENTO: ${dueDate}</strong>` : ''}
            `;
        case 'payment':
        case 'store_payment':
            return `
                1. Este recibo es válido sujeto a verificación de fondos en cuenta.<br>
                2. El pago se aplica exclusivamente al documento relacionado.<br>
                3. Conserve este comprobante para conciliaciones de saldo.
            `;
        case 'store_inventory':
            return `
                1. Información confidencial de uso interno exclusivo.<br>
                2. Saldos sujetos a auditoría física y ajustes manuales.<br>
                3. Prohibida la divulgación de estos datos a terceros.
            `;
        default:
            return 'Documento de control interno.';
    }
};

const getClausesText = (type: DocumentType, dueDate?: string) => {
    return getClausesForDoc(type, dueDate).replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, "").trim();
};

// Generar texto para WhatsApp
export const generateWhatsAppText = (doc: DocumentData): string => {
    const header = {
        dispatch: '📦 *NOTA DE ENTREGA*',
        invoice: '📄 *FACTURA DE COMPRA*',
        payment: '💳 *PAGO A PROVEEDOR*',
        store_payment: '💰 *ABONO RECIBIDO*',
        store_inventory: '📊 *REPORTE DE STOCK*'
    }[doc.type];

    let text = `${header}\n━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *Ref:* #${doc.reference}\n`;
    text += `📅 *Fecha:* ${doc.date}\n`;

    if (doc.type === 'dispatch') {
        text += `🏪 *Sucursal:* ${doc.storeName || 'N/A'}\n`;
        if (doc.driverName) text += `🚚 *Chofer:* ${doc.driverName}\n`;
        if (doc.vehiclePlate) text += `🚗 *Placa:* ${doc.vehiclePlate}\n`;
    } else if (doc.type === 'invoice') {
        text += `🏭 *Proveedor:* ${doc.supplierName || 'N/A'}\n`;
        text += `🧾 *Factura:* ${doc.invoiceNumber || 'N/A'}\n`;
        if (doc.dueDate) text += `📅 *Vencimiento:* ${doc.dueDate}\n`;
    } else if (doc.type === 'payment') {
        text += `🏭 *Proveedor:* ${doc.supplierName || 'N/A'}\n`;
        text += `💳 *Método:* ${doc.method || 'N/A'}\n`;
    } else if (doc.type === 'store_payment') {
        text += `🏪 *Sucursal:* ${doc.storeName || 'N/A'}\n`;
        text += `💳 *Método:* ${doc.method || 'N/A'}\n`;
    }

    if (doc.type === 'dispatch' && doc.dueDate) {
        text += `📅 *Vencimiento:* ${doc.dueDate}\n`;
    }

    if (doc.items && doc.items.length > 0) {
        text += `━━━━━━━━━━━━━━━━━\n📋 *DETALLE:*\n`;
        doc.items.forEach(item => {
            text += `• ${item.name} x${item.quantity} = $${(item.unitPrice * item.quantity).toLocaleString()}\n`;
        });
    }

    text += `━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *TOTAL: $${doc.amount.toLocaleString()}*\n\n`;

    text += `━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *CONDICIONES:*\n`;
    text += getClausesText(doc.type, doc.dueDate) + '\n';

    if (doc.copyType && doc.copyType !== 'ORIGINAL') {
        text += `📍 *COPIA:* ${doc.copyType}\n`;
    }

    if (doc.authorizedBy) {
        text += `✅ *AUTORIZADO POR:* ${doc.authorizedBy.toUpperCase()}\n`;
    }

    text += `\n✍️ *FIRMAS:*\n`;
    text += `ENTREGADO POR: _________________\n`;
    text += `RECIBIDO POR: __________________\n\n`;

    text += `_Generado por PAGOMATIC v2.0_`;

    return text;
};

// Compartir por WhatsApp
export const shareViaWhatsApp = (doc: DocumentData): void => {
    const text = generateWhatsAppText(doc);
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
};

// Generar HTML para impresión
export const generatePrintHTML = (doc: DocumentData): string => {
    const title = {
        dispatch: 'Nota de Entrega',
        invoice: 'Factura de Compra',
        payment: 'Comprobante de Pago',
        store_payment: 'Recibo de Abono',
        store_inventory: 'Reporte de Inventario'
    }[doc.type];

    const color = {
        dispatch: '#0D254C',
        invoice: '#7C3AED',
        payment: '#DC2626',
        store_payment: '#10B981',
        store_inventory: '#3C8DBC'
    }[doc.type];

    let infoHTML = '';
    if (doc.type === 'dispatch') {
        infoHTML = `
            <div><strong>Sucursal</strong>${doc.storeName || 'N/A'}</div>
            <div><strong>Emitido</strong>${doc.date}</div>
            <div style="color:#ef4444;font-weight:bold;"><strong>Vencimiento</strong>${doc.dueDate || 'Sin asignar'}</div>
            <div><strong>Chofer</strong>${doc.driverName || 'N/A'}</div>
            <div><strong>Placa</strong>${doc.vehiclePlate || 'N/A'}</div>
        `;
    } else if (doc.type === 'invoice') {
        infoHTML = `
            <div><strong>Proveedor</strong>${doc.supplierName || 'N/A'}</div>
            <div><strong>Factura</strong>${doc.invoiceNumber || 'N/A'}</div>
            <div><strong>Emitido</strong>${doc.date}</div>
            <div style="color:#ef4444;font-weight:bold;"><strong>Vencimiento</strong>${doc.dueDate || 'Sin asignar'}</div>
            <div><strong>Estado</strong>Registrada</div>
        `;
    } else if (doc.type === 'payment') {
        infoHTML = `
            <div><strong>Proveedor</strong>${doc.supplierName || 'N/A'}</div>
            <div><strong>Fecha</strong>${doc.date}</div>
            <div><strong>Método</strong>${doc.method || 'N/A'}</div>
            <div><strong>Concepto</strong>${doc.concept || 'Pago Factura'}</div>
        `;
    } else if (doc.type === 'store_payment') {
        infoHTML = `
            <div><strong>Sucursal</strong>${doc.storeName || 'N/A'}</div>
            <div><strong>Fecha</strong>${doc.date}</div>
            <div><strong>Método</strong>${doc.method || 'N/A'}</div>
            <div><strong>Concepto</strong>${doc.concept || 'Abono Recibido'}</div>
        `;
    } else if (doc.type === 'store_inventory') {
        infoHTML = `
            <div><strong>Sucursal</strong>${doc.storeName || 'Almacén Central'}</div>
            <div><strong>Fecha</strong>${doc.date}</div>
            <div><strong>Estado</strong>Consolidado</div>
            <div><strong>Items</strong>${doc.items?.length || 0} Productos</div>
        `;
    }

    let itemsHTML = '';
    if (doc.items && doc.items.length > 0) {
        itemsHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th style="text-align:center;">${doc.type === 'store_inventory' ? 'Suministro' : 'Cant'}</th>
                        <th style="text-align:right;">${doc.type === 'store_inventory' ? 'Stock' : 'Unit'}</th>
                        <th style="text-align:right;">${doc.type === 'store_inventory' ? 'Estado' : 'Subtotal'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${doc.items.map(item => {
            let statusBadge = '';
            if (doc.type === 'store_inventory') {
                const isRed = item.quantity <= 5; // Simular stock bajo
                const isOrange = item.quantity >= 500; // Simular sobre stock
                if (isRed) statusBadge = '<span style="color:#ef4444; font-weight:900;">BAJO</span>';
                else if (isOrange) statusBadge = '<span style="color:#f59e0b; font-weight:900;">EXCESO</span>';
                else statusBadge = '<span style="color:#10b981; font-weight:900;">OK</span>';
            }

            return `
                        <tr>
                            <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
                            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${doc.type === 'store_inventory' ? `$${item.unitPrice.toLocaleString()}` : item.quantity}</td>
                            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${doc.type === 'store_inventory' ? item.quantity : `$${item.unitPrice.toLocaleString()}`}</td>
                            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${doc.type === 'store_inventory' ? statusBadge : `$${(item.unitPrice * item.quantity).toLocaleString()}`}</td>
                        </tr>
                    `;
        }).join('')}
                </tbody>
            </table>
        `;
    }

    return `
        <html>
        <head>
            <title>${title} #${doc.reference}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 3px solid ${color}; padding-bottom: 15px; margin-bottom: 15px; }
                .header h1 { margin: 0; font-size: 24px; color: ${color}; }
                .header p { margin: 5px 0 0; color: #666; font-size: 12px; }
                .ref { text-align: center; margin-bottom: 15px; }
                .ref strong { font-size: 20px; color: ${color}; background: ${color}10; padding: 8px 20px; border-radius: 10px; }
                .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; font-size: 12px; }
                .info div { background: #f5f5f5; padding: 10px; border-radius: 8px; }
                .info strong { display: block; color: #666; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
                th { background: ${color}; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
                .total { text-align: right; font-size: 28px; font-weight: bold; color: ${color}; margin-top: 20px; border-top: 3px solid ${color}; padding-top: 15px; }
                .footer { text-align: center; margin-top: 25px; font-size: 10px; color: #999; border-top: 1px dashed #ddd; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <p style="margin:0; font-weight:900; color:#999; letter-spacing:2px; font-size:10px;">SISTEMA PAGOMATIC</p>
                ${doc.copyType && doc.copyType !== 'ORIGINAL' ? `<div style="display:inline-block; border:2px solid #000; padding:4px 10px; font-weight:900; margin-bottom:10px; font-size:14px;">${doc.copyType}</div>` : ''}
                <h1>${doc.storeName || 'Comprobante'}</h1>
                <p>${title}</p>
            </div>
            <div class="ref">
                <strong>#${doc.reference}</strong>
            </div>
            <div class="info">
                ${infoHTML}
            </div>
            ${itemsHTML}
            <div class="total">Total: $${doc.amount.toLocaleString()}</div>
            
            <div style="margin-top: 20px; font-size: 9px; line-height: 1.4; color: #444; border: 1px solid #eee; padding: 15px; border-radius: 12px; background: #fff;">
                <strong style="display: block; text-transform: uppercase; margin-bottom: 5px; color: #000;">Términos y Condiciones:</strong>
                ${getClausesForDoc(doc.type, doc.dueDate)}
            </div>

            <div style="margin-top: 30px; display: grid; grid-cols: 1fr; gap: 20px; text-align: center;">
                ${doc.authorizedBy ? `
                    <div style="background: #f0fdf4; border: 2px dashed #16a34a; padding: 15px; border-radius: 12px; margin-bottom: 10px;">
                        <p style="margin: 0; font-size: 10px; font-weight: 900; color: #16a34a; text-transform: uppercase; letter-spacing: 1px;">Documento Verificado y Autorizado</p>
                        <p style="margin: 5px 0 0; font-size: 16px; font-weight: 900; color: #064e3b; font-style: italic;">POR: ${doc.authorizedBy.toUpperCase()}</p>
                    </div>
                ` : ''}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 0 10px;">
                    <div style="text-align: center; border-top: 1px solid #333; padding-top: 10px;">
                        <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Entregado Por</span>
                        <p style="font-size: 9px; color: #666; margin-top: 5px;">${doc.generatedBy || 'Personal Autorizado'}</p>
                    </div>
                    <div style="text-align: center; border-top: 1px solid #333; padding-top: 10px;">
                        <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Recibido Conforme</span>
                        <p style="font-size: 9px; color: #666; margin-top: 5px;">Firma, Nombre y Sello</p>
                    </div>
                </div>
            </div>

            <div class="footer">
                PAGOMATIC v2.0 • SISTEMA DE CONTROL DE DESPACHOS • ${new Date().toLocaleString()}
            </div>
        </body>
        </html>
    `;
};

// Imprimir documento
export const printDocument = (doc: DocumentData): void => {
    const html = generatePrintHTML(doc);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
};

// Componente de botones de acción
interface ActionButtonsProps {
    onView?: () => void;
    onPrint: () => void;
    onWhatsApp: () => void;
    onDelete?: () => void;
    size?: 'sm' | 'md';
    printLabel?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    onView,
    onPrint,
    onWhatsApp,
    onDelete,
    size = 'md',
    printLabel
}) => {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    const btnSize = size === 'sm' ? 'p-1.5' : 'p-2';

    return (
        <div className="flex items-center gap-2">
            {onView && (
                <button
                    onClick={onView}
                    className={`${btnSize} bg-gray-100 hover:bg-brand-primary hover:text-white rounded-lg transition-all`}
                    title="Ver Detalle"
                >
                    <ViewIcon className={iconSize} />
                </button>
            )}
            <button
                onClick={onPrint}
                className={`${btnSize} bg-gray-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all`}
                title={printLabel || "Imprimir"}
            >
                <PrintIcon className={iconSize} />
            </button>
            <button
                onClick={onWhatsApp}
                className={`${btnSize} bg-gray-100 hover:bg-green-600 hover:text-white rounded-lg transition-all`}
                title="Compartir por WhatsApp"
            >
                <WhatsAppIcon className={iconSize} />
            </button>
            {onDelete && (
                <button
                    onClick={onDelete}
                    className={`${btnSize} bg-orange-100 hover:bg-orange-500 hover:text-white rounded-lg transition-all`}
                    title="Anular"
                >
                    <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </button>
            )}
        </div>
    );
};
