import React, { useState, useEffect } from 'react';
import { Search, Loader2, Mic, MicOff } from 'lucide-react';

interface SearchBarProps {
  onSearch: (term: string) => void;
  isLoading: boolean;
  placeholder?: string;
  isVoiceListening?: boolean;
  voiceSearchText?: string;
  onToggleVoiceSearch?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading, 
  placeholder = "Enter an animal...",
  isVoiceListening = false,
  voiceSearchText = '',
  onToggleVoiceSearch,
}) => {
  const [term, setTerm] = useState('');

  // Update internal term state when voiceSearchText changes (for display in input)
  useEffect(() => {
    if (isVoiceListening && voiceSearchText) {
      setTerm(voiceSearchText);
    } else if (!isVoiceListening && term === voiceSearchText) {
        // If voice search stopped and current term matches final voice text, clear it
        setTerm('');
    }
  }, [isVoiceListening, voiceSearchText]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.trim()) {
      onSearch(term);
      setTerm('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md mx-auto">
      <input
        type="text"
        value={isVoiceListening ? voiceSearchText : term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={isVoiceListening ? "Listening..." : placeholder}
        disabled={isLoading || isVoiceListening}
        className={`w-full px-6 py-4 pl-12 rounded-full bg-slate-800 text-white placeholder-slate-400 border border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-lg
        ${isVoiceListening ? 'ring-2 ring-blue-500/30 border-blue-500' : ''}`}
      />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        ) : (
          <Search className="w-5 h-5" />
        )}
      </div>
      
      {onToggleVoiceSearch && (
        <button
          type="button"
          onClick={onToggleVoiceSearch}
          disabled={isLoading}
          aria-label={isVoiceListening ? "Stop voice search" : "Start voice search"}
          className={`absolute right-20 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors 
            ${isVoiceListening 
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isVoiceListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      )}

      <button 
        type="submit"
        disabled={(!term.trim() && !voiceSearchText.trim()) || isLoading || isVoiceListening}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Explore
      </button>
    </form>
  );
};

export default SearchBar;