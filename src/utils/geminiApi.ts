
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
 * Get grammar and spelling corrections using the Gemini API
 */
export async function getCorrections(text: string): Promise<CorrectionResult> {
  try {
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

                  Be extremely thorough. Check for:
                  - Spelling errors
                  - Grammar mistakes
                  - Punctuation errors
                  - Word usage errors
                  - Sentence structure issues
                  
                  Even if the text looks correct, check carefully for subtle errors.
                  Always ensure your startIndex and endIndex values are accurate.
                  Return ONLY the JSON object, no additional text or explanations.
                  
                  Text to analyze: "${text}"
                  `,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
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
      
      if (validatedCorrections.length === 0 && text.length > 10) {
        // Basic check for obvious errors if API returns no corrections
        const commonErrors = [
          { pattern: /teh/g, replacement: "the" },
          { pattern: /\s{2,}/g, replacement: " " },
          { pattern: /[^a-zA-Z0-9\s.,?!'"();\-:\[\]]/g, replacement: "" },
          { pattern: /definately/g, replacement: "definitely" },
          { pattern: /alot/g, replacement: "a lot" },
          { pattern: /ure/g, replacement: "your" },
          { pattern: /ur/g, replacement: "your" },
          { pattern: /u/g, replacement: "you" },
          { pattern: /cant/g, replacement: "can't" },
          { pattern: /dont/g, replacement: "don't" },
        ];
        
        const manualCorrections: Correction[] = [];
        let modifiedText = text;
        
        commonErrors.forEach(({ pattern, replacement }) => {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            manualCorrections.push({
              original: match[0],
              suggestion: replacement,
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              explanation: `"${match[0]}" is typically spelled as "${replacement}"`
            });
            
            // Reset lastIndex to avoid infinite loops
            pattern.lastIndex = match.index + 1;
          }
        });
        
        if (manualCorrections.length > 0) {
          return {
            originalText: text,
            correctedText: modifiedText,
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
  } catch (error) {
    console.error("Error getting corrections:", error);
    throw error;
  }
}
