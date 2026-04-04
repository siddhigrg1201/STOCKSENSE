import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Zap, Target, ArrowUpRight, Plus, Info, Sparkles, Loader2 } from "lucide-react";

interface Opportunity {
  symbol: string;
  name: string;
  sentiment: number;
  trend: "Bullish" | "Bearish";
  probability: number;
  reason: string;
  price: number;
  change: number;
  source?: string;
}

const OPPORTUNITIES_GLOBAL: Partial<Opportunity>[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", sentiment: 92, trend: "Bullish", probability: 88, reason: "AI infrastructure demand remains the primary catalyst, with strong institutional accumulation and breakout sentiment." },
  { symbol: "TSLA", name: "Tesla, Inc.", sentiment: 85, trend: "Bullish", probability: 82, reason: "Retail sentiment reversal and oversold technical conditions suggest a high-probability short-term bounce." },
  { symbol: "AAPL", name: "Apple Inc.", sentiment: 74, trend: "Bullish", probability: 72, reason: "Low-volatility growth play supported by supply chain stability and consistent dividend yield." },
  { symbol: "AMD", name: "Advanced Micro Devices", sentiment: 81, trend: "Bullish", probability: 79, reason: "Sympathy play with the broader semiconductor sector; technical breakout confirmed." },
  { symbol: "MSFT", name: "Microsoft Corp.", sentiment: 88, trend: "Bullish", probability: 84, reason: "Cloud computing dominance and AI integration driving sustained revenue growth and institutional confidence." }
];

const OPPORTUNITIES_INDIA: Partial<Opportunity>[] = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", sentiment: 88, trend: "Bullish", probability: 85, reason: "Diversified growth across retail, digital services, and green energy continues to attract long-term capital." },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", sentiment: 75, trend: "Bullish", probability: 70, reason: "Robust order book and consistent digital transformation demand provide a stable foundation for growth." },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", sentiment: 82, trend: "Bullish", probability: 78, reason: "Strong credit growth and market share expansion in the banking sector remain key drivers." },
  { symbol: "INFY.NS", name: "Infosys", sentiment: 70, trend: "Bullish", probability: 65, reason: "Positive outlook on global IT spending and operational efficiency improvements." },
  { symbol: "SBIN.NS", name: "State Bank of India", sentiment: 79, trend: "Bullish", probability: 72, reason: "Improved asset quality and strong loan growth in the public sector banking space." }
];

export default function TopOpportunitiesView({ market, onSelectStock }: { market: 'GLOBAL' | 'INDIA', onSelectStock?: (symbol: string) => void }) {
  const [tradeModal, setTradeModal] = useState<Opportunity | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    const baseOpportunities = market === 'INDIA' ? OPPORTUNITIES_INDIA : OPPORTUNITIES_GLOBAL;
    
    const fetchOpportunitiesData = async () => {
      try {
        const symbols = baseOpportunities.map(o => o.symbol).join(",");
        const res = await fetch(`/api/market/tickers?symbols=${symbols}`);
        if (!res.ok) throw new Error("Failed to fetch opportunities data");
        
        const data = await res.json();
        
        const merged = baseOpportunities.map(base => {
          const live = data.find((d: any) => d.symbol === base.symbol);
          return {
            ...base,
            price: live?.price || 0,
            change: live?.changePercent || 0,
            source: live?.source || "simulation"
          } as Opportunity;
        });

        setOpportunities(merged);
      } catch (err) {
        console.error("Error fetching opportunities:", err);
        setOpportunities(baseOpportunities.map(o => ({
          ...o,
          price: 0,
          change: 0
        })) as Opportunity[]);
      }
    };

    fetchOpportunitiesData();
    const interval = setInterval(fetchOpportunitiesData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [market]);

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Trade Modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-2xl font-black mb-4 tracking-tighter">Trade {tradeModal.symbol}</h3>
            <p className="text-text-secondary mb-6 font-medium">Are you sure you want to trade {tradeModal.name} at <span className="text-text-primary font-bold">${tradeModal.price.toLocaleString()}</span>?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setTradeModal(null)}
                className="flex-1 px-6 py-4 rounded-2xl bg-card border border-border font-bold hover:bg-card-hover transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  console.log(`Trade executed for ${tradeModal.symbol}`);
                  setTradeModal(null);
                  // In a real app, this would call an execution API
                }}
                className="flex-1 px-6 py-4 rounded-2xl accent-gradient text-white font-bold hover:shadow-xl shadow-accent/20 transition-all"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Trophy size={24} />
          </div>
          <h2 className="text-4xl font-black text-text-primary tracking-tighter">Top Opportunities Today</h2>
        </div>
        <p className="text-text-secondary font-medium">Curated high-probability signals based on AI sentiment analysis and technical trends.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {opportunities.map((opp, i) => (
          <motion.div
            key={opp.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-8 rounded-[2.5rem] glass-hover group relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors"></div>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              {/* Asset Info */}
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-accent/20">
                  {opp.symbol[0]}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-3xl font-black text-text-primary tracking-tighter">{opp.symbol}</h3>
                    <span className="px-2.5 py-1 rounded-lg bg-card border border-border micro-label">{opp.name}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-highlight font-bold text-sm">
                      <ArrowUpRight size={16} />
                      ${opp.price.toLocaleString()}
                    </div>
                    <div className={`text-xs font-black px-2 py-0.5 rounded-lg border ${opp.change >= 0 ? 'text-highlight bg-highlight/10 border-highlight/20' : 'text-warning bg-warning/10 border-warning/20'}`}>
                      {opp.change >= 0 ? '+' : ''}{opp.change}%
                    </div>
                    {opp.source && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary opacity-50">
                        Source: {opp.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 max-w-2xl">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-accent" />
                    <span className="micro-label">Sentiment</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-card border border-border rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${opp.sentiment}%` }}
                        transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                        className="h-full accent-gradient"
                      />
                    </div>
                    <span className="text-sm font-black text-text-primary">{opp.sentiment}</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-highlight" />
                    <span className="micro-label">Trend</span>
                  </div>
                  <span className="text-sm font-black text-highlight uppercase tracking-wider">{opp.trend}</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-accent" />
                    <span className="micro-label">Probability</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black text-text-primary tracking-tighter">{opp.probability}%</span>
                    <span className="text-[10px] text-text-secondary font-bold uppercase">Profit</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onSelectStock?.(opp.symbol)}
                  className="px-6 py-4 rounded-2xl bg-card border border-border text-text-primary font-bold text-sm hover:bg-card-hover transition-all"
                >
                  View Analysis
                </button>
                <button 
                  onClick={() => setTradeModal(opp)}
                  className="px-6 py-4 rounded-2xl accent-gradient text-white font-bold text-sm shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all"
                >
                  Trade Now
                </button>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="mt-8 pt-6 border-t border-border dashed-border border-x-0 border-b-0 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-accent/5 text-accent shrink-0">
                <Zap size={16} fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">AI Reasoning</span>
                  <Info size={10} className="text-text-secondary" />
                </div>
                <p className="text-sm text-text-secondary font-medium leading-relaxed italic">
                  "{opp.reason}"
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-12 p-6 rounded-3xl bg-warning/5 border border-warning/10 flex items-center gap-4">
        <div className="p-2 rounded-xl bg-warning/10 text-warning">
          <Info size={20} />
        </div>
        <p className="text-xs text-text-secondary font-medium leading-relaxed">
          <span className="text-warning font-bold uppercase mr-2">Financial Disclaimer:</span>
          The "Top Opportunities" list is generated by AI based on sentiment and technical patterns. This is not financial advice. Always perform your own due diligence before making investment decisions.
        </p>
      </div>
    </div>
  );
}
