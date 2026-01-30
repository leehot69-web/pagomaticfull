import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PaymentBreakdownItem } from '../types';

interface BarChartComponentProps {
  data: PaymentBreakdownItem[];
}

export const BarChartComponent: React.FC<BarChartComponentProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 5,
          left: 20,
          bottom: 5,
        }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
        <YAxis type="category" dataKey="name" stroke="#94a3b8" width={100} tick={{ fontSize: 10, fill: '#334155' }} />
        <Tooltip
          cursor={{ fill: 'rgba(56, 189, 248, 0.1)' }}
          contentStyle={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            color: '#1e293b',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
          formatter={(value: number) => `$${value.toFixed(2)}`}
        />
        <Bar dataKey="amount" fill="#38bdf8" name="Amount" barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
};