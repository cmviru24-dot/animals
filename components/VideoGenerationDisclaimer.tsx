import React from 'react';
import { AlertCircle } from 'lucide-react';

interface VideoGenerationDisclaimerProps {
  onSelectApiKey: () => void;
}

const VideoGenerationDisclaimer: React.FC<VideoGenerationDisclaimerProps> = ({ onSelectApiKey }) => {
  return (
    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex flex-col md:flex-row items-center gap-4 text-yellow-300 text-sm animate-in fade-in duration-300">
      <AlertCircle className="w-6 h-6 shrink-0" />
      <div className="flex-1 text-center md:text-left">
        <p className="font-semibold mb-1">Heads Up: Video Generation Requires Billing!</p>
        <p>
          Creating AI-generated videos uses advanced models that require a Google Cloud Project with{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-200 hover:underline font-medium"
          >
            billing enabled
          </a>
          . Please ensure your selected API key supports this.
        </p>
      </div>
      <button
        onClick={onSelectApiKey}
        className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-full text-white text-sm font-medium shrink-0 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
      >
        Select API Key
      </button>
    </div>
  );
};

export default VideoGenerationDisclaimer;
