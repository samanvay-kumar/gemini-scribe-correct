
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  return (
    <header className={cn("border-b", className)}>
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            TextCorrect
          </span>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
            Beta
          </span>
        </div>
        <div className="ml-auto flex items-center">
          <span className="text-sm text-muted-foreground">
            Powered by Gemini AI
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
