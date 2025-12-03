import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { AnimalData } from '../types';

interface RadarStatsProps {
  animal1: AnimalData;
  animal2?: AnimalData | null;
}

const RadarStats: React.FC<RadarStatsProps> = ({ animal1, animal2 }) => {
  const data = [
    { subject: 'Speed', A: animal1.stats.speed, B: animal2?.stats.speed || 0, fullMark: 100 },
    { subject: 'Strength', A: animal1.stats.strength, B: animal2?.stats.strength || 0, fullMark: 100 },
    { subject: 'Intel', A: animal1.stats.intelligence, B: animal2?.stats.intelligence || 0, fullMark: 100 },
    { subject: 'Stealth', A: animal1.stats.stealth, B: animal2?.stats.stealth || 0, fullMark: 100 },
    { subject: 'Defense', A: animal1.stats.defense, B: animal2?.stats.defense || 0, fullMark: 100 },
    { subject: 'Endurance', A: animal1.stats.endurance, B: animal2?.stats.endurance || 0, fullMark: 100 },
    { subject: 'Adapt', A: animal1.stats.adaptability, B: animal2?.stats.adaptability || 0, fullMark: 100 },
    { subject: 'Life', A: animal1.stats.lifespan, B: animal2?.stats.lifespan || 0, fullMark: 100 },
    { 
      subject: 'Reach', 
      A: animal1.stats.reach, 
      B: animal2?.stats.reach || 0, 
      fullMark: 10,
      detailsA: animal1.distribution, // Pass distribution details for Tooltip
      detailsB: animal2?.distribution 
    }, 
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-sm z-50">
          <p className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-semibold text-sm">{entry.name}:</span>
                <span className="text-sm font-bold">{entry.value}</span>
              </div>
              {/* Show distribution details only for Reach stat */}
              {label === 'Reach' && (
                 <div className="ml-4 mt-1 text-xs text-slate-400 space-y-0.5">
                    {entry.dataKey === 'A' && entry.payload.detailsA?.map((d: string, i: number) => (
                        <div key={i}>{d}</div>
                    ))}
                    {entry.dataKey === 'B' && entry.payload.detailsB?.map((d: string, i: number) => (
                        <div key={i}>{d}</div>
                    ))}
                 </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Determine animation timing based on mode
  const isComparison = !!animal2;
  const baseDuration = 600;

  return (
    <div className="w-full h-[300px] md:h-[400px] bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm border border-slate-700 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300">
      <h3 className="text-center text-slate-300 font-semibold mb-2">Attribute Analysis</h3>
      <ResponsiveContainer width="100%" height="90%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid 
            stroke="#475569" 
            isAnimationActive={true} 
            animationDuration={baseDuration} 
            animationBegin={0}
          />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            isAnimationActive={true} 
            animationDuration={baseDuration} 
            animationBegin={isComparison ? 200 : 0}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
            isAnimationActive={true} 
            animationDuration={baseDuration} 
            animationBegin={isComparison ? 300 : 0}
          />
          
          <Radar
            name={animal1.name}
            dataKey="A"
            stroke={animal1.colors.primary}
            fill={animal1.colors.primary}
            fillOpacity={0.5}
            isAnimationActive={true}
            animationDuration={baseDuration}
            animationBegin={isComparison ? 400 : 100} 
          />
          
          {animal2 && (
            <Radar
              name={animal2.name}
              dataKey="B"
              stroke={animal2.colors.primary}
              fill={animal2.colors.primary}
              fillOpacity={0.4}
              isAnimationActive={true}
              animationDuration={baseDuration}
              animationBegin={800} // Significant delay for the "challenger"
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarStats;