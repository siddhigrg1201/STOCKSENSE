import React from "react";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon, Zap } from "lucide-react";

const sentimentData = [
  { name: "Bullish", value: 45, color: "#10b981" },
  { name: "Neutral", value: 30, color: "#6366f1" },
  { name: "Bearish", value: 25, color: "#f43f5e" },
];

const sectorData = [
  { sector: "Tech", performance: 12.5 },
  { sector: "Energy", performance: -4.2 },
  { sector: "Finance", performance: 8.1 },
  { sector: "Health", performance: 2.4 },
  { sector: "Retail", performance: 5.7 },
];

const historicalSentiment = [
  { date: "Mon", score: 0.2 },
  { date: "Tue", score: 0.45 },
  { date: "Wed", score: -0.1 },
  { date: "Thu", score: 0.6 },
  { date: "Fri", score: 0.8 },
  { date: "Sat", score: 0.75 },
  { date: "Sun", score: 0.9 },
];

export default function AnalyticsView() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-text-primary tracking-tighter">Market Analytics</h2>
          <p className="text-text-secondary font-medium mt-1">Deep-dive into AI-driven market sentiment and performance metrics.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2.5 rounded-2xl bg-card border border-border text-text-primary font-bold text-sm hover:bg-card-hover transition-all">
            Export Report
          </button>
          <button className="px-6 py-2.5 rounded-2xl accent-gradient text-white font-bold text-sm shadow-lg shadow-accent/20">
            Real-time Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sentiment Distribution */}
        <div className="glass p-8 rounded-[2.5rem] lg:col-span-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <PieChartIcon size={20} className="text-accent" />
            </div>
            <h3 className="text-xl font-bold text-text-primary tracking-tight">Sentiment Mix</h3>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-text-primary tracking-tighter">75%</span>
              <span className="micro-label">Bullish Bias</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {sentimentData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-bold text-text-secondary">{item.name}</span>
                </div>
                <span className="text-sm font-black text-text-primary data-value">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Sentiment Trend */}
        <div className="glass p-8 rounded-[2.5rem] lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-highlight/10">
                <Activity size={20} className="text-highlight" />
              </div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">Sentiment Velocity</h3>
            </div>
            <div className="flex gap-2">
              {['7D', '30D', '90D'].map(t => (
                <button key={t} className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${t === '7D' ? 'bg-card-hover text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalSentiment}>
                <defs>
                  <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--border)" fontSize={10} tickLine={false} axisLine={false} dy={15} />
                <YAxis hide domain={[-1, 1]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSentiment)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 p-6 rounded-2xl bg-highlight/5 border border-highlight/10">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={16} className="text-highlight" />
              <span className="text-xs font-black text-highlight uppercase tracking-widest">AI Insight</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed italic">
              "Sentiment velocity has increased by 15% over the last 48 hours, suggesting a potential momentum breakout in the technology sector."
            </p>
          </div>
        </div>

        {/* Sector Performance */}
        <div className="glass p-8 rounded-[2.5rem] lg:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <TrendingUp size={20} className="text-accent" />
              </div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">Sector Heatmap</h3>
            </div>
            <span className="micro-label">Last 24 Hours</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {sectorData.map((item) => (
              <div key={item.sector} className="p-6 rounded-3xl bg-card border border-border flex flex-col items-center text-center group hover:bg-card-hover transition-all">
                <span className="micro-label mb-4">{item.sector}</span>
                <span className={`text-2xl font-black tracking-tighter data-value ${item.performance >= 0 ? 'text-highlight' : 'text-warning'}`}>
                  {item.performance >= 0 ? '+' : ''}{item.performance}%
                </span>
                <div className="mt-4 w-full h-1 bg-slate-900 dark:bg-slate-900 light:bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.abs(item.performance) * 5}%` }}
                    className={`h-full rounded-full ${item.performance >= 0 ? 'bg-highlight' : 'bg-warning'}`}
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
