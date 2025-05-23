
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import TextEditor from "@/components/TextEditor";
import CorrectionPanel from "@/components/CorrectionPanel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCorrections } from "@/utils/geminiApi";
import { Sparkles, SpellCheck } from "lucide-react";

interface Correction {
  original: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
  explanation?: string;
}

const Index = () => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctedText, setCorrectedText] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastAnalyzedText, setLastAnalyzedText] = useState<string>("");
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Function to analyze text
  const analyzeText = useCallback(async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) {
      setCorrections([]);
      setApiError(null);
      setAnalysisComplete(false);
      return;
    }

    // Don't re-analyze the same text
    if (textToAnalyze === lastAnalyzedText && corrections.length > 0) {
      return;
    }

    setIsAnalyzing(true);
    setApiError(null);
    setLastAnalyzedText(textToAnalyze);
    setAnalysisComplete(false);
    
    try {
      const result = await getCorrections(textToAnalyze);
      setCorrections(result.corrections);
      setCorrectedText(result.correctedText);
      
      // Analysis is complete
      setAnalysisComplete(true);
      
      if (result.corrections.length > 0) {
        toast({
          title: `Found ${result.corrections.length} corrections`,
          description: "Click on highlighted text or use the panel to apply corrections.",
        });
      } else {
        toast({
          title: "No corrections needed",
          description: "Your text looks good!",
          variant: "default",  // Changed from "success" to "default" to fix the type error
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze text";
      setApiError(errorMessage);
      setAnalysisComplete(false);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error analyzing text:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast, corrections.length, lastAnalyzedText]);

  // Handle applying a single correction
  const handleApplyCorrection = (correction: Correction) => {
    const { startIndex, endIndex, suggestion } = correction;
    const newText =
      text.substring(0, startIndex) + suggestion + text.substring(endIndex);
    setText(newText);
    
    // Remove the applied correction and update remaining corrections indices
    const updatedCorrections = corrections
      .filter(c => c.startIndex !== startIndex || c.endIndex !== endIndex)
      .map(c => {
        // If the correction is after the applied one, adjust indices
        if (c.startIndex > endIndex) {
          const lengthDiff = suggestion.length - (endIndex - startIndex);
          return {
            ...c,
            startIndex: c.startIndex + lengthDiff,
            endIndex: c.endIndex + lengthDiff
          };
        }
        return c;
      });
    
    setCorrections(updatedCorrections);
    
    // Update the lastAnalyzedText to avoid unnecessary re-analysis
    setLastAnalyzedText(newText);
    
    toast({
      title: "Correction Applied",
      description: `Changed "${correction.original}" to "${correction.suggestion}"`,
    });
  };

  // Handle applying all corrections
  const handleApplyAll = () => {
    setText(correctedText);
    setCorrections([]);
    setLastAnalyzedText(correctedText);
    
    toast({
      title: "Applied All Corrections",
      description: `${corrections.length} corrections applied.`,
    });
  };

  // Handle correction click in the editor
  const handleCorrectionClick = (correction: Correction) => {
    // Show toast with correction details
    toast({
      title: "Suggestion",
      description: (
        <div className="space-y-2">
          <p>
            <span className="text-red-500 line-through mr-1">
              {correction.original}
            </span>
            →
            <span className="text-green-600 ml-1">
              {correction.suggestion}
            </span>
          </p>
          {correction.explanation && (
            <p className="text-sm">{correction.explanation}</p>
          )}
          <Button
            size="sm"
            onClick={() => handleApplyCorrection(correction)}
          >
            Apply
          </Button>
        </div>
      ),
    });
  };

  // Manual check button handler
  const handleCheckText = () => {
    if (!text.trim()) {
      toast({
        title: "Empty Text",
        description: "Please enter some text to check.",
      });
      return;
    }
    analyzeText(text);
  };

  // Auto check when text changes with debounce only if analysis isn't complete yet
  useEffect(() => {
    // Skip auto-check if we've already analyzed this text or the analysis is complete
    if (text === lastAnalyzedText || analysisComplete) return;
    
    const timer = setTimeout(() => {
      if (text.trim() && text.length > 20 && !isAnalyzing && text !== lastAnalyzedText) {
        analyzeText(text);
      }
    }, 1500); // Wait 1.5 seconds after typing stops to analyze
    
    return () => clearTimeout(timer);
  }, [text, isAnalyzing, analyzeText, lastAnalyzedText, analysisComplete]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
              <SpellCheck className="h-8 w-8 text-primary" />
              Grammar Correction with Gemini AI
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Write or paste your text below and get instant grammar and spelling corrections
              powered by Gemini AI.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Text</h2>
                <Button 
                  onClick={handleCheckText}
                  disabled={isAnalyzing || !text.trim()}
                  className="gap-1"
                >
                  <Sparkles className="h-4 w-4" /> Check Text
                </Button>
              </div>
              <TextEditor 
                value={text}
                onChange={setText}
                corrections={corrections}
                onCorrectionClick={handleCorrectionClick}
                isAnalyzing={isAnalyzing}
              />
              <div className="text-xs text-muted-foreground">
                *Click on highlighted text to see correction options or use the panel on the right
              </div>
            </div>
            <div>
              <CorrectionPanel 
                corrections={corrections}
                onApplyCorrection={handleApplyCorrection}
                onApplyAll={handleApplyAll}
                isAnalyzing={isAnalyzing}
                apiError={apiError}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
