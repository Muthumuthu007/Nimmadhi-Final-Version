import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-semibold">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-xs sm:text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-indigo-100 rounded-full">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
        </div>
      </div>
    </div>
  );
};