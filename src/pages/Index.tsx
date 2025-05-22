
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import TextEditor from "@/components/TextEditor";
import CorrectionPanel from "@/components/CorrectionPanel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCorrections } from "@/utils/geminiApi";

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
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Function to analyze text
  const analyzeText = useCallback(async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) {
      setCorrections([]);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await getCorrections(textToAnalyze);
      setCorrections(result.corrections);
      setCorrectedText(result.correctedText);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze text. Please try again.",
        variant: "destructive",
      });
      console.error("Error analyzing text:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Debounce text analysis
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (text.trim().length > 10) {
      const timer = setTimeout(() => {
        analyzeText(text);
      }, 1500);
      setDebounceTimer(timer);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [text, analyzeText, debounceTimer]);

  // Handle applying a single correction
  const handleApplyCorrection = (correction: Correction) => {
    const { startIndex, endIndex, suggestion } = correction;
    const newText =
      text.substring(0, startIndex) + suggestion + text.substring(endIndex);
    setText(newText);
    
    // Remove the applied correction
    setCorrections(corrections.filter(c => 
      c.startIndex !== startIndex || c.endIndex !== endIndex
    ));
    
    toast({
      title: "Correction Applied",
      description: `Changed "${correction.original}" to "${correction.suggestion}"`,
    });
  };

  // Handle applying all corrections
  const handleApplyAll = () => {
    setText(correctedText);
    setCorrections([]);
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

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Improve Your Writing with AI
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Write or paste your text below and get instant grammar and spelling corrections
              powered by Gemini AI.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Your Text</h2>
                  <Button 
                    onClick={handleCheckText}
                    disabled={isAnalyzing || !text.trim()}
                  >
                    Check Text
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
                  *Click on highlighted text to see correction options
                </div>
              </div>
            </div>
            <div>
              <CorrectionPanel 
                corrections={corrections}
                onApplyCorrection={handleApplyCorrection}
                onApplyAll={handleApplyAll}
                isAnalyzing={isAnalyzing}
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
