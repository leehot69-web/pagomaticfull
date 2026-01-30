import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ActivityIcon, XIcon } from './components/IconComponents';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

interface PromptOptions {
    title?: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    inputType?: string;
}

interface NotificationContextType {
    notify: (message: string, type?: NotificationType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions, resolve: (val: boolean) => void } | null>(null);
    const [promptState, setPromptState] = useState<{ options: PromptOptions, resolve: (val: string | null) => void } | null>(null);
    const [promptValue, setPromptValue] = useState('');

    const notify = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({ options, resolve });
        });
    }, []);

    const prompt = useCallback((options: PromptOptions) => {
        return new Promise<string | null>((resolve) => {
            setPromptValue(options.initialValue || '');
            setPromptState({ options, resolve });
        });
    }, []);

    const handleConfirmResult = (result: boolean) => {
        if (confirmState) {
            confirmState.resolve(result);
            setConfirmState(null);
        }
    };

    const handlePromptSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (promptState) {
            promptState.resolve(promptValue);
            setPromptState(null);
            setPromptValue('');
        }
    };

    const handlePromptCancel = () => {
        if (promptState) {
            promptState.resolve(null);
            setPromptState(null);
            setPromptValue('');
        }
    };

    return (
        <NotificationContext.Provider value={{ notify, confirm, prompt }}>
            {children}

            {/* Toast Overlay */}
            <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-4">
                {notifications.map(n => (
                    <div
                        key={n.id}
                        className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border-4 animate-in slide-in-from-right-10 duration-300 ${n.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' :
                            n.type === 'error' ? 'bg-red-600 border-red-500 text-white' :
                                n.type === 'warning' ? 'bg-orange-500 border-orange-400 text-white' :
                                    'bg-blue-600 border-blue-500 text-white'
                            }`}
                    >
                        <div className="bg-white/20 p-2 rounded-xl">
                            <ActivityIcon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">{n.message}</p>
                    </div>
                ))}
            </div>

            {/* Custom Confirm Dialog */}
            {confirmState && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-gray-900 text-white flex items-center justify-between">
                            <h4 className="text-xl font-black uppercase tracking-tighter">{confirmState.options.title || 'Confirmar Acción'}</h4>
                            <button onClick={() => handleConfirmResult(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-gray-600 font-bold uppercase text-[10px] tracking-widest mb-8 leading-relaxed">
                                {confirmState.options.message}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleConfirmResult(false)}
                                    className="flex-1 py-4 border-2 border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    {confirmState.options.cancelText || 'Cancelar'}
                                </button>
                                <button
                                    onClick={() => handleConfirmResult(true)}
                                    className="flex-grow py-4 bg-brand-primary text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    {confirmState.options.confirmText || 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Prompt Dialog */}
            {promptState && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-brand-primary text-white flex items-center justify-between">
                            <h4 className="text-xl font-black uppercase tracking-tighter">{promptState.options.title || 'Entrada Requerida'}</h4>
                            <button onClick={handlePromptCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handlePromptSubmit} className="p-8">
                            <p className="text-gray-600 font-bold uppercase text-[10px] tracking-widest mb-4 leading-relaxed">
                                {promptState.options.message}
                            </p>
                            <input
                                autoFocus
                                type={promptState.options.inputType || 'text'}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-sm outline-none focus:border-brand-primary transition-all mb-8 uppercase"
                                placeholder={promptState.options.placeholder}
                                value={promptValue}
                                onChange={e => setPromptValue(e.target.value)}
                            />
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={handlePromptCancel}
                                    className="flex-1 py-4 border-2 border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    {promptState.options.cancelText || 'Cancelar'}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-grow py-4 bg-gray-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    {promptState.options.confirmText || 'Aceptar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};
