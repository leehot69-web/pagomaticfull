import React, { useMemo } from 'react';
import { ClockIcon, ActivityIcon, UsersIcon } from './IconComponents';
import { exportFullDatabase, importFullDatabase } from '../utils/backupUtils';
import { useNotifications } from '../NotificationSystem';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { BluetoothIcon, PrinterIcon } from './IconComponents';
import { connectBluetoothPrinter, testPrinter, isPrinterConnected, getConnectedDeviceName, type PrinterSize } from '../utils/thermalPrinterUtils';

interface SecurityDashboardProps {
    storeName: string;
    onUpdateStoreName: (name: string) => void;
    printerSize?: string;
    onUpdatePrinterSize?: (size: string) => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
    storeName,
    onUpdateStoreName,
    printerSize = '80mm',
    onUpdatePrinterSize
}) => {
    const { notify } = useNotifications();
    const [connectedName, setConnectedName] = React.useState<string | null>(getConnectedDeviceName());
    const isConnected = isPrinterConnected();

    // Obtener fecha del último respaldo interno
    const lastBackup = useLiveQuery(() => db.backups.orderBy('date').last());
    const lastBackupDate = useMemo(() => lastBackup ? new Date(lastBackup.date) : null, [lastBackup]);

    // Obtener Auditoría
    const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().limit(50).toArray()) || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-4xl font-black text-gray-900 mb-1 uppercase tracking-tighter">BÓVEDA DE SEGURIDAD</h2>
                <p className="text-gray-400 font-bold text-sm">Protección de datos y rastreo de auditoría central.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Estados y Backups */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-8 bg-gray-50/50 border-b">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Respaldo de Datos</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-start gap-4 p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                                <ClockIcon className="w-5 h-5 text-emerald-600 mt-1" />
                                <div>
                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Auto-Respaldo</p>
                                    <p className="text-[10px] font-bold text-emerald-700 leading-tight">Cada 10 min el sistema guarda una copia interna.</p>
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mt-2">Último: {lastBackupDate?.toLocaleTimeString() || '...'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => exportFullDatabase()}
                                    className="w-full bg-gray-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg"
                                >
                                    Descargar Backup JSON
                                </button>
                                <label className="w-full bg-white border-2 border-gray-100 hover:border-blue-600 hover:text-blue-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm cursor-pointer flex items-center justify-center">
                                    Restaurar desde archivo
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".json"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = async (ev) => {
                                                    const content = ev.target?.result as string;
                                                    if (await importFullDatabase(content)) {
                                                        notify('Base de datos restaurada con éxito', 'success');
                                                        setTimeout(() => window.location.reload(), 1500);
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 p-8 rounded-[40px] text-white">
                        <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest mb-4">Gestión de Crédito</p>
                        <ul className="space-y-4">
                            <li className="flex gap-3 items-start">
                                <ActivityIcon className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                                <p className="text-[11px] font-bold text-gray-400">Bloqueo automático si se supera el límite de crédito de la sucursal.</p>
                            </li>
                            <li className="flex gap-3 items-start">
                                <ActivityIcon className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                                <p className="text-[11px] font-bold text-gray-400">Prohibición de despacho ante existencias de facturas vencidas.</p>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Configuración de Membrete</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nombre de la Tienda / Franquicia</label>
                                    <input
                                        type="text"
                                        value={storeName}
                                        onChange={(e) => onUpdateStoreName(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-primary rounded-xl px-4 py-3 text-xs font-black uppercase text-gray-900 outline-none transition-all"
                                        placeholder="Nombre de la Tienda"
                                    />
                                    <p className="text-[8px] font-bold text-gray-500 mt-2 uppercase">Aparece en login, reportes y documentos.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Impresora Térmica</p>
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tamaño de Papel</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['56mm', '80mm'].map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => onUpdatePrinterSize?.(size)}
                                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${printerSize === size
                                                    ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-5">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const name = await connectBluetoothPrinter();
                                                setConnectedName(name);
                                                notify(`Impresora ${name} conectada`, 'success');
                                            } catch (err) {
                                                notify('Error al conectar impresora', 'error');
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isConnected
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'}`}
                                    >
                                        <BluetoothIcon className="w-4 h-4" />
                                        {isConnected ? 'Conectado' : 'Conectar'}
                                    </button>

                                    {isConnected && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await testPrinter(printerSize as PrinterSize);
                                                    notify('Prueba de impresión enviada', 'success');
                                                } catch (err) {
                                                    notify('Error en prueba de impresión', 'error');
                                                }
                                            }}
                                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                                        >
                                            <PrinterIcon className="w-4 h-4" />
                                            Probar
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-[8px] font-bold text-gray-500 mt-4 uppercase text-center italic">
                                {isConnected ? `Vinculado a: ${connectedName}` : 'Adaptación automática del ticket al ancho seleccionado.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: LOG DE AUDITORÍA */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                        <div className="p-8 bg-gray-50/50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Tracking de Auditoría (Audit Trail)</h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Registro de operaciones críticas en tiempo real</p>
                            </div>
                            <ActivityIcon className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[600px]">
                            <div className="space-y-2">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="group p-4 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all flex items-start gap-4">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.action === 'block' ? 'bg-red-500 animate-pulse' :
                                            log.action === 'anular' ? 'bg-orange-500' : 'bg-blue-500'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <p className="text-[10px] font-black text-gray-900 uppercase truncate">
                                                    {log.userName} • <span className={`${log.action === 'block' ? 'text-red-600' :
                                                        log.action === 'anular' ? 'text-orange-600' : 'text-blue-600'
                                                        }`}>{log.action.toUpperCase()}</span>
                                                </p>
                                                <p className="text-[9px] font-bold text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            <p className="text-xs font-bold text-gray-600 mt-1">{log.details}</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase mt-1 tracking-widest">{log.entity}: {log.entityId}</p>
                                        </div>
                                    </div>
                                ))}
                                {auditLogs.length === 0 && (
                                    <div className="py-20 text-center">
                                        <UsersIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin registros de auditoría</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
