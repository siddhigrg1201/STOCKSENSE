import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Zap, Database } from "lucide-react";
import { useAuth } from "../context/AuthContext";

import { ExplanationCard } from "./ExplanationComponents";

interface Data {
  value: number;
  trend: string;
  confidence: string;
  source: "primary" | "fallback" | "simulation";
}

export default function RobustDataDisplay({ beginnerMode }: { beginnerMode: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const market = user?.settings?.market || 'GLOBAL';

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/data?market=${market}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [market]);

  if (loading) return <div>Updating...</div>;
  if (!data) return <div>No data available</div>;

  const getSourceColor = (source: string) => {
    switch (source) {
      case "polygon": return "text-highlight";
      case "twelve_data": return "text-highlight";
      case "alpha_vantage": return "text-highlight";
      case "finnhub": return "text-highlight";
      case "coingecko": return "text-highlight";
      case "yahoo": return "text-warning";
      case "finnhub_sim": return "text-accent";
      case "simulation": return "text-accent";
      default: return "text-text-secondary";
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "polygon": return "🟢 Polygon.io (Live)";
      case "twelve_data": return "🟢 Twelve Data (Live)";
      case "alpha_vantage": return "🟢 Alpha Vantage (Live)";
      case "finnhub": return "🟢 Finnhub (Live)";
      case "coingecko": return "🟢 CoinGecko (Live)";
      case "yahoo": return "🟡 Yahoo Finance (Backup)";
      case "finnhub_sim": return "🔵 Finnhub AI (Simulated)";
      case "simulation": return "🔵 AI Simulation (Demo)";
      default: return "⚪ Unknown Source";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass p-6 rounded-2xl border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Market Index (SPY)</h3>
        <span className={`text-[10px] font-black uppercase tracking-widest ${getSourceColor(data.source)}`}>
          {getSourceLabel(data.source)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-text-secondary">Value</p>
          <p className="text-2xl font-black">{data.value}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Trend</p>
          <p className="text-2xl font-black">{data.trend}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Confidence</p>
          <p className="text-2xl font-black">{data.confidence}</p>
        </div>
      </div>
      {beginnerMode && (
        <ExplanationCard 
          what="Robust Data Feed"
          meaning="Shows the current stock price, trend direction, and how sure the system is about this data."
          action="Use this to quickly gauge the market status."
        />
      )}
    </motion.div>
  );
}
