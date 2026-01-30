import React from 'react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || "h-10 w-10"} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Fondo Premium */}
    <rect width="100" height="100" rx="24" fill="#0D254C" />

    {/* La P de Pagomatic */}
    <path d="M25 30V70H33V53H45C54 53 58 48 58 41.5C58 35 54 30 45 30H25ZM33 38H44C48 38 50 39.5 50 41.5C50 43.5 48 45 44 45H33V38Z" fill="white" />

    {/* La M Interconectada con Flecha de Crecimiento */}
    <path d="M42 70L58 45L74 70" stroke="#F97316" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M58 45L74 20" stroke="#F97316" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M68 20H74V26" stroke="#F97316" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />

    {/* Punto de Foco */}
    <circle cx="74" cy="20" r="4" fill="#F97316" className="animate-pulse" />
  </svg>
);

export const DollarSignIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || "h-5 w-5 text-gray-400"} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

export const StoreIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || "w-10 h-10"} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Estructura Base del Edificio */}
    <rect x="20" y="45" width="60" height="40" fill="#F8FAFC" />
    <rect x="20" y="80" width="60" height="5" fill="#1E293B" />

    {/* Techo / Cornisa */}
    <rect x="15" y="40" width="70" height="8" rx="2" fill="#334155" />

    {/* Toldo (Awning) - Patrón Rojo y Blanco */}
    <path d="M15 48L12 65H20L23 48H15Z" fill="#EF4444" />
    <path d="M23 48L20 65H28L31 48H23Z" fill="#FFFFFF" />
    <path d="M31 48L28 65H36L39 48H31Z" fill="#EF4444" />
    <path d="M39 48L36 65H44L47 48H39Z" fill="#FFFFFF" />
    <path d="M47 48L44 65H52L55 48H47Z" fill="#EF4444" />
    <path d="M55 48L52 65H60L63 48H55Z" fill="#FFFFFF" />
    <path d="M63 48L60 65H68L71 48H63Z" fill="#EF4444" />
    <path d="M71 48L68 65H76L79 48H71Z" fill="#FFFFFF" />
    <path d="M79 48L76 65H84L88 48H79Z" fill="#EF4444" />

    {/* Ventanas con Reflejos Blue-ish */}
    <rect x="28" y="68" width="18" height="12" fill="#E2E8F0" />
    <rect x="54" y="68" width="18" height="12" fill="#E2E8F0" />
    <path d="M28 68L35 80H28V68Z" fill="#CBD5E1" opacity="0.5" />
    <path d="M54 68L61 80H54V68Z" fill="#CBD5E1" opacity="0.5" />

    {/* Base / Suelo */}
    <rect x="10" y="85" width="80" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const BluetoothIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
  </svg>
);

export const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
