
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
  const [internalValue, setInternalValue] = useState(value);
  
  // Initialize internal value with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
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
      let selectionStart = 0;
      let selectionEnd = 0;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        selectionExisted = editorRef.current.contains(range.commonAncestorContainer);
        
        // Store cursor position
        if (selectionExisted) {
          const tempRange = document.createRange();
          tempRange.setStart(editorRef.current, 0);
          tempRange.setEnd(range.startContainer, range.startOffset);
          selectionStart = tempRange.toString().length;
          selectionEnd = selectionStart + (range.toString().length);
        }
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
      if (selectionExisted && editorRef.current.textContent) {
        try {
          // Helper function to find position in DOM
          function getTextNodeAtPosition(root: Node, index: number): { node: Node; position: number } {
            let lastNode: Node = root;
            let lastIndex = 0;
            let stack: Node[] = [];
            let currentNode = root.firstChild;
            
            while (currentNode) {
              if (currentNode.nodeType === Node.TEXT_NODE) {
                const length = currentNode.textContent?.length || 0;
                if (index >= lastIndex && index <= lastIndex + length) {
                  return {
                    node: currentNode,
                    position: index - lastIndex
                  };
                }
                lastIndex += length;
              } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                if ((currentNode as Element).tagName === 'BR') {
                  lastIndex += 1; // Count <br> as a newline character
                }
              }
              
              if (currentNode.firstChild) {
                stack.push(currentNode);
                currentNode = currentNode.firstChild;
              } else if (currentNode.nextSibling) {
                currentNode = currentNode.nextSibling;
              } else if (stack.length > 0) {
                currentNode = stack.pop()?.nextSibling || null;
              } else {
                currentNode = null;
              }
            }
            
            return {
              node: lastNode,
              position: lastIndex
            };
          }
          
          // Attempt to restore cursor position
          if (selectionStart === selectionEnd) {
            const pos = getTextNodeAtPosition(editorRef.current, selectionStart);
            if (pos.node) {
              selection?.removeAllRanges();
              const newRange = document.createRange();
              newRange.setStart(pos.node, pos.position);
              newRange.collapse(true);
              selection?.addRange(newRange);
            }
          }
        } catch (e) {
          console.log("Could not restore selection", e);
        }
      }
    }
  }, [value, corrections, isAnalyzing, onCorrectionClick]);
  
  // Handle the input event properly
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    
    // Get the raw text content directly from the contentEditable div
    const content = editorRef.current.innerHTML;
    
    // Create a temporary div to convert HTML to plain text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    
    // Extract plain text while preserving line breaks
    const plainText = tempDiv.innerText || "";
    
    // Update internal value and call onChange
    setInternalValue(plainText);
    onChange(plainText);
  };

  // Make sure the editor shows the correct content
  useEffect(() => {
    if (!editorRef.current || corrections.length > 0) return;
    
    // Only update the inner HTML if there's a significant difference to avoid cursor jumping
    if (!editorRef.current.textContent || editorRef.current.textContent.trim() !== value.trim()) {
      const htmlContent = value.replace(/\n/g, '<br>') || '<br>';
      editorRef.current.innerHTML = htmlContent;
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
        dir="ltr" // Explicitly set text direction to left-to-right
      />
    </div>
  );
};

export default TextEditor;
