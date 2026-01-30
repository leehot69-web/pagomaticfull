import React, { useState } from 'react';
import { UsersIcon, ActivityIcon, DollarSignIcon, ClockIcon, CheckCircleIcon, XIcon } from './IconComponents';
import { useNotifications } from '../NotificationSystem';
import type { User, UserRole } from '../types';

interface PersonnelDashboardProps {
    users: User[];
    onAddUser: (u: Partial<User>) => void;
    onDeleteUser: (id: string) => void;
    onUpdateUser: (id: string, updates: Partial<User>) => void;
    storeName?: string;
}

const ROLE_CONFIG: Record<UserRole, { label: string, color: string, description: string }> = {
    ADMIN: { label: 'Administrador', color: 'bg-red-100 text-red-700 border-red-200', description: 'Acceso total a todos los módulos y seguridad.' },
    COMPRAS: { label: 'Compras / Almacén', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', description: 'Carga de facturas, gestión de proveedores y stock.' },
    DESPACHOS: { label: 'Logística / Despacho', color: 'bg-orange-100 text-orange-700 border-orange-200', description: 'Creación de folios, guías de carga y envíos.' },
    COBRANZA: { label: 'Cobranza / Caja', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: 'Registro de abonos de sucursales y estados de cuenta.' },
    AUDITOR: { label: 'Auditor Externo', color: 'bg-gray-100 text-gray-700 border-gray-200', description: 'Solo lectura de reportes y auditoría.' }
};

export const PersonnelDashboard: React.FC<PersonnelDashboardProps> = ({ users, onAddUser, onDeleteUser, onUpdateUser, storeName = 'PAGOMATIC' }) => {
    const { confirm } = useNotifications();
    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({ roles: ['DESPACHOS'] });

    const handleOpenAdd = () => {
        setFormData({ roles: ['DESPACHOS'], name: '', username: '' });
        setModalMode('add');
    };

    const handleOpenEdit = (user: User) => {
        setFormData({ ...user });
        setEditingUserId(user.id);
        setModalMode('edit');
    };

    const toggleRole = (role: UserRole) => {
        const currentRoles = formData.roles || [];
        if (currentRoles.includes(role)) {
            // No permitir quitar el último rol
            if (currentRoles.length > 1) {
                setFormData({ ...formData, roles: currentRoles.filter(r => r !== role) });
            }
        } else {
            setFormData({ ...formData, roles: [...currentRoles, role] });
        }
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.username || !formData.roles?.length) return;

        if (modalMode === 'add') {
            onAddUser(formData);
        } else if (modalMode === 'edit' && editingUserId) {
            onUpdateUser(editingUserId, formData);
        }
        setModalMode(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 mb-1 uppercase tracking-tighter">PAGOMATIC Equipo</h2>
                    <p className="text-brand-primary font-black text-[10px] uppercase tracking-[0.3em] mb-2 bg-brand-primary/5 inline-block px-3 py-1 rounded-full">@{storeName}</p>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest block">Gestión de Acceso y Roles del Sistema</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl"
                >
                    Nuevo Integrante
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.id} className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
                                <UsersIcon className="w-8 h-8 text-gray-400 group-hover:text-brand-primary" />
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                {user.roles.map(role => (
                                    <span key={role} className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border-2 ${ROLE_CONFIG[role].color}`}>
                                        {ROLE_CONFIG[role].label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-gray-900 uppercase truncate">{user.name}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">@{user.username}</p>

                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6 min-h-[60px]">
                            <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase">
                                Permisos: {user.roles.map(r => ROLE_CONFIG[r].label).join(' + ')}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleOpenEdit(user)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Editar
                            </button>
                            <button
                                onClick={async () => {
                                    if (await confirm({
                                        title: 'ELIMINAR ACCESO',
                                        message: `¿ESTÁ SEGURO? Se eliminará el acceso de "${user.name}".`,
                                        confirmText: 'SÍ, ELIMINAR',
                                        cancelText: 'CANCELAR'
                                    })) onDeleteUser(user.id);
                                }}
                                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase transition-all"
                            >
                                Borrar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {modalMode && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-gray-900 text-white flex justify-between items-center">
                            <h4 className="text-2xl font-black uppercase tracking-tighter">
                                {modalMode === 'add' ? 'Dar de Alta Personal' : 'Modificar Perfil'}
                            </h4>
                            <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-white transition-colors">
                                <XIcon className="w-8 h-8" />
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nombre Completo</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-primary rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                                        placeholder="Ej: Juan Pérez"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Usuario (System Tag)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-primary rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                                        placeholder="ej: jperez"
                                        value={formData.username || ''}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Roles y Permisos (Multiselección)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => (
                                            <button
                                                key={role}
                                                onClick={() => toggleRole(role)}
                                                className={`p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${formData.roles?.includes(role)
                                                    ? 'border-brand-primary bg-blue-50 text-brand-primary'
                                                    : 'border-gray-100 bg-gray-50 text-gray-400'
                                                    }`}
                                            >
                                                <span className="text-[10px] font-black uppercase">{ROLE_CONFIG[role].label}</span>
                                                {formData.roles?.includes(role) && <CheckCircleIcon className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Clave de Acceso (Opcional)</label>
                                    <input
                                        type="password"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-primary rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                                        placeholder="Min. 3 dígitos"
                                        value={formData.password || ''}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSubmit}
                                className="w-full bg-brand-primary text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all"
                            >
                                {modalMode === 'add' ? 'Crear Acceso de Personal' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
