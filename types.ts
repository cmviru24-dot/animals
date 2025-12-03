export interface AnimalStats {
  speed: number;
  strength: number;
  intelligence: number;
  stealth: number;
  defense: number;
  endurance: number; // New stat
  adaptability: number; // New stat
  lifespan: number; // New stat (score 0-100)
  reach: number; // Added for geographical distribution count as a stat
}

export interface AnimalData {
  name: string;
  scientificName: string;
  classification: string;
  phylum: string; // Added for deterministic insect filtering
  class: string; // Added for deterministic insect filtering
  conservationStatus: string; // Added for IUCN status
  summary: string;
  habitat: string;
  diet: string;
  funFacts: string[];
  stats: AnimalStats;
  colors: {
    primary: string;
    secondary: string;
  };
  imageUrl?: string;
  videoUrl?: string;
  distribution: string[]; // Added for geographical distribution
}

// New interface for the direct AI response for comparison summary
export interface AiComparisonSummaryResponse {
  comparisonSummary: string;
  winner: string; // The "winner" based on the comparison, or "It's a tie", or "Depends on context"
}

export interface ComparisonData {
  animal1: AnimalData;
  animal2: AnimalData;
  comparisonSummary: string;
  winner: string; // The "winner" of a hypothetical encounter or just better adapted
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}