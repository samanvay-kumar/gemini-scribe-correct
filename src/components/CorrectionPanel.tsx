
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, SpellCheck, RefreshCcw } from "lucide-react";

interface CorrectionPanelProps {
  corrections: {
    original: string;
    suggestion: string;
    startIndex: number;
    endIndex: number;
    explanation?: string;
  }[];
  onApplyCorrection: (correction: {
    original: string;
    suggestion: string;
    startIndex: number;
    endIndex: number;
    explanation?: string;
  }) => void;
  onApplyAll: () => void;
  isAnalyzing: boolean;
}

const CorrectionPanel = ({
  corrections,
  onApplyCorrection,
  onApplyAll,
  isAnalyzing,
}: CorrectionPanelProps) => {
  if (isAnalyzing) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 animate-spin" />
            Analyzing text...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 gap-2">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">
              Gemini AI is analyzing your text for corrections
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (corrections.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            No Corrections Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            Your text looks good! No grammar or spelling errors found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <SpellCheck className="h-5 w-5 text-amber-500" />
            Corrections ({corrections.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto py-4">
        <div className="space-y-4">
          {corrections.map((correction, index) => (
            <div key={index} className="border rounded-lg p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <span className="text-red-500 line-through mr-2">
                    {correction.original}
                  </span>
                  <span className="text-green-600 font-medium">
                    {correction.suggestion}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:bg-green-50 hover:text-green-700 hover:border-green-300 flex gap-1"
                  onClick={() => onApplyCorrection(correction)}
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Apply
                </Button>
              </div>
              {correction.explanation && (
                <p className="text-sm text-muted-foreground mt-1 border-t pt-1">
                  {correction.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      {corrections.length > 1 && (
        <CardFooter className="border-t pt-4">
          <Button 
            variant="default"
            className="w-full"
            onClick={onApplyAll}
          >
            Apply All Corrections
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default CorrectionPanel;
