import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function FloatingBot() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/ask-panchi')}
      className="hidden md:flex fixed bottom-8 right-6 w-16 h-16 bg-primary text-white rounded-full shadow-2xl items-center justify-center hover:bg-amber-600 hover:scale-110 transition-all z-50 group border-4 border-white"
    >
      <div className="relative">
        <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 bg-white text-primary rounded-full p-1 shadow-sm">
          <span className="text-[10px] font-black leading-none">🐾</span>
        </div>
      </div>
    </button>
  );
}
