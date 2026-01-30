import { db } from '../db';

export const exportFullDatabase = async () => {
    const tables = ['suppliers', 'stores', 'products', 'invoices', 'dispatches', 'storePayments', 'supplierPayments', 'stockAdjustments'];
    const backupData: any = {};

    for (const table of tables) {
        backupData[table] = await (db as any)[table].toArray();
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PAGOMATIC_BACKUP_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}h.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const createInternalBackup = async () => {
    const tables = ['suppliers', 'stores', 'products', 'invoices', 'dispatches', 'storePayments', 'supplierPayments', 'stockAdjustments'];
    const backupData: any = {};

    for (const table of tables) {
        backupData[table] = await (db as any)[table].toArray();
    }

    const backupRecord = {
        id: `backup-${Date.now()}`,
        date: new Date().toISOString(),
        data: JSON.stringify(backupData)
    };

    await db.backups.add(backupRecord);

    // Mantener solo los últimos 5 respaldos internos para no saturar IndexedDB
    const count = await db.backups.count();
    if (count > 5) {
        const oldest = await db.backups.orderBy('date').first();
        if (oldest) await db.backups.delete(oldest.id);
    }
};

export const importFullDatabase = async (jsonFile: string) => {
    try {
        const backupData = JSON.parse(jsonFile);
        const tables = Object.keys(backupData);

        for (const table of tables) {
            if ((db as any)[table]) {
                await (db as any)[table].clear();
                await (db as any)[table].bulkAdd(backupData[table]);
            }
        }
        return true;
    } catch (error) {
        console.error("Error al importar base de datos:", error);
        return false;
    }
};
