import { DocumentData } from './shareUtils';

export type PrinterSize = '56mm' | '80mm';

export interface ThermalPrintOptions {
    size: PrinterSize;
    copyType?: 'ORIGINAL' | 'COPIA SUCURSAL' | 'COPIA CHOFER' | 'REIMPRESIÓN';
    printCount?: number;
    mode?: 'window' | 'bluetooth';
}

// Bluetooth State (singleton for the session)
let connectedDevice: any = null;
let printerCharacteristic: any = null;

export const isPrinterConnected = () => !!printerCharacteristic;
export const getConnectedDeviceName = () => connectedDevice?.name || null;

export const generateThermalHTML = (doc: DocumentData, options: ThermalPrintOptions): string => {
    const { size, copyType = 'ORIGINAL', printCount = 0 } = options;
    const is80mm = size === '80mm';
    const width = is80mm ? '300px' : '210px'; // Approx widths for 80mm and 56mm

    // Label logic
    let statusLabel: string = copyType;
    if (printCount > 0 && copyType !== 'REIMPRESIÓN') {
        statusLabel = `REIMPRESIÓN #${printCount}`;
    }

    const title = {
        dispatch: 'NOTA DE ENTREGA',
        invoice: 'FACTURA COMPRA',
        payment: 'COMPROBANTE PAGO',
        store_payment: 'RECIBO DE ABONO',
        store_inventory: 'REPORTE STOCK'
    }[doc.type];

    const separator = is80mm ? '--------------------------------' : '--------------------------';
    const doubleSeparator = is80mm ? '================================' : '==========================';

    return `
        <html>
        <head>
            <style>
                @page { margin: 0; }
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    width: ${width}; 
                    margin: 0; 
                    padding: 10px; 
                    font-size: ${is80mm ? '12px' : '10px'};
                    line-height: 1.2;
                    color: #000;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .right { text-align: right; }
                .header { margin-bottom: 10px; }
                .header h1 { margin: 0; font-size: ${is80mm ? '18px' : '14px'}; text-transform: uppercase; }
                .status-badge { 
                    border: 1px solid #000; 
                    padding: 2px 5px; 
                    display: inline-block; 
                    margin: 5px 0;
                    font-weight: bold;
                }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th { text-align: left; border-bottom: 1px dashed #000; }
                .total-row { font-size: ${is80mm ? '16px' : '14px'}; font-weight: bold; margin-top: 5px; }
                .footer { margin-top: 15px; font-size: ${is80mm ? '10px' : '8px'}; text-align: center; }
                .qr-placeholder { 
                    margin: 10px auto; 
                    width: 80px; 
                    height: 80px; 
                    border: 1px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                }
            </style>
        </head>
        <body>
            <div class="center header">
                <div class="bold">POCHO CASA MATRIZ</div>
                <div>RIF: J-00000000-0</div>
                <div class="status-badge">${statusLabel}</div>
                <h1>${title}</h1>
            </div>

            <div>REF: #${doc.reference}</div>
            <div>EMITIDO: ${doc.date}</div>
            ${doc.dueDate ? `<div style="font-weight:bold;">VENCIMIENTO: ${doc.dueDate}</div>` : ''}
            ${doc.storeName ? `<div>SUCURSAL: ${doc.storeName.toUpperCase()}</div>` : ''}
            ${doc.storeAddress ? `<div style="font-size: 8px; font-weight: normal; opacity: 0.8;">DIR: ${doc.storeAddress.toUpperCase()}</div>` : ''}
            ${doc.supplierName ? `<div>PROV: ${doc.supplierName.toUpperCase()}</div>` : ''}
            
            ${doc.driverName ? `<div>CHOFER: ${doc.driverName.toUpperCase()}</div>` : ''}
            ${doc.vehiclePlate ? `<div>PLACA: ${doc.vehiclePlate.toUpperCase()}</div>` : ''}

            <div>${separator}</div>
            
            <table>
                <thead>
                    <tr>
                        <th width="15%">CANT</th>
                        <th width="55%">DESC</th>
                        <th width="30%" class="right">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${(doc.items || []).map(item => `
                        <tr>
                            <td>${item.quantity}</td>
                            <td>${item.name.substring(0, is80mm ? 18 : 12)}</td>
                            <td class="right">${(item.unitPrice * item.quantity).toFixed(0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div>${separator}</div>
            <div class="right total-row">TOTAL: $${doc.amount.toLocaleString()}</div>
            <div>${doubleSeparator}</div>

            <div style="font-size: 8px; margin-top: 10px; border: 1px solid #000; padding: 5px;">
                ${doc.type === 'dispatch' ? '1. Riesgo por consignatario. 2. Reclamos al recibir. 3. Respaldo logistico.' :
            doc.type === 'invoice' ? '1. Intereses mora segun tasa. 2. Compromiso pago formal. 3. Aceptacion precios.' :
                (doc.type === 'payment' || doc.type === 'store_payment') ? '1. Valido sujeto a fondos. 2. Aplica a doc relacionado.' :
                    'Informacion confidencial de uso exclusivo interno.'}
                ${doc.dueDate ? `<br><strong>VENCE: ${doc.dueDate}</strong>` : ''}
            </div>

            ${doc.authorizedBy ? `
                <div style="margin: 10px 0; border: 1px dashed #000; padding: 5px; text-align: center; font-size: 8px;">
                    AUTORIZADO POR ADMIN:<br>
                    <span style="font-weight:bold; font-size: 10px;">${doc.authorizedBy.toUpperCase()}</span>
                </div>
            ` : ''}

            <div style="margin-top: 20px; display: flex; justify-between: space-between;">
                <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px;">
                    ENTREGA<br>${doc.generatedBy?.toUpperCase().split(' ')[0] || 'FIRMA'}
                </div>
                <div style="width: 10%;"></div>
                <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px;">
                    RECIBE<br>FIRMA/SELLO
                </div>
            </div>

            <div class="footer">
                <br>
                PAGOMATIC V2.0
                <br>
                *** DOCUMENTO DE CONTROL INTERNO ***
            </div>

            <div class="qr-placeholder">
                [ QR SEGURIDAD ]<br>
                #${doc.id.slice(-6)}
            </div>
        </body>
        </html>
    `;
};

export const connectBluetoothPrinter = async (): Promise<string> => {
    try {
        const device = await (navigator as any).bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, { namePrefix: 'MPT' }, { namePrefix: 'Blue' }, { namePrefix: 'Printer' }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        const server = await device.gatt?.connect();
        const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        if (characteristic) {
            connectedDevice = device;
            printerCharacteristic = characteristic;

            // Listener for disconnection
            device.addEventListener('gattserverdisconnected', () => {
                connectedDevice = null;
                printerCharacteristic = null;
            });

            return device.name || 'Impresora';
        }
        throw new Error('No se encontro la caracteristica de escritura');
    } catch (error) {
        console.error('Bluetooth Error:', error);
        throw error;
    }
};

export const disconnectPrinter = () => {
    if (connectedDevice?.gatt?.connected) {
        connectedDevice.gatt.disconnect();
    }
    connectedDevice = null;
    printerCharacteristic = null;
};

const sendEscPos = async (data: Uint8Array) => {
    if (!printerCharacteristic) return;

    // Split into chunks if necessary (MTU limits)
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
    }
};

export const testPrinter = async (size: PrinterSize = '80mm') => {
    if (!printerCharacteristic) throw new Error('Impresora no conectada');

    const encoder = new TextEncoder();
    const init = new Uint8Array([0x1B, 0x40]); // Reset/Init
    const center = new Uint8Array([0x1B, 0x61, 0x01]); // Center
    const bold = new Uint8Array([0x1B, 0x45, 0x01]); // Bold on
    const normal = new Uint8Array([0x1B, 0x45, 0x00]); // Bold off
    const feed = new Uint8Array([0x0A, 0x0A, 0x0A]); // 3 line feeds
    const cut = new Uint8Array([0x1D, 0x56, 0x00]); // Full cut

    await sendEscPos(init);
    await sendEscPos(center);
    await sendEscPos(bold);
    await sendEscPos(encoder.encode("PAGOMATIC TEST\n"));
    await sendEscPos(normal);
    await sendEscPos(encoder.encode(`MODO: ${size}\n`));
    await sendEscPos(encoder.encode("CONECCION EXITOSA\n"));
    await sendEscPos(feed);
    if (size === '80mm') await sendEscPos(cut);
};

export const printThermal = async (doc: DocumentData, options: ThermalPrintOptions): Promise<void> => {
    const { mode = isPrinterConnected() ? 'bluetooth' : 'window', size } = options;

    if (mode === 'bluetooth' && printerCharacteristic) {
        try {
            const encoder = new TextEncoder();
            const init = new Uint8Array([0x1B, 0x40]);
            const center = new Uint8Array([0x1B, 0x61, 0x01]);
            const left = new Uint8Array([0x1B, 0x61, 0x00]);
            const right = new Uint8Array([0x1B, 0x61, 0x02]);
            const boldOn = new Uint8Array([0x1B, 0x45, 0x01]);
            const boldOff = new Uint8Array([0x1B, 0x45, 0x00]);

            await sendEscPos(init);
            await sendEscPos(center);
            await sendEscPos(boldOn);
            await sendEscPos(encoder.encode("POCHO CASA MATRIZ\n"));
            await sendEscPos(boldOff);
            await sendEscPos(encoder.encode(`${(doc.type || 'RECIBO').toUpperCase()}\n`));
            await sendEscPos(left);
            await sendEscPos(encoder.encode(`REF: #${doc.reference}\n`));
            await sendEscPos(encoder.encode(`EMITIDO: ${doc.date}\n`));
            if (doc.dueDate) {
                await sendEscPos(boldOn);
                await sendEscPos(encoder.encode(`VENCE: ${doc.dueDate}\n`));
                await sendEscPos(boldOff);
            }
            if (doc.storeName) await sendEscPos(encoder.encode(`SUC: ${doc.storeName.toUpperCase()}\n`));
            if (doc.storeAddress) await sendEscPos(encoder.encode(`DIR: ${doc.storeAddress.substring(0, 32).toUpperCase()}\n`));

            if (doc.driverName) await sendEscPos(encoder.encode(`CHOFER: ${doc.driverName.toUpperCase()}\n`));
            if (doc.vehiclePlate) await sendEscPos(encoder.encode(`PLACA: ${doc.vehiclePlate.toUpperCase()}\n`));

            await sendEscPos(encoder.encode("--------------------------------\n"));

            for (const item of (doc.items || [])) {
                const line = `${item.quantity} x ${item.name.substring(0, 15)}`.padEnd(20) + `$${(item.unitPrice * item.quantity).toFixed(0)}`.padStart(12);
                await sendEscPos(encoder.encode(line + "\n"));
            }

            await sendEscPos(encoder.encode("--------------------------------\n"));
            await sendEscPos(right);
            await sendEscPos(boldOn);
            await sendEscPos(encoder.encode(`TOTAL: $${doc.amount.toLocaleString()}\n`));
            await sendEscPos(boldOff);

            await sendEscPos(left);
            if (doc.type === 'dispatch') {
                await sendEscPos(encoder.encode("\nCLAUSULAS: 1.Riesgo consignatario.\n"));
                await sendEscPos(encoder.encode("2.Reclamos al recibir el pedido.\n"));
            } else if (doc.type === 'invoice') {
                await sendEscPos(encoder.encode("\nCLAUSULAS: 1.Intereses mora aplican\n"));
                await sendEscPos(encoder.encode("2.Compromiso de pago formal.\n"));
            } else if (doc.type === 'payment' || doc.type === 'store_payment') {
                await sendEscPos(encoder.encode("\nCLAUSULAS: 1.Valido sujeto a fondos\n"));
                await sendEscPos(encoder.encode("2.Aplica a documento relacionado.\n"));
            }
            if (doc.dueDate) {
                await sendEscPos(boldOn);
                await sendEscPos(encoder.encode(`VENCIMIENTO: ${doc.dueDate}\n`));
                await sendEscPos(boldOff);
            }

            if (doc.authorizedBy) {
                await sendEscPos(center);
                await sendEscPos(encoder.encode(`\nAUTORIZADO POR ADMIN:\n`));
                await sendEscPos(boldOn);
                await sendEscPos(encoder.encode(`${doc.authorizedBy.toUpperCase()}\n`));
                await sendEscPos(boldOff);
                await sendEscPos(left);
            }

            await sendEscPos(encoder.encode("\n\n________________    ________________\n"));
            await sendEscPos(encoder.encode("    ENTREGA             RECIBE      \n"));

            await sendEscPos(center);
            await sendEscPos(encoder.encode("\nPAGOMATIC V2.0\n"));
            await sendEscPos(encoder.encode("*** CONTROL INTERNO ***\n\n\n\n"));
            if (size === '80mm') await sendEscPos(new Uint8Array([0x1D, 0x56, 0x00]));
        } catch (error) {
            console.error('Bluetooth Print Error:', error);
            // Fallback to window print if bluetooth fails
            const html = generateThermalHTML(doc, options);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 250);
            }
        }
    } else {
        const html = generateThermalHTML(doc, options);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    }
};

// SMART PRINT: Detecta automáticamente el mejor método de impresión
// Si hay impresora térmica conectada → usa Bluetooth ESC/POS
// Si no hay impresora térmica → usa PDF estándar profesional
export const smartPrint = async (
    doc: DocumentData,
    options: ThermalPrintOptions,
    fallbackPrintFn?: (doc: DocumentData) => void
): Promise<void> => {
    if (isPrinterConnected()) {
        // Impresora térmica Bluetooth conectada
        await printThermal(doc, { ...options, mode: 'bluetooth' });
    } else if (fallbackPrintFn) {
        // No hay impresora térmica, usar función de fallback (PDF)
        fallbackPrintFn(doc);
    } else {
        // Fallback por defecto: ventana de impresión con formato térmico
        await printThermal(doc, { ...options, mode: 'window' });
    }
};

// Helper para obtener el modo de impresión actual
export const getPrintMode = (): 'thermal' | 'pdf' => {
    return isPrinterConnected() ? 'thermal' : 'pdf';
};

// Helper para obtener el texto del botón de impresión
export const getPrintButtonLabel = (): string => {
    return isPrinterConnected() ? 'Imprimir Térmico' : 'Imprimir / PDF';
};
