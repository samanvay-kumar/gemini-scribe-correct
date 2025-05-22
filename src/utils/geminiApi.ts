
// API key for Gemini
const API_KEY = "AIzaSyCGBv8SEPld2kU_C5zshIg64wkusSJkaxA";

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
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + API_KEY,
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
                  You are a grammar and spelling correction assistant.
                  Analyze the following text and respond with a JSON object containing:
                  1. correctedText: The full text with all errors fixed
                  2. corrections: An array of objects with these properties:
                     - original: The incorrect word or phrase
                     - suggestion: The corrected word or phrase
                     - startIndex: The character index where the error starts
                     - endIndex: The character index where the error ends
                     - explanation: A brief explanation of the error
                  
                  Only include actual mistakes, not stylistic suggestions.
                  Return ONLY the JSON object, no additional text.
                  
                  Text to analyze: "${text}"
                  `,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

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
        return {
          originalText: text,
          correctedText: text,
          corrections: []
        };
      }
      
      // Parse the JSON
      const correctionData = JSON.parse(jsonMatch[0]);
      console.log("Extracted corrections:", correctionData.corrections?.length || 0);
      
      return {
        originalText: text,
        correctedText: correctionData.correctedText || text,
        corrections: correctionData.corrections || []
      };
    } catch (parseError) {
      console.error("Error parsing correction data:", parseError);
      return {
        originalText: text,
        correctedText: text,
        corrections: []
      };
    }
  } catch (error) {
    console.error("Error getting corrections:", error);
    return {
      originalText: text,
      correctedText: text,
      corrections: []
    };
  }
}
