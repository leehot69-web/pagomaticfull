import {
    LogoIcon,
    ActivityIcon,
    StoreIcon,
    UsersIcon,
    SearchIcon,
    DollarSignIcon,
    ClockIcon
} from './IconComponents';
import type { User, UserRole } from '../types';
import { MENU_ITEMS, View } from '../constants';

interface SidebarProps {
    activeView: string;
    onNavigate: (view: View) => void;
    currentUser: User;
    collapsed: boolean;
}

const BoxIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const ChartBarIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

const iconMap: Record<string, React.ReactNode> = {
    'quick-access': <BoltIcon className="w-5 h-5 text-emerald-400" />,
    'dashboard': <ActivityIcon className="w-5 h-5" />,
    'inventory': <BoxIcon className="w-5 h-5" />,
    'stores': <StoreIcon className="w-5 h-5" />,
    'suppliers': <DollarSignIcon className="w-5 h-5" />,
    'reports': <ChartBarIcon className="w-5 h-5" />,
    'personnel': <UsersIcon className="w-5 h-5" />,
    'security': <ClockIcon className="w-5 h-5" />,
};

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, currentUser, collapsed }) => {
    const filteredMenu = MENU_ITEMS.filter(item => item.roles.some(r => currentUser.roles.includes(r)));

    return (
        <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-[#222d32] h-screen transition-all duration-300 flex flex-col no-print shrink-0 border-r border-black/10 shadow-xl`}>
            {/* Logo Section */}
            <div className={`h-14 flex items-center ${collapsed ? 'justify-center' : 'px-4'} bg-[#367fa9] text-white shadow-md overflow-hidden whitespace-nowrap`}>
                <LogoIcon className="w-8 h-8 shrink-0 fill-white" />
                {!collapsed && (
                    <span className="ml-3 text-xl font-bold tracking-tight uppercase">PAGO<span className="font-light text-white/80">MATIC</span></span>
                )}
            </div>

            {/* Logo de Cliente (Pocho Burger) */}
            <div className={`px-4 py-3 flex flex-col items-center bg-[#222d32] border-b border-black/20`}>
                <div className={`
                    bg-black rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border-2 border-white/10
                    ${collapsed ? 'w-12 h-12' : 'w-full h-20'}
                    transition-all duration-300
                `}>
                    <img
                        src="https://i.imgur.com/St8h53p.png"
                        alt="Logo Cliente"
                        className="w-full h-full object-contain p-2 hover:scale-110 transition-transform"
                    />
                </div>
                {!collapsed && (
                    <p className="mt-2 text-[10px] font-black text-white/60 uppercase tracking-[0.2em] text-center">POCHO Casa Matriz</p>
                )}
            </div>

            {/* User Profile */}
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : ''} bg-[#222d32]`}>
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white shrink-0 shadow-lg border-2 border-gray-500 overflow-hidden">
                    {currentUser.name[0]}
                </div>
                {!collapsed && (
                    <div className="ml-3 overflow-hidden">
                        <p className="text-white text-xs font-bold truncate uppercase tracking-tight">{currentUser.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-[10px] text-gray-400 capitalize">Online</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Search Box */}
            {!collapsed && (
                <div className="px-4 py-2">
                    <div className="flex bg-[#374850] rounded-sm items-center px-3 py-1.5 border border-transparent focus-within:border-gray-500 transition-all">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="bg-transparent border-none text-xs text-gray-300 w-full outline-none"
                        />
                        <SearchIcon className="w-3 h-3 text-gray-400" />
                    </div>
                </div>
            )}

            {/* Menu Label */}
            {!collapsed && (
                <div className="px-4 py-3 bg-[#1a2226]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Navegación Principal</span>
                </div>
            )}

            {/* Navigation Items */}
            <nav className="flex-1 mt-2">
                {filteredMenu.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => onNavigate(item.view)}
                            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-3 transition-colors relative group
                                ${isActive ? 'bg-[#1e282c] text-white border-l-4 border-[#3c8dbc]' : 'text-[#b8c7ce] hover:bg-[#1e282c] hover:text-white border-l-4 border-transparent'}`}
                        >
                            <span className={`${isActive ? 'text-white' : 'text-[#b8c7ce] group-hover:text-white'} transition-colors`}>
                                {iconMap[item.view] || <ActivityIcon className="w-5 h-5" />}
                            </span>
                            {!collapsed && (
                                <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden">
                                    {item.label.split('(')[0].trim()}
                                </span>
                            )}
                            {collapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl">
                                    {item.label.split('(')[0].trim()}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / System Status */}
            {!collapsed && (
                <div className="p-4 border-t border-gray-700/30">
                    <div className="bg-[#1e282c] p-3 rounded-lg border border-gray-700/50">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Estado v2.4</p>
                        <div className="flex items-center justify-between text-[9px] text-gray-500">
                            <span>Sincronizado</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};
