import React from "react";
import { Volume2 } from "lucide-react";
import ai from "../services/geminiService";

interface ExplanationProps {
  what: string;
  meaning: string;
  action: string;
  onListen?: () => void;
}

export const ExplanationCard: React.FC<ExplanationProps> = ({ what, meaning, action, onListen }) => (
  <div className="mt-4 p-4 rounded-2xl bg-accent/5 border border-accent/10 text-xs space-y-2">
    <div className="flex justify-between items-start">
      <p><strong>📌 What:</strong> {what}</p>
      {onListen && (
        <button onClick={onListen} className="text-accent hover:text-accent/80">
          <Volume2 size={16} />
        </button>
      )}
    </div>
    <p><strong>🧠 Meaning:</strong> {meaning}</p>
    <p><strong>🎯 Action:</strong> {action}</p>
  </div>
);

export const ExplainThisButton: React.FC<{ topic: string, data?: string }> = ({ topic, data }) => {
  const [show, setShow] = React.useState(false);
  const [explanation, setExplanation] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleExplain = async () => {
    setShow(!show);
    if (!show && !explanation) {
      setLoading(true);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Explain ${topic} in simple words for a beginner. ${data ? `Based on this data: ${data}.` : ""} Keep it under 3 lines, no jargon, friendly tone.`,
        });
        setExplanation(response.text || "Sorry, I couldn't explain that right now.");
      } catch (e) {
        setExplanation("Sorry, I couldn't explain that right now.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative inline-block">
      <button 
        onClick={handleExplain}
        className="text-[10px] font-bold text-accent hover:underline"
      >
        Explain in simple words
      </button>
      {show && (
        <div className="absolute z-50 mt-2 p-3 w-48 glass rounded-xl border border-border text-[11px] shadow-xl">
          {loading ? "Thinking..." : explanation}
        </div>
      )}
    </div>
  );
};
