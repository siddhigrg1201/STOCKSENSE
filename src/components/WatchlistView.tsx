import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, X, TrendingUp, TrendingDown, 
  BarChart2, Trash2, ExternalLink, AlertCircle
} from "lucide-react";
import { StockData } from "../types";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/currency";

interface WatchlistViewProps {
  watchlist: string[];
  selectedStock: string;
  setSelectedStock: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
}

export default function WatchlistView({ 
  watchlist, 
  selectedStock, 
  setSelectedStock, 
  removeFromWatchlist,
  addToWatchlist
}: WatchlistViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();
  const market = user?.settings?.market || 'GLOBAL';

  const filteredWatchlist = watchlist.filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery && !watchlist.includes(searchQuery.toUpperCase())) {
      addToWatchlist(searchQuery.toUpperCase());
      setSearchQuery("");
      setIsAdding(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-text-primary tracking-tighter">My Watchlist</h2>
          <p className="text-text-secondary font-medium mt-1">Monitor your favorite assets and their real-time AI sentiment scores.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search or add symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border border-border rounded-2xl py-2.5 pl-11 pr-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm w-64 text-text-primary"
            />
          </div>
          {isAdding ? (
            <form onSubmit={handleAdd} className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Enter symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card border border-border rounded-2xl py-2.5 px-4 outline-none focus:border-accent/50 transition-all text-sm w-48 text-text-primary"
                autoFocus
              />
              <button type="submit" className="p-2 rounded-xl bg-accent text-white">
                <Plus size={18} />
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="p-2 rounded-xl bg-card text-text-secondary">
                <X size={18} />
              </button>
            </form>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="p-3 rounded-2xl accent-gradient text-white shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="glass rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-border">
          <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center text-text-secondary/20 mb-8">
            <BarChart2 size={48} />
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-2">Your Watchlist is Empty</h3>
          <p className="text-text-secondary max-w-md mb-8">Start tracking stocks to get real-time AI sentiment analysis and profit probability scores.</p>
          <form onSubmit={handleAdd} className="flex gap-3 w-full max-w-sm">
            <input 
              type="text" 
              placeholder="Enter symbol (e.g. TSLA)"
              className="flex-1 bg-card border border-border rounded-2xl px-6 py-3 outline-none focus:border-accent/50 transition-all text-text-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="px-8 py-3 rounded-2xl accent-gradient text-white font-bold shadow-lg shadow-accent/20">
              Add
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredWatchlist.map((symbol) => (
              <WatchlistCard 
                key={symbol}
                symbol={symbol}
                isActive={selectedStock === symbol}
                onSelect={() => setSelectedStock(symbol)}
                onRemove={() => removeFromWatchlist(symbol)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Market Insights Footer */}
      <div className="glass p-8 rounded-[2.5rem] bg-accent/5 border-accent/10 flex items-center gap-6">
        <div className="p-4 rounded-2xl bg-accent/10">
          <AlertCircle className="text-accent" size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-text-primary">Pro Tip: Diversification</h4>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your watchlist currently has high exposure to the <span className="text-accent font-bold">Tech Sector</span>. 
            Consider adding assets from Energy or Finance to balance your portfolio sentiment risk.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function WatchlistCard({ symbol, isActive, onSelect, onRemove }: { 
  symbol: string, 
  isActive: boolean, 
  onSelect: () => void, 
  onRemove: () => void 
}) {
  const [data, setData] = useState<{ price: number; changePercent: number; source?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const market = user?.settings?.market || 'GLOBAL';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/stock/realtime/${symbol}?market=${market}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error(`Error fetching ${symbol}:`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [symbol, market]);

  if (loading && !data) {
    return (
      <div className="glass p-6 rounded-[2rem] border-2 border-transparent animate-pulse bg-card/50 h-48"></div>
    );
  }

  const price = data?.price || 0;
  const changePercent = data?.changePercent || 0;
  const isPositive = changePercent >= 0;
  const source = data?.source || "simulation";
  
  // Dynamic currency formatting
  const stockCurrency = (data as any)?.currency || (symbol.endsWith('.NS') || symbol.startsWith('^') ? 'INR' : 'USD');
  const formattedPrice = formatCurrency(price, stockCurrency, market);
  const currencySymbol = formattedPrice.symbol;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      onClick={onSelect}
      className={`glass p-6 rounded-[2rem] cursor-pointer transition-all border-2 group relative overflow-hidden ${isActive ? 'border-accent/50 bg-accent/5' : 'border-transparent hover:border-text-primary/10'}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center font-black text-text-primary text-lg shadow-inner group-hover:accent-gradient group-hover:text-white transition-all">
            {symbol[0]}
          </div>
          <div>
            <h4 className="text-xl font-black text-text-primary tracking-tighter">{symbol}</h4>
            <span className="micro-label">
              {source === "coingecko" ? "Crypto Market" : market === 'INDIA' ? "NSE" : "Nasdaq GS"}
            </span>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-2 text-text-secondary hover:text-warning transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-black text-text-primary tracking-tighter data-value">{currencySymbol}{formattedPrice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className={`flex items-center gap-1.5 mt-1 font-bold text-xs ${isPositive ? 'text-highlight' : 'text-warning'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(changePercent).toFixed(2)}%
          </div>
        </div>
        <div className="text-right">
          <span className="micro-label block mb-1">AI Sentiment</span>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isPositive ? 'bg-highlight/10 text-highlight' : 'bg-warning/10 text-warning'}`}>
            {isPositive ? 'Bullish' : 'Bearish'}
          </div>
        </div>
      </div>

      {/* Mini Chart Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </motion.div>
  );
}
