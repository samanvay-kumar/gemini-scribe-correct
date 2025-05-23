
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  corrections: {
    original: string;
    suggestion: string;
    startIndex: number;
    endIndex: number;
    explanation?: string;
  }[];
  onCorrectionClick: (correction: {
    original: string;
    suggestion: string;
    startIndex: number;
    endIndex: number;
    explanation?: string;
  }) => void;
  isAnalyzing: boolean;
}

const TextEditor = ({ 
  value, 
  onChange, 
  corrections, 
  onCorrectionClick,
  isAnalyzing
}: TextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Apply highlights to the text
  useEffect(() => {
    if (!editorRef.current || isAnalyzing) return;
    
    // Create a temporary div to hold the text with highlights
    const tempDiv = document.createElement("div");
    let text = value;
    
    // Sort corrections by start index in descending order to avoid index issues when replacing
    const sortedCorrections = [...corrections].sort((a, b) => b.startIndex - a.startIndex);
    
    // Wrap each error with a span
    sortedCorrections.forEach(correction => {
      const { startIndex, endIndex, original } = correction;
      const before = text.substring(0, startIndex);
      const error = text.substring(startIndex, endIndex);
      const after = text.substring(endIndex);
      
      text = `${before}<span class="highlight-error cursor-pointer underline decoration-wavy decoration-red-500" data-start="${startIndex}" data-end="${endIndex}" title="Click to see correction">${error}</span>${after}`;
    });
    
    // Replace newlines with <br> for proper display of paragraphs
    text = text.replace(/\n/g, '<br>');
    tempDiv.innerHTML = text || "<br>";
    
    // Replace the editor content with the highlighted text
    if (editorRef.current) {
      // Save the current selection
      const selection = window.getSelection();
      let range: Range | null = null;
      let selectionExisted = false;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        selectionExisted = editorRef.current.contains(range.commonAncestorContainer);
      }
      
      // Update the HTML
      editorRef.current.innerHTML = tempDiv.innerHTML;
      
      // Add click event listeners to highlighted spans
      const spans = editorRef.current.querySelectorAll(".highlight-error");
      spans.forEach(span => {
        span.addEventListener("click", () => {
          const start = parseInt(span.getAttribute("data-start") || "0");
          const end = parseInt(span.getAttribute("data-end") || "0");
          
          const clickedCorrection = corrections.find(
            c => c.startIndex === start && c.endIndex === end
          );
          
          if (clickedCorrection) {
            onCorrectionClick(clickedCorrection);
          }
        });
      });
      
      // Restore selection if it existed
      if (selectionExisted && range) {
        try {
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (e) {
          console.log("Could not restore selection");
        }
      }
    }
  }, [value, corrections, isAnalyzing, onCorrectionClick]);
  
  // This is where the fix for reversed text input happens
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    
    // Get the raw input text directly from the contentEditable div
    const content = editorRef.current.innerHTML;
    
    // Create a temporary div to convert HTML to plain text while preserving line breaks
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    
    // Get the plain text with proper line breaks
    const plainText = tempDiv.innerText;
    
    // Update the value through the onChange callback
    onChange(plainText);
  };

  // Update editor content when value prop changes
  useEffect(() => {
    if (!editorRef.current) return;
    if (!corrections.length) {
      // Convert newlines to <br> for proper display
      const htmlContent = value.replace(/\n/g, '<br>');
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [value, corrections.length]);

  return (
    <div className="w-full">
      <div
        ref={editorRef}
        className={cn(
          "editor-container w-full p-4 min-h-[300px] outline-none border rounded-md",
          "whitespace-pre-wrap break-words bg-white",
          isAnalyzing ? "opacity-70" : "shadow-sm",
          "focus:ring-2 focus:ring-primary focus:border-primary",
          "overflow-y-auto max-h-[500px]" // Add scrolling for long texts
        )}
        contentEditable={!isAnalyzing}
        onInput={handleInput}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};

export default TextEditor;
