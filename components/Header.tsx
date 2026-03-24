import React from 'react';
import { LogoIcon } from './IconComponents';
import type { User, UserRole } from '../types';
import { MENU_ITEMS } from '../constants';

interface NavLinkProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ children, onClick, active = false }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${active
      ? 'text-white bg-white/20 shadow-inner'
      : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
  >
    {children}
  </button>
)

interface HeaderProps {
  onLogout: () => void;
  onToggleSidebar: () => void;
  currentUser: User;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, onToggleSidebar, currentUser }) => {
  return (
    <header className="bg-[#0D254C] h-14 sticky top-0 z-[100] border-b border-black/10 no-print flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        {/* Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="w-14 h-14 flex items-center justify-center text-white hover:bg-[#F97316] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden lg:block">
          <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 px-4 py-1.5 rounded-sm border border-white/10 ml-4">
            Terminal de Control Operativo <span className="text-[#F97316]">v2.4</span>
          </span>
        </div>
      </div>

      <div className="flex items-center h-full">
        {/* User Menu */}
        <div className="flex items-center h-full px-6 hover:bg-white/5 transition-colors cursor-pointer group border-l border-white/5">
          <div className="w-8 h-8 rounded-sm bg-[#F97316] flex items-center justify-center text-white font-black text-xs border border-white/20 group-hover:scale-105 transition-transform">
            {currentUser.name[0]}
          </div>
          <span className="hidden sm:block ml-3 text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{currentUser.name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-14 h-14 flex items-center justify-center text-white hover:bg-red-600 transition-colors border-l border-white/5"
          title="Salir"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};