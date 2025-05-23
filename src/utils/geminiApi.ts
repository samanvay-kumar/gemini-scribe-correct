
// API key for Gemini
const API_KEY = "AIzaSyDp2Fr5-ythR2t8GaVDxFgVzgAgL7JBilc";

interface CorrectionResult {
  originalText: string;
  correctedText: string;
  corrections: Correction[];
}

interface Correction {
  original: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
  explanation?: string;
}

/**
 * Splits long text into smaller chunks for processing
 */
function chunkText(text: string, maxChunkSize: number = 4000): string[] {
  if (text.length <= maxChunkSize) return [text];
  
  const chunks: string[] = [];
  let currentChunk = "";
  const paragraphs = text.split(/\n\s*\n/); // Split by empty lines
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds max size and we already have content,
    // save current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      // Add paragraph separator if not the first paragraph in the chunk
      if (currentChunk.length > 0) currentChunk += "\n\n";
      currentChunk += paragraph;
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Get grammar and spelling corrections using the Gemini API
 */
export async function getCorrections(text: string): Promise<CorrectionResult> {
  try {
    console.log(`Analyzing text of length: ${text.length} characters`);
    
    // For very long texts, split into chunks and process separately
    if (text.length > 4000) {
      const chunks = chunkText(text);
      console.log(`Text split into ${chunks.length} chunks for processing`);
      
      let allCorrections: Correction[] = [];
      let correctedFullText = text;
      let offsetIndex = 0;
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i+1}/${chunks.length}, length: ${chunk.length}`);
        
        // Get corrections for this chunk
        const chunkResult = await processTextChunk(chunk);
        
        // Adjust indices to account for position in the full text
        const adjustedCorrections = chunkResult.corrections.map(correction => ({
          ...correction,
          startIndex: correction.startIndex + offsetIndex,
          endIndex: correction.endIndex + offsetIndex
        }));
        
        allCorrections = [...allCorrections, ...adjustedCorrections];
        
        // Apply corrections to the full text
        if (chunkResult.correctedText !== chunk) {
          correctedFullText = 
            correctedFullText.substring(0, offsetIndex) + 
            chunkResult.correctedText + 
            correctedFullText.substring(offsetIndex + chunk.length);
        }
        
        offsetIndex += chunk.length;
      }
      
      return {
        originalText: text,
        correctedText: correctedFullText,
        corrections: allCorrections
      };
    } else {
      // For shorter texts, process normally
      return await processTextChunk(text);
    }
  } catch (error) {
    console.error("Error getting corrections:", error);
    throw error;
  }
}

/**
 * Process a single chunk of text with the Gemini API
 */
async function processTextChunk(text: string): Promise<CorrectionResult> {
  console.log("Sending text to Gemini API for analysis:", text.substring(0, 50) + "...");
  
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
                You are a highly accurate grammar and spelling correction assistant.
                Analyze the following text very carefully and respond with a JSON object containing:
                1. correctedText: The full text with all errors fixed
                2. corrections: An array of objects with these properties:
                   - original: The incorrect word or phrase (exactly as it appears in the text)
                   - suggestion: The corrected word or phrase
                   - startIndex: The character index where the error starts (must be precise)
                   - endIndex: The character index where the error ends (must be precise)
                   - explanation: A brief explanation of the error

                Be extremely thorough and examine:
                - Spelling errors
                - Grammar mistakes
                - Punctuation errors
                - Word usage errors
                - Sentence structure issues
                - Paragraph coherence
                - Capitalization errors
                - Missing or redundant words
                
                Ensure your indices are perfectly accurate by double-checking them.
                Return ONLY the JSON object, no additional text or explanations.
                
                Text to analyze: "${text.replace(/"/g, '\\"')}"
                `,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  // Handle rate limiting explicitly
  if (response.status === 429) {
    console.error("Gemini API rate limit exceeded");
    throw new Error("API rate limit exceeded. Please try again later.");
  }

  if (!response.ok) {
    console.error("API Error:", response.status);
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Received response from Gemini API");
  
  try {
    // Extract the JSON string from the response
    const textContent = data.candidates[0].content.parts[0].text;
    
    // Find JSON object in text (in case AI adds explanatory text)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("No JSON found in response:", textContent);
      throw new Error("Invalid response format from Gemini API");
    }
    
    // Parse the JSON
    const correctionData = JSON.parse(jsonMatch[0]);
    console.log("Extracted corrections:", correctionData.corrections?.length || 0);
    
    // Verify all corrections have valid indices
    const validatedCorrections = (correctionData.corrections || []).filter(correction => {
      return (
        typeof correction.startIndex === 'number' && 
        typeof correction.endIndex === 'number' &&
        correction.startIndex >= 0 && 
        correction.endIndex <= text.length &&
        correction.startIndex < correction.endIndex
      );
    });
    
    if (validatedCorrections.length === 0 && text.length > 30) {
      // Enhanced fallback checks for obvious errors if API returns no corrections
      const manualCorrections = performManualChecks(text);
      if (manualCorrections.length > 0) {
        return {
          originalText: text,
          correctedText: applyManualCorrections(text, manualCorrections),
          corrections: manualCorrections
        };
      }
    }
    
    return {
      originalText: text,
      correctedText: correctionData.correctedText || text,
      corrections: validatedCorrections
    };
  } catch (parseError) {
    console.error("Error parsing correction data:", parseError);
    throw new Error("Failed to parse API response");
  }
}

/**
 * Perform basic checks for common errors
 */
function performManualChecks(text: string): Correction[] {
  const manualCorrections: Correction[] = [];
  
  // Common spelling/grammar errors
  const commonErrors = [
    { pattern: /\bteh\b/gi, replacement: "the", explanation: "Corrected spelling of 'the'" },
    { pattern: /\s{2,}/g, replacement: " ", explanation: "Removed extra spaces" },
    { pattern: /\bdefinately\b/gi, replacement: "definitely", explanation: "Corrected spelling of 'definitely'" },
    { pattern: /\balot\b/gi, replacement: "a lot", explanation: "Corrected 'alot' to 'a lot'" },
    { pattern: /\bure\b/gi, replacement: "your", explanation: "Corrected 'ure' to 'your'" },
    { pattern: /\bur\b/gi, replacement: "your", explanation: "Corrected 'ur' to 'your'" },
    { pattern: /\bu r\b/gi, replacement: "you are", explanation: "Corrected 'u r' to 'you are'" },
    { pattern: /\bcant\b/gi, replacement: "can't", explanation: "Added missing apostrophe" },
    { pattern: /\bdont\b/gi, replacement: "don't", explanation: "Added missing apostrophe" },
    { pattern: /\bwont\b/gi, replacement: "won't", explanation: "Added missing apostrophe" },
    { pattern: /\bim\b/gi, replacement: "I'm", explanation: "Corrected to proper contraction form" },
    { pattern: /\bu\b/g, replacement: "you", explanation: "Expanded abbreviation to formal word" },
    { pattern: /\bthx\b/gi, replacement: "thanks", explanation: "Expanded abbreviation" },
    { pattern: /\r\n|\r|\n{3,}/g, replacement: "\n\n", explanation: "Standardized paragraph breaks" },
    { pattern: /([.!?])\s*([a-z])/g, replacement: "$1 $2", explanation: "Fixed capitalization after sentence end" },
  ];
  
  commonErrors.forEach(({ pattern, replacement, explanation }) => {
    let match;
    // Reset the lastIndex property to ensure we search from the beginning
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      manualCorrections.push({
        original: match[0],
        suggestion: typeof replacement === 'string' 
          ? replacement 
          : text.substring(match.index, match.index + match[0].length).replace(pattern, replacement),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        explanation
      });
      
      // Reset lastIndex to avoid infinite loops on global patterns
      pattern.lastIndex = match.index + 1;
    }
  });
  
  return manualCorrections;
}

/**
 * Apply manual corrections to text
 */
function applyManualCorrections(text: string, corrections: Correction[]): string {
  let result = text;
  
  // Sort corrections in reverse order to not affect indices
  const sortedCorrections = [...corrections].sort((a, b) => b.startIndex - a.startIndex);
  
  sortedCorrections.forEach(correction => {
    result = 
      result.substring(0, correction.startIndex) + 
      correction.suggestion + 
      result.substring(correction.endIndex);
  });
  
  return result;
}
