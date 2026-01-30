import React from 'react';

interface CardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-md flex items-center space-x-4">
      <div className="p-2 rounded-lg">
        {icon}
      </div>
      <div>
        <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</h3>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
};