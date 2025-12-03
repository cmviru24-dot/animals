import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { AnimalData, AiComparisonSummaryResponse } from "../types";

// We use Flash for fast JSON generation for text and flash-image for actual image generation
const TEXT_MODEL_NAME = "gemini-2.5-flash";
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image"; // Reintroduced: Using AI for image generation
const CHAT_MODEL_NAME = "gemini-2.5-flash"; // Model for the chatbot
const VIDEO_MODEL_NAME = "veo-3.1-fast-generate-preview"; // Model for video generation

// Removed: fetchRealisticImage function and Unsplash integration.


export const fetchAnimalData = async (animalName: string): Promise<AnimalData> => {
  // Always create a new instance to ensure the latest API key is used, especially after openSelectKey()
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Fetch Textual Data
  const textPrompt = `Generate a detailed profile for the animal: "${animalName}". 
  Provide realistic RPG-style stats (0-100 scale) for Speed, Strength, Intelligence, Stealth, Defense, Endurance, Adaptability, and Lifespan relative to the animal kingdom.
  Pick a primary and secondary hex color that represents the animal.
  Include its scientific classification (phylum and class). **Ensure to use the standard scientific Latin names for Phylum and Class (e.g., use 'Insecta' instead of 'Insect', 'Arthropoda' instead of 'Arthropod').**
  Provide its IUCN conservation status (e.g., Extinct, Critically Endangered, Endangered, Vulnerable, Near Threatened, Least Concern).
  Provide a list of 3-5 major countries or continents where the animal is most present. IMPORTANT: For each location, include an estimated population count in parentheses if available (e.g., "India (~3,000)", "Africa (~20,000)").`;

  const textResponse = await ai.models.generateContent({
    model: TEXT_MODEL_NAME,
    contents: textPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          classification: { type: Type.STRING, description: "e.g., Mammal, Reptile" },
          phylum: { type: Type.STRING, description: "e.g., Chordata, Arthropoda" },
          class: { type: Type.STRING, description: "e.g., Mammalia, Insecta" },
          conservationStatus: { type: Type.STRING, description: "IUCN Red List status (e.g. Endangered, Least Concern)" },
          summary: { type: Type.STRING, description: "A 2-3 sentence engaging summary." },
          habitat: { type: Type.STRING },
          diet: { type: Type.STRING },
          funFacts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3 unique and interesting facts."
          },
          stats: {
            type: Type.OBJECT,
            properties: {
              speed: { type: Type.NUMBER },
              strength: { type: Type.NUMBER },
              intelligence: { type: Type.NUMBER },
              stealth: { type: Type.NUMBER },
              defense: { type: Type.NUMBER },
              endurance: { type: Type.NUMBER }, // New stat
              adaptability: { type: Type.NUMBER }, // New stat
              lifespan: { type: Type.NUMBER }, // New stat
              reach: { type: Type.NUMBER }, // Added reach to schema
            },
            required: ["speed", "strength", "intelligence", "stealth", "defense", "endurance", "adaptability", "lifespan", "reach"], // Marked all as required
          },
          colors: {
            type: Type.OBJECT,
            properties: {
              primary: { type: Type.STRING, description: "Hex color code" },
              secondary: { type: Type.STRING, description: "Hex color code" },
            },
            required: ["primary", "secondary"],
          },
          distribution: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-5 major countries/regions with estimated population in parentheses (e.g. 'India (~600)')."
          }
        },
        required: ["name", "scientificName", "summary", "stats", "funFacts", "colors", "classification", "phylum", "class", "conservationStatus", "habitat", "diet", "distribution"],
      },
    },
  });

  const text = textResponse.text;
  if (!text) throw new Error("No textual data returned from Gemini");
  const animalProfile: AnimalData = JSON.parse(text) as AnimalData;

  // Calculate 'reach' from distribution length
  animalProfile.stats.reach = animalProfile.distribution.length;

  // --- Deterministic Insect Filtering ---
  // List of Latin scientific names to exclude
  const invertebrateLatinTerms = [
    'arthropoda', 'insecta', 'arachnida', 'crustacea', 'myriapoda',
    'mollusca', 'annelida', 'cnidaria', 'echinodermata', 'porifera',
    'platyhelminthes', 'nematoda'
  ];

  // List of common English keywords to exclude to be safe
  const invertebrateCommonKeywords = [
    'insect', 'arthropod', 'arachnid', 'crustacean', 'myriapod',
    'mollusc', 'mollusk', 'annelid', 'worm', 'cnidarian', 'jellyfish', 
    'echinoderm', 'starfish', 'sponge', 'nematode', 'bug', 'centipede', 'millipede'
  ];

  const lowerPhylum = animalProfile.phylum.toLowerCase();
  const lowerClass = animalProfile.class.toLowerCase();
  const lowerClassification = animalProfile.classification.toLowerCase();

  // Check if any restricted term matches or is included in the returned data
  const isLatinExcluded = invertebrateLatinTerms.some(term => 
    lowerPhylum.includes(term) || lowerClass.includes(term)
  );

  const isKeywordExcluded = invertebrateCommonKeywords.some(keyword => 
    lowerPhylum.includes(keyword) || 
    lowerClass.includes(keyword) || 
    lowerClassification.includes(keyword)
  );

  if (isLatinExcluded || isKeywordExcluded) {
    throw new Error(
      `WildInfo focuses on larger animals. We currently do not provide detailed information for small invertebrates like '${animalName}'. Please search for a different type of animal.`
    );
  }
  // --- End Deterministic Insect Filtering ---

  // 2. Generate AI Image
  let imageUrl: string | undefined;
  try {
    const imagePrompt = `A high-quality realistic image of a ${animalName} in its natural habitat.`;
    const imageResponse = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: imagePrompt }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" } // Removed imageSize as it causes errors with flash-image model
      }
    });

    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data && part.inlineData.mimeType) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break; // Found the image, no need to check other parts
      }
    }
  } catch (imageError) {
    console.error("Error generating AI image:", imageError);
    // If image generation fails, imageUrl remains undefined, and UI will show placeholder
  }
  
  return { ...animalProfile, imageUrl };
};

export const generateAnimalVideo = async (animalName: string): Promise<string> => {
  // Always create a new instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const videoPrompt = `A high-quality video of a ${animalName} in its natural habitat, showing its typical behavior.`;
  console.log(`generateAnimalVideo: API Key used for new GoogleGenAI instance: ${process.env.API_KEY ? 'Present' : 'Not Present'}`);


  let operation = await ai.models.generateVideos({
    model: VIDEO_MODEL_NAME,
    prompt: videoPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
    const operationResponse = await ai.operations.getVideosOperation({ operation: operation });
    if (!operationResponse) {
       // Handle case where operation response is null/undefined during polling
       console.warn("Polling video operation returned null response.");
       continue;
    }
    operation = operationResponse;
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("No video download link found.");
  }

  // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
  // We'll create a blob URL to display it.
  if (!process.env.API_KEY) {
      throw new Error("API Key is missing when attempting to fetch video.");
  }
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`);
  }
  const videoBlob = await response.blob();
  return URL.createObjectURL(videoBlob);
};

export const generateComparisonSummary = async (animal1: AnimalData, animal2: AnimalData): Promise<AiComparisonSummaryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Compare ${animal1.name} and ${animal2.name}. 
  Highlight their key differences and potential strengths based on the following information:

  ${animal1.name}:
  - Summary: ${animal1.summary}
  - Classification: ${animal1.classification} (Status: ${animal1.conservationStatus})
  - Habitat: ${animal1.habitat}
  - Diet: ${animal1.diet}
  - Stats: Speed=${animal1.stats.speed}, Strength=${animal1.stats.strength}, Intelligence=${animal1.stats.intelligence}, Stealth=${animal1.stats.stealth}, Defense=${animal1.stats.defense}, Endurance=${animal1.stats.endurance}, Adaptability=${animal1.stats.adaptability}, Lifespan=${animal1.stats.lifespan}
  - Fun Facts: ${animal1.funFacts.join(', ')}
  - Distribution: ${animal1.distribution.join(', ')}

  ${animal2.name}:
  - Summary: ${animal2.summary}
  - Classification: ${animal2.classification} (Status: ${animal2.conservationStatus})
  - Habitat: ${animal2.habitat}
  - Diet: ${animal2.diet}
  - Stats: Speed=${animal2.stats.speed}, Strength=${animal2.stats.strength}, Intelligence=${animal2.stats.intelligence}, Stealth=${animal2.stats.stealth}, Defense=${animal2.stats.defense}, Endurance=${animal2.stats.endurance}, Adaptability=${animal2.stats.adaptability}, Lifespan=${animal2.stats.lifespan}
  - Fun Facts: ${animal2.funFacts.join(', ')}
  - Distribution: ${animal2.distribution.join(', ')}

  Provide a concise comparison summary (3-5 sentences). Focus specifically on physical differences, temperament, and survival strategies. Avoid generic statements. 
  Also indicate which animal might have an advantage in a general sense, or if it's a tie, or if it depends on context. Respond in JSON format.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          comparisonSummary: { type: Type.STRING, description: "A concise summary highlighting key differences and strengths." },
          winner: { 
            type: Type.STRING, 
            description: `Indicate the animal with an advantage (e.g., "${animal1.name}", "${animal2.name}", "It's a tie", "Depends on context").` 
          },
        },
        required: ["comparisonSummary", "winner"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No comparison summary returned from Gemini.");
  }

  try {
    return JSON.parse(text) as AiComparisonSummaryResponse;
  } catch (e) {
    console.error("Failed to parse comparison summary JSON:", e);
    throw new Error("Failed to parse comparison summary from AI. Please try again.");
  }
};


// Chatbot specific functions
let chatSession: Chat | null = null; // Store the chat session globally or pass it around

export const createChatSession = async (): Promise<Chat> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chatSession = ai.chats.create({
    model: CHAT_MODEL_NAME,
    config: {
      systemInstruction: "You are a helpful and knowledgeable assistant for WildInfo, an app about animals. You can answer questions about animals and provide interesting facts. Keep your answers concise and engaging.",
    },
  });
  return chatSession;
};

export const sendMessageToChat = async (message: string): Promise<AsyncIterable<GenerateContentResponse>> => {
  if (!chatSession) {
    // This should ideally not happen if createChatSession is called first
    console.warn("Chat session not initialized. Creating a new one.");
    await createChatSession();
  }
  return chatSession!.sendMessageStream({ message });
};