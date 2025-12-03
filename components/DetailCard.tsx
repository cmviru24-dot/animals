import React from 'react';
import { MapPin, Utensils, Info, Globe, ShieldAlert } from 'lucide-react'; // Added ShieldAlert icon

interface DetailCardProps {
  title: string;
  content: string | string[];
  type: 'habitat' | 'diet' | 'facts' | 'distribution' | 'status'; // Added 'status' type
  color: string;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, content, type, color }) => {
  const getIcon = () => {
    switch (type) {
      case 'habitat': return <MapPin className="w-5 h-5" />;
      case 'diet': return <Utensils className="w-5 h-5" />;
      case 'facts': return <Info className="w-5 h-5" />;
      case 'distribution': return <Globe className="w-5 h-5" />;
      case 'status': return <ShieldAlert className="w-5 h-5" />; // New case for status
    }
  };

  const formatDistributionItem = (item: string) => {
    // Expects string like "India (~3,000)" and converts to "India: ~3,000"
    // Regex matches: (Everything before space+parenthesis) then (content inside parenthesis)
    const match = item.match(/^(.*)\s\((.*)\)$/);
    if (match) {
      return (
        <span>
          <span className="font-semibold text-slate-200">{match[1]}:</span>{' '}
          <span className="text-emerald-400">{match[2]}</span>
        </span>
      );
    }
    return item;
  };

  return (
    <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors shadow-sm hover:scale-[1.005] hover:shadow-lg duration-300">
      <div className="flex items-center gap-2 mb-3 font-semibold" style={{ color }}>
        {getIcon()}
        <h3>{title}</h3>
      </div>
      {Array.isArray(content) ? (
        <ul className="space-y-2">
          {type === 'distribution' && content.length > 0 && (
            <p className="text-slate-400 text-sm mb-2 font-medium">
              Found in {content.length} region(s):
            </p>
          )}
          {content.map((item, i) => (
            <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
              {type === 'distribution' ? (
                <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" style={{ color }} />
              ) : (
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-slate-500" />
              )}
              <span className="flex-1">
                {type === 'distribution' ? formatDistributionItem(item) : item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-300 text-sm leading-relaxed">{content}</p>
      )}
    </div>
  );
};

export default DetailCard;