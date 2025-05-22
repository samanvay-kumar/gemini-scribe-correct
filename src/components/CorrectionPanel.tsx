
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpellCheck } from "lucide-react";

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
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SpellCheck className="h-5 w-5" />
            Analyzing text...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (corrections.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SpellCheck className="h-5 w-5" />
            Corrections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            No corrections needed. Your text looks good!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <SpellCheck className="h-5 w-5" />
            Corrections ({corrections.length})
          </CardTitle>
          {corrections.length > 1 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onApplyAll}
            >
              Apply All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto">
        <div className="space-y-4">
          {corrections.map((correction, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
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
                  onClick={() => onApplyCorrection(correction)}
                >
                  Apply
                </Button>
              </div>
              {correction.explanation && (
                <p className="text-sm text-muted-foreground">
                  {correction.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CorrectionPanel;
