import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Shield, Zap, Bell, ArrowRight, Play, Star, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-accent/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-highlight/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b-0 mt-4 mx-6 rounded-2xl px-8 py-4 flex items-center justify-between max-w-7xl lg:mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg accent-gradient shadow-lg shadow-accent/20">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-text-primary">StockSense</span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          {['Features', 'How it Works', 'Testimonials'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="micro-label text-text-secondary hover:text-text-primary transition-colors">{item}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-card text-text-secondary hover:text-accent transition-all border border-transparent hover:border-accent/20"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/login" className="micro-label text-text-secondary hover:text-text-primary transition-colors">Login</Link>
          <Link to="/search" className="accent-gradient text-white px-6 py-2.5 rounded-xl font-bold text-sm glow-button shadow-xl shadow-accent/20">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-56 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-10 backdrop-blur-md"
        >
          <span className="flex h-2 w-2 rounded-full bg-highlight animate-pulse"></span>
          <span className="micro-label text-text-secondary">AI-Powered Sentiment Analysis 2.0 is Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-7xl md:text-9xl font-black tracking-tighter mb-10 leading-[0.85]"
        >
          TRADE WITH <br />
          <span className="gradient-text">AI PRECISION</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-text-secondary text-xl md:text-2xl max-w-2xl mb-14 leading-relaxed font-medium"
        >
          StockSense uses advanced neural networks to distill millions of data points 
          into actionable sentiment signals and profit probabilities.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-6"
        >
          <Link
            to="/search"
            className="glow-button accent-gradient text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-2xl shadow-accent/20"
          >
            Start Trading Smarter <ArrowRight size={22} />
          </Link>
          <Link
            to="/demo"
            className="px-10 py-5 rounded-2xl font-bold text-lg border border-border hover:bg-card-hover transition-all flex items-center gap-3 backdrop-blur-sm text-text-primary"
          >
            <Play size={22} fill="currentColor" /> Watch Demo
          </Link>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="mt-24 relative w-full max-w-6xl group"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-accent/30 to-highlight/30 rounded-[2.5rem] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
          <div className="relative glass rounded-[2rem] p-3 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 right-0 h-12 bg-white/5 flex items-center px-6 gap-2 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <img 
              src="https://picsum.photos/seed/stocksense-v2/1400/800" 
              alt="Dashboard Preview" 
              className="rounded-2xl w-full mt-12 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-y border-white/5 relative">
        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center relative z-10">
          {[
            { label: "Active Traders", value: "50K+", detail: "Global users" },
            { label: "Data Points/Day", value: "10M+", detail: "Real-time flow" },
            { label: "Signal Accuracy", value: "94.2%", detail: "Backtested" },
            { label: "Market Coverage", value: "2000+", detail: "Assets tracked" }
          ].map((stat, i) => (
            <div key={i} className="group">
              <div className="text-5xl font-black text-text-primary mb-3 tracking-tighter data-value group-hover:text-accent transition-colors">{stat.value}</div>
              <div className="micro-label mb-1">{stat.label}</div>
              <div className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">{stat.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-40 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-12">
          <div className="max-w-2xl">
            <span className="micro-label text-accent mb-4 block">Core Capabilities</span>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">Built for the next generation of <br /><span className="gradient-text">retail traders.</span></h2>
            <p className="text-text-secondary text-xl font-medium leading-relaxed">We've packed StockSense with institutional-grade tools, simplified for everyone who wants a data-backed edge.</p>
          </div>
          <Link to="/signup" className="micro-label text-accent flex items-center gap-3 hover:gap-5 transition-all group border border-accent/20 px-6 py-3 rounded-xl hover:bg-accent/5">
            Explore all features <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <TrendingUp className="text-accent" />, title: "Sentiment Engine", desc: "Proprietary NLP models analyze news, Reddit, and X in real-time to detect shifts in market mood before they hit the tape." },
            { icon: <Zap className="text-highlight" />, title: "Profit Probability", desc: "Our AI calculates the statistical likelihood of price movements by correlating sentiment clusters with historical price action." },
            { icon: <Shield className="text-indigo-400" />, title: "Fake News Detection", desc: "Automatically flag misleading headlines and bot-driven social hype before they affect your capital or trading strategy." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -12 }}
              className="glass p-12 rounded-[3rem] flex flex-col items-start gap-8 glass-hover relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-card-hover rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors"></div>
              <div className="p-5 rounded-2xl bg-card border border-border group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-3xl font-black tracking-tight text-text-primary">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed font-medium">{feature.desc}</p>
              <div className="mt-4 pt-8 border-t border-border dashed-border border-x-0 border-b-0 w-full">
                <button className="micro-label text-text-secondary/60 group-hover:text-accent transition-colors">Technical Specs &rarr;</button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-40 px-6 bg-white/[0.02] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-accent/5 blur-[120px] -translate-x-1/2 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-32">
            <span className="micro-label text-accent mb-4 block">The Process</span>
            <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[0.9]">Three steps to <span className="gradient-text">clarity.</span></h2>
            <p className="text-text-secondary text-xl max-w-2xl mx-auto font-medium">Stop guessing. Start following the data with our streamlined analysis pipeline designed for speed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-24 relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 dashed-border border-x-0 border-b-0"></div>
            
            {[
              { step: "01", title: "Connect", desc: "Link your watchlist or search for any stock, crypto, or commodity in seconds." },
              { step: "02", title: "Analyze", desc: "Our neural networks fuse news, social, and price data into a single sentiment score." },
              { step: "03", title: "Trade", desc: "Receive high-confidence signals and execute with a data-backed institutional edge." }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                <div className="w-20 h-20 rounded-full bg-background border-4 border-border flex items-center justify-center text-2xl font-black text-accent mb-10 group-hover:border-accent group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all z-10 data-value">
                  {item.step}
                </div>
                <h3 className="text-3xl font-black mb-6 tracking-tight text-text-primary">{item.title}</h3>
                <p className="text-text-secondary leading-relaxed max-w-xs font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-56 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/10 blur-[180px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <span className="micro-label text-accent mb-6 block">Limited Access</span>
          <h2 className="text-6xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.85] text-text-primary">READY TO <br /><span className="gradient-text">OUTSMART</span> THE MARKET?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link to="/signup" className="glow-button accent-gradient text-white px-14 py-6 rounded-2xl font-black text-xl w-full sm:w-auto shadow-2xl shadow-accent/30">Join the Waitlist</Link>
            <Link to="/demo" className="px-14 py-6 rounded-2xl font-black text-xl border border-border hover:bg-card-hover transition-all w-full sm:w-auto backdrop-blur-md text-text-primary">Try Interactive Demo</Link>
          </div>
          <p className="mt-12 micro-label text-text-secondary">No credit card required. Free 14-day trial for early adopters.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={32} className="text-accent" />
              <span className="text-2xl font-bold tracking-tight text-text-primary">StockSense</span>
            </div>
            <p className="text-text-secondary max-w-xs leading-relaxed">The world's first sentiment-first trading intelligence platform for retail investors.</p>
          </div>
          <div>
            <h4 className="text-text-primary font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-text-secondary text-sm">
              <li><a href="#" className="hover:text-accent transition-colors">Sentiment Engine</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Profit Probability</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">API Access</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-text-primary font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-text-secondary text-sm">
              <li><a href="#" className="hover:text-accent transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6 text-text-secondary/60 text-xs font-medium uppercase tracking-widest">
          <p>&copy; 2026 StockSense AI. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-text-primary transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-text-primary transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
