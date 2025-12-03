import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fetchAnimalData, generateAnimalVideo, generateComparisonSummary } from './services/geminiService';
import { AnimalData, AiComparisonSummaryResponse } from './types'; // Added AiComparisonSummaryResponse
import SearchBar from './components/SearchBar';
import RadarStats from './components/RadarStats';
import DetailCard from './components/DetailCard';
import Chatbot from './components/Chatbot';
import VideoGenerationDisclaimer from './components/VideoGenerationDisclaimer'; // New import
import { Sparkles, X, Swords, AlertCircle, Image as ImageIcon, MessageSquare, Video, Loader2, Badge, Globe, Info } from 'lucide-react'; // Added Globe and Info for new features

// Define global types for window properties and Web Speech API interfaces.
// This ensures TypeScript recognizes these browser APIs and custom global objects.
declare global {
  interface Window {
    // The `aistudio` property is assumed to be pre-configured and globally typed by the environment.
    // Explicitly defining `aistudio` here causes "subsequent property declarations" errors.
    // Removed the explicit declaration of `aistudio` to resolve the error.

    // FIX: Correctly declare SpeechRecognition and webkitSpeechRecognition constructors on Window
    // Add SpeechRecognition and webkitSpeechRecognition to the Window interface.
    SpeechRecognition: {
      prototype: SpeechRecognition;
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      prototype: SpeechRecognition;
      new(): SpeechRecognition;
    };
  }

  // Declare SpeechRecognition class. This is usually provided by 'dom.speech' lib.
  // Since we can't modify tsconfig, we declare it here.
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  // Declare SpeechRecognitionEvent interface and its related types.
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  // Declare SpeechRecognitionErrorEvent interface.
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
  }

  type SpeechRecognitionErrorCode =
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported";
}

const App: React.FC = () => {
  const [primaryAnimal, setPrimaryAnimal] = useState<AnimalData | null>(null);
  const [comparisonAnimal, setComparisonAnimal] = useState<AnimalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'explore' | 'compare'>('explore');
  const [showChatbot, setShowChatbot] = useState(false);
  
  // Video generation states
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showVideoApiKeyPrompt, setShowVideoApiKeyPrompt] = useState(false);

  // Voice search states
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [voiceSearchError, setVoiceSearchError] = useState<string | null>(null);
  // Using a ref to hold the latest voiceSearchText to avoid stale closures in onend
  const latestVoiceSearchText = useRef('');
  // Using the global SpeechRecognition type which is now declared
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Comparison Summary States
  const [comparisonSummaryData, setComparisonSummaryData] = useState<AiComparisonSummaryResponse | null>(null);
  const [isComparisonSummaryLoading, setIsComparisonSummaryLoading] = useState(false);
  const [comparisonSummaryError, setComparisonSummaryError] = useState<string | null>(null);

  // Update ref when voiceSearchText changes
  useEffect(() => {
    latestVoiceSearchText.current = voiceSearchText;
  }, [voiceSearchText]);

  // Effect to generate comparison summary
  useEffect(() => {
    const fetchComparisonSummary = async () => {
      if (mode === 'compare' && primaryAnimal && comparisonAnimal) {
        setIsComparisonSummaryLoading(true);
        setComparisonSummaryError(null);
        try {
          const summary = await generateComparisonSummary(primaryAnimal, comparisonAnimal);
          setComparisonSummaryData(summary);
        } catch (err: any) {
          console.error("Error generating comparison summary:", err);
          setComparisonSummaryError("Failed to generate comparison summary. Please try again.");
        } finally {
          setIsComparisonSummaryLoading(false);
        }
      } else {
        // Clear summary data if conditions for comparison are not met
        setComparisonSummaryData(null);
        setIsComparisonSummaryLoading(false);
        setComparisonSummaryError(null);
      }
    };
    fetchComparisonSummary();
  }, [mode, primaryAnimal, comparisonAnimal]); // Dependencies for the useEffect


  const handleSearch = useCallback(async (term: string) => {
    setIsLoading(true);
    setError(null);
    setVideoUrl(null); // Clear video when new animal is searched
    setVideoError(null);
    setShowVideoApiKeyPrompt(false); // Hide prompt for new search
    setVoiceSearchError(null); // Clear voice search error on new search

    try {
      const data = await fetchAnimalData(term);
      if (mode === 'explore') {
        setPrimaryAnimal(data);
        setComparisonAnimal(null); // Reset comparison if in single mode
      } else {
        if (!primaryAnimal) {
            setPrimaryAnimal(data);
        } else {
            setComparisonAnimal(data);
        }
      }
    } catch (err: any) {
      // Specific error from insect check
      if (typeof err.message === 'string' && err.message.includes("WildInfo focuses on larger animals.")) {
        setError(err.message);
      } else if (typeof err.message === 'string' && err.message.includes("Rpc failed due to xhr error.")) {
        setError("Network or API service issue. Please check your internet connection and try again later.");
      } else {
        setError("Could not find that animal or an error occurred. Try something common like 'Lion' or 'Peregrine Falcon'.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [mode, primaryAnimal]);

  const toggleVoiceSearch = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceSearchError("Voice search is not supported in your browser.");
      return;
    }

    // Now correctly typed as global SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Only get one result per recognition instance
      recognitionRef.current.interimResults = true; // Show interim results
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsVoiceListening(true);
        setVoiceSearchError(null);
        setVoiceSearchText('');
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setVoiceSearchText(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsVoiceListening(false);
        // Use the ref to get the latest voiceSearchText
        if (latestVoiceSearchText.current.trim()) {
          handleSearch(latestVoiceSearchText.current.trim());
        }
        setVoiceSearchText(''); // Clear after search or if empty
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsVoiceListening(false);
        console.error("Speech recognition error:", event.error, event.message);
        let errorMessage = "An unexpected error occurred during voice search. Please try again.";

        if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please ensure your microphone is working and speak clearly.";
        } 
        else if (event.error === 'not-allowed') {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings to use voice search.";
        } else if (event.error === 'network') {
          errorMessage = "Voice search failed due to a network error. Please check your internet connection.";
        } else if (event.error === 'service-not-allowed') {
          errorMessage = "Voice search service is unavailable. Please try again later or check your browser settings.";
        } else if (event.error === 'audio-capture') {
          errorMessage = "Failed to capture audio from your microphone. Please ensure it's connected and working.";
        } else if (event.error === 'aborted') {
          errorMessage = "Voice search was interrupted. Please try again.";
        } else if (event.error === 'bad-grammar') {
          errorMessage = "Could not process your speech due to an issue. Please try speaking more clearly.";
        } else if (event.error === 'language-not-supported') {
            errorMessage = "Voice search language not supported. Ensure your browser's language setting is compatible (e.g., English US).";
        }
        // Fallback for any other unexpected error.
        setVoiceSearchError(errorMessage);
        setVoiceSearchText('');
      };
    }

    if (isVoiceListening) {
      recognitionRef.current.stop();
    } else {
      setVoiceSearchText(''); // Clear previous text before starting
      setVoiceSearchError(null); // Clear previous errors
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        setVoiceSearchError("Could not start voice search. Please ensure no other app is using the microphone.");
        setIsVoiceListening(false);
      }
    }
  }, [isVoiceListening, handleSearch]); // latestVoiceSearchText ref is used inside onend, no need here

  useEffect(() => {
    // Cleanup recognition instance on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!primaryAnimal || isVideoLoading) return; // Prevent multiple clicks

    setIsVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null); // Clear video when new animal is searched
    setShowVideoApiKeyPrompt(false); // Assume key is okay or will be selected, initially
    console.log("handleGenerateVideo: Starting video generation process.");
    console.log(`handleGenerateVideo: API Key before call: ${process.env.API_KEY ? 'Present' : 'Not Present'}`);


    try {
      // We assume window.aistudio is globally available and typed by the environment.
      // If window.aistudio.hasSelectedApiKey is not a function, this might throw.
      const hasKey = (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey ? await (window as any).aistudio.hasSelectedApiKey() : true;
      console.log(`handleGenerateVideo: API key already selected: ${hasKey}`);
      if (!hasKey) {
        console.log("handleGenerateVideo: No API key selected, opening selection dialog.");
        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
        } else {
          console.warn("window.aistudio.openSelectKey is not available. Cannot open key selection dialog.");
          setVideoError("API key selection tool is not available. Please ensure your environment is configured correctly.");
          setShowVideoApiKeyPrompt(false);
          setIsVideoLoading(false);
          return;
        }
        // IMPORTANT: DO NOT return here. Assume user selected a key and proceed.
        // The actual API call below will confirm if the key is valid.
        console.log("handleGenerateVideo: API key selection dialog opened (and presumed closed by user). Proceeding with video generation attempt.");
      }

      // Now attempt to generate the video, whether a key was pre-selected or just opened
      const url = await generateAnimalVideo(primaryAnimal.name);
      setVideoUrl(url);
      console.log("handleGenerateVideo: Video generated successfully.");
    } catch (err: any) {
      console.error("Error generating video:", err);
      let errorMessage = "Failed to generate video. An unknown error occurred.";
      let showKeyPrompt = false;

      if (err instanceof Error) {
        try {
          const errorObj = JSON.parse(err.message);
          if (errorObj.error) {
            const apiError = errorObj.error;
            console.error("API Error details:", apiError);
            switch (apiError.code) {
              case 404: // Not Found (often indicates billing issue for Veo)
                errorMessage = "A valid API key from a paid Google Cloud Project with billing enabled is required for video generation. Please select a key.";
                showKeyPrompt = true;
                break;
              case 400: // Bad Request
                errorMessage = `Failed to generate video: Bad request. Please check your prompt. (Details: ${apiError.message})`;
                break;
              case 403: // Permission Denied
                errorMessage = `Permission denied for video generation. Ensure the Veo API is enabled in your Google Cloud Project. (Details: ${apiError.message})`;
                break;
              case 429: // Quota Exceeded
                errorMessage = "Video generation quota exceeded. Please try again later or check your Google Cloud billing.";
                break;
              case 500: // Internal Server Error
              case 503: // Service Unavailable
                errorMessage = "Video generation service is temporarily unavailable. Please try again later.";
                break;
              default:
                errorMessage = `Video generation failed with API error: ${apiError.message || `Code ${apiError.code}`}.`;
            }
          } else {
            errorMessage = `Video generation failed: ${err.message}`;
          }
        } catch (jsonParseError) {
          // Fallback if error message is not JSON
          errorMessage = `Video generation failed: ${err.message}`;
        }
      }

      setVideoError(errorMessage);
      setShowVideoApiKeyPrompt(showKeyPrompt);
      console.log("handleGenerateVideo: Video generation process failed.");
    } finally {
      setIsVideoLoading(false);
      console.log("handleGenerateVideo: Video generation process finished.");
    }
  }, [primaryAnimal, isVideoLoading]); // Added isVideoLoading to dependencies to prevent multiple calls

  const reset = () => {
    setPrimaryAnimal(null);
    setComparisonAnimal(null);
    setMode('explore');
    setError(null);
    setVideoUrl(null);
    setIsVideoLoading(false);
    setVideoError(null);
    setShowVideoApiKeyPrompt(false);
    // Reset voice search states
    if (recognitionRef.current && isVoiceListening) {
      recognitionRef.current.stop();
    }
    setIsVoiceListening(false);
    setVoiceSearchText('');
    setVoiceSearchError(null);
    // Reset comparison summary states
    setComparisonSummaryData(null);
    setIsComparisonSummaryLoading(false);
    setComparisonSummaryError(null);
  };

  const toggleMode = () => {
      const newMode = mode === 'explore' ? 'compare' : 'explore';
      setMode(newMode);
      if (newMode === 'explore') {
          setComparisonAnimal(null);
      }
      // Reset video related states when changing mode
      setVideoUrl(null);
      setIsVideoLoading(false);
      setVideoError(null);
      setShowVideoApiKeyPrompt(false);
      // Reset comparison summary states when mode changes
      setComparisonSummaryData(null);
      setIsComparisonSummaryLoading(false);
      setComparisonSummaryError(null);
  };

  const toggleChatbot = () => {
    setShowChatbot(prev => !prev);
  };

  // Helper for suggested animal icons
  const getSuggestedAnimalIcon = (animalName: string) => {
    switch (animalName) {
      case 'Snow Leopard': return <Sparkles className="w-5 h-5 text-sky-400" />;
      case 'Blue Whale': return <Sparkles className="w-5 h-5 text-blue-400" />;
      case 'Komodo Dragon': return <Sparkles className="w-5 h-5 text-lime-400" />;
      case 'Honey Badger': return <Badge className="w-5 h-5 text-amber-400" />; // Using Badge icon
      default: return <Sparkles className="w-5 h-5 text-slate-400" />;
    }
  };


  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={reset}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">WildInfo</h1>
          </div>
          
          {primaryAnimal && (
             <button 
                onClick={toggleMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                    ${mode === 'compare' 
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
             >
                <Swords className="w-4 h-4" />
                {mode === 'compare' ? 'Comparison Mode Active' : 'Enable Compare'}
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Welcome / Search State */}
        {!primaryAnimal && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Discover the Wild
              </h2>
              <p className="text-slate-400 text-lg md:text-xl">
                Intelligent profiles, RPG-style stats, and species comparisons powered by Gemini AI.
              </p>
            </div>
            <div className="w-full">
              <SearchBar 
                onSearch={handleSearch} 
                isLoading={isLoading} 
                isVoiceListening={isVoiceListening}
                voiceSearchText={voiceSearchText}
                onToggleVoiceSearch={toggleVoiceSearch}
              />
               {voiceSearchError && (
                    <p className="max-w-md mx-auto mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                      {voiceSearchError}
                    </p>
                )}
            </div>
            
            {/* Suggested Animals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-2xl mx-auto">
                {['Snow Leopard', 'Blue Whale', 'Komodo Dragon', 'Honey Badger'].map(animal => (
                    <button 
                        key={animal}
                        onClick={() => handleSearch(animal)}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-750 text-slate-300 hover:text-emerald-400 text-sm transition-all shadow-md group"
                    >
                        {getSuggestedAnimalIcon(animal)}
                        <span className="mt-2 font-medium group-hover:text-emerald-300">{animal}</span>
                    </button>
                ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !primaryAnimal && (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-400 animate-pulse">Scanning nature database and generating visuals...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
            <div className={`max-w-md mx-auto mt-10 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-center`}>
                <AlertCircle className="w-5 h-5 shrink-0 mx-auto" />
                <p className="text-sm">{error}</p>
            </div>
        )}

        {/* Comparison Logic: If compare mode is on and we need a second animal */}
        {mode === 'compare' && primaryAnimal && !comparisonAnimal && !isLoading && (
             <div className="max-w-2xl mx-auto mt-8 p-8 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700 text-center space-y-6">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Swords className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Choose Challenger</h3>
                    <p className="text-slate-400">Search for a second animal to compare stats with {primaryAnimal.name}.</p>
                </div>
                <SearchBar 
                    onSearch={handleSearch} 
                    isLoading={isLoading} 
                    placeholder="Enter second animal..." 
                    isVoiceListening={isVoiceListening}
                    voiceSearchText={voiceSearchText}
                    onToggleVoiceSearch={toggleVoiceSearch}
                />
                {voiceSearchError && (
                    <p className="max-w-md mx-auto mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                      {voiceSearchError}
                    </p>
                )}
             </div>
        )}

        {/* Display Data */}
        {primaryAnimal && (
          <div className="mt-8 space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            
            {/* Animal Header(s) */}
            <div className={`grid gap-6 ${comparisonAnimal ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Primary Animal Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8">
                   <div 
                        className="absolute top-0 right-0 w-32 h-32 bg-current opacity-10 blur-3xl rounded-full translate-x-10 -translate-y-10"
                        style={{ color: primaryAnimal.colors.primary }}
                   />
                   <div className="relative z-10">
                        {primaryAnimal.imageUrl ? (
                            <img 
                                src={primaryAnimal.imageUrl} 
                                alt={primaryAnimal.name} 
                                className="w-full h-48 object-cover rounded-lg mb-4 border border-slate-700" 
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-48 bg-slate-700 rounded-lg mb-4 flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-12 h-12" />
                            </div>
                        )}
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-2 bg-black/30 text-slate-300 border border-white/10">
                            {primaryAnimal.classification}
                        </span>
                        <h2 className="text-4xl font-black mb-1 text-white">{primaryAnimal.name}</h2>
                        <p className="text-slate-400 italic mb-4 font-serif text-lg">{primaryAnimal.scientificName}</p>
                        <p className="text-slate-300 leading-relaxed">{primaryAnimal.summary}</p>

                        {/* Video generation button */}
                        {!comparisonAnimal && ( // Only show in explore mode
                            <div className="mt-6 space-y-4">
                                {/* Proactive billing disclaimer */}
                                {!videoUrl && !isVideoLoading && !videoError && (
                                  <VideoGenerationDisclaimer onSelectApiKey={async () => {
                                    console.log("VideoGenerationDisclaimer: Select API Key clicked.");
                                    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
                                      await (window as any).aistudio.openSelectKey();
                                    } else {
                                      console.warn("window.aistudio.openSelectKey is not available.");
                                    }
                                    console.log("VideoGenerationDisclaimer: API key selection dialog opened.");
                                  }} />
                                )}

                                {isVideoLoading ? (
                                    <div className="flex items-center justify-center gap-2 text-emerald-400 animate-pulse bg-slate-700/50 p-3 rounded-full">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Generating video (this may take a few minutes)...</span>
                                    </div>
                                ) : videoError ? (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col md:flex-row items-center gap-3 text-red-400 text-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p className="flex-1 text-center md:text-left">{videoError}</p>
                                        {showVideoApiKeyPrompt && (
                                            <button 
                                                onClick={async () => {
                                                  console.log("Error prompt: Select API Key clicked.");
                                                  if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
                                                    await (window as any).aistudio.openSelectKey();
                                                  } else {
                                                    console.warn("window.aistudio.openSelectKey is not available.");
                                                  }
                                                  console.log("Error prompt: API key selection dialog opened.");
                                                }}
                                                className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-full text-white text-sm font-medium transition-colors shadow-md"
                                            >
                                                Select API Key
                                            </button>
                                        )}
                                    </div>
                                ) : videoUrl ? (
                                    <button 
                                        onClick={() => setVideoUrl(null)} // Option to clear video if needed
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white text-sm font-medium transition-colors"
                                    >
                                        <X className="w-4 h-4" /> Hide Video
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleGenerateVideo} 
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-full shadow-lg hover:shadow-emerald-500/30 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
                                        disabled={isLoading}
                                    >
                                        <Video className="w-5 h-5" /> Generate Video
                                    </button>
                                )}
                            </div>
                        )}
                   </div>
                </div>

                {/* Comparison Animal Header */}
                {comparisonAnimal && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8">
                        <button 
                            onClick={() => {
                                setComparisonAnimal(null);
                                setComparisonSummaryData(null); // Clear summary when comparison animal is removed
                                setComparisonSummaryError(null);
                            }}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                        <div 
                            className="absolute top-0 right-0 w-32 h-32 bg-current opacity-10 blur-3xl rounded-full translate-x-10 -translate-y-10"
                            style={{ color: comparisonAnimal.colors.primary }}
                        />
                        <div className="relative z-10">
                            {comparisonAnimal.imageUrl ? (
                                <img 
                                    src={comparisonAnimal.imageUrl} 
                                    alt={comparisonAnimal.name} 
                                    className="w-full h-48 object-cover rounded-lg mb-4 border border-slate-700" 
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-48 bg-slate-700 rounded-lg mb-4 flex items-center justify-center text-slate-400">
                                    <ImageIcon className="w-12 h-12" />
                                    </div>
                            )}
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-2 bg-black/30 text-slate-300 border border-white/10">
                                {comparisonAnimal.classification}
                            </span>
                            <h2 className="text-4xl font-black mb-1 text-white">{comparisonAnimal.name}</h2>
                            <p className="text-slate-400 italic mb-4 font-serif text-lg">{comparisonAnimal.scientificName}</p>
                            <p className="text-slate-300 leading-relaxed">{comparisonAnimal.summary}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Player */}
            {videoUrl && !comparisonAnimal && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-700 animate-in fade-in zoom-in duration-500">
                    <video controls src={videoUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    <div className="absolute top-4 left-4 bg-slate-900/70 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <Video className="w-4 h-4 text-emerald-400" />
                        AI Generated Video
                    </div>
                </div>
            )}

            {/* Stats Chart & Basic Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <DetailCard 
                        title="Habitat" 
                        content={primaryAnimal.habitat} 
                        type="habitat"
                        color={primaryAnimal.colors.primary}
                    />
                    <DetailCard 
                        title="Diet" 
                        content={primaryAnimal.diet} 
                        type="diet"
                        color={primaryAnimal.colors.secondary}
                    />
                     <DetailCard 
                        title="Conservation Status" 
                        content={primaryAnimal.conservationStatus} 
                        type="status" 
                        color={primaryAnimal.colors.primary} 
                    />
                </div>

                <div className="lg:col-span-1">
                     {/* The Chart */}
                    <RadarStats animal1={primaryAnimal} animal2={comparisonAnimal} />
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {comparisonAnimal ? (
                        <>
                            <DetailCard 
                                title="Habitat" 
                                content={comparisonAnimal.habitat} 
                                type="habitat"
                                color={comparisonAnimal.colors.primary}
                            />
                            <DetailCard 
                                title="Diet" 
                                content={comparisonAnimal.diet} 
                                type="diet"
                                color={comparisonAnimal.colors.secondary}
                            />
                            <DetailCard 
                                title="Conservation Status" 
                                content={comparisonAnimal.conservationStatus} 
                                type="status" 
                                color={comparisonAnimal.colors.primary} 
                            />
                        </>
                    ) : (
                        <>
                            <DetailCard 
                                title="Geographical Distribution" 
                                content={primaryAnimal.distribution} 
                                type="distribution" 
                                color={primaryAnimal.colors.primary} 
                            />
                            <DetailCard 
                                title="Did You Know?" 
                                content={primaryAnimal.funFacts} 
                                type="facts" 
                                color={primaryAnimal.colors.secondary} 
                            />
                        </>
                    )}
                </div>
            </div>
            
            {/* Fun Facts if comparison is active */}
            {comparisonAnimal && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailCard 
                        title={`${primaryAnimal.name} Fun Facts`} 
                        content={primaryAnimal.funFacts} 
                        type="facts"
                        color={primaryAnimal.colors.primary}
                    />
                     <DetailCard 
                        title={`${comparisonAnimal.name} Fun Facts`} 
                        content={comparisonAnimal.funFacts} 
                        type="facts"
                        color={primaryAnimal.colors.primary}
                    />
                 </div>
            )}

            {/* AI Comparison Summary */}
            {comparisonAnimal && (
                 <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <h3 className="text-3xl font-bold text-white text-center">AI Comparison Summary</h3>
                    {isComparisonSummaryLoading ? (
                        <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col items-center justify-center min-h-[150px]">
                            <span className="typing-indicator my-4">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                            <p className="text-slate-400">Generating comparison summary...</p>
                        </div>
                    ) : comparisonSummaryError ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="flex-1">{comparisonSummaryError}</p>
                        </div>
                    ) : comparisonSummaryData && (
                        <div className="bg-slate-800/80 p-6 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10 space-y-4">
                            <p className="text-slate-300 leading-relaxed text-lg">{comparisonSummaryData.comparisonSummary}</p>
                            <div className="flex items-center gap-2 text-xl font-bold">
                                {comparisonSummaryData.winner === 'It\'s a tie' ? (
                                    <Swords className="w-6 h-6 text-purple-400" />
                                ) : comparisonSummaryData.winner.includes('Depends on context') ? (
                                    <Info className="w-6 h-6 text-blue-400" />
                                ) : (
                                    <Sparkles className="w-6 h-6 text-emerald-400" />
                                )}
                                <p className="text-white">Winner: {comparisonSummaryData.winner}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Geographical Distribution Section */}
                    {comparisonAnimal && (
                        <div className="mt-8">
                             <h3 className="text-2xl font-bold text-white mb-6 text-center">Geographical Distribution</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DetailCard
                                    title={`${primaryAnimal.name} Distribution`}
                                    content={primaryAnimal.distribution}
                                    type="distribution"
                                    color={primaryAnimal.colors.primary}
                                />
                                <DetailCard
                                    title={`${comparisonAnimal.name} Distribution`}
                                    content={comparisonAnimal.distribution}
                                    type="distribution"
                                    color={comparisonAnimal.colors.primary}
                                />
                             </div>
                        </div>
                    )}

                    {/* Button to compare a new animal */}
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={() => {
                                setComparisonAnimal(null);
                                setComparisonSummaryData(null);
                                setComparisonSummaryError(null);
                            }}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-lg hover:shadow-blue-500/30 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                        >
                            Compare New Animal
                        </button>
                    </div>
                </div>
            )}
          </div>
        )}
      </main>

      {/* Chatbot Component */}
      <Chatbot isVisible={showChatbot} onClose={toggleChatbot} />
    </div>
  );
};

export default App;