import React from 'react';
import { MonthlyDataPoint } from '../types';

interface BarChartProps {
    historicalData: MonthlyDataPoint[];
    projectedData: MonthlyDataPoint[];
    label: string;
    isCurrency?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ historicalData, projectedData, label, isCurrency = false }) => {
    const allData = [...historicalData, ...projectedData];
    const maxValue = Math.max(...allData.map(d => d.value), 1); // Avoid division by zero
    const width = 500;
    const height = 200;
    const barWidth = width / allData.length;

    const formatValue = (value: number) => {
        if (isCurrency) {
            return `$${(value / 100).toFixed(2)}`;
        }
        return Math.round(value).toLocaleString();
    };

    return (
        <div className="w-full text-xs text-gray-400">
            <svg viewBox={`0 0 ${width} ${height + 30}`} className="w-full">
                {/* Y-axis labels */}
                <text x="0" y="10" fill="currentColor" fontSize="10">{formatValue(maxValue)}</text>
                <text x="0" y={height / 2 + 5} fill="currentColor" fontSize="10">{formatValue(maxValue / 2)}</text>
                <line x1="30" y1="0" x2="30" y2={height} stroke="#4B5563" strokeWidth="1" />
                <line x1="30" y1={height} x2={width} y2={height} stroke="#4B5563" strokeWidth="1" />

                {allData.map((item, index) => {
                    const isHistorical = index < historicalData.length;
                    const barHeight = (item.value / maxValue) * height;
                    const x = index * barWidth + 30; // +30 to offset for Y-axis labels
                    const y = height - barHeight;

                    return (
                        <g key={item.month}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth - 5}
                                height={barHeight}
                                fill={isHistorical ? '#DC2626' : '#9CA3AF'}
                                opacity={isHistorical ? 1 : 0.5}
                            />
                            <text
                                x={x + (barWidth - 5) / 2}
                                y={height + 15}
                                textAnchor="middle"
                                fill="currentColor"
                                fontSize="9"
                                transform={`rotate(-45, ${x + (barWidth - 5) / 2}, ${height + 15})`}
                            >
                                {item.month}
                            </text>
                        </g>
                    );
                })}
            </svg>
             <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                    <span>Historical</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gray-400/50 rounded-sm"></div>
                    <span>Projected</span>
                </div>
            </div>
        </div>
    );
};

export default BarChart;