import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User as UserIcon, Mail, Shield, Bell, Globe, 
  CreditCard, LogOut, Save, CheckCircle, AlertCircle, Zap
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { User } from "../types";

export default function SettingsView() {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState("Profile Information");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [settings, setSettings] = useState<User['settings']>(user?.settings || { 
    twoFactor: true, 
    biometric: false, 
    dataSharing: true,
    notifications: { email: true, push: true, marketAlerts: true },
    language: "English",
    region: "United States",
    market: "GLOBAL",
    currency: "USD",
    subscription: { plan: "Free", status: "Active", nextBilling: "N/A" }
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await updateUser({ name, email, settings });
      setMessage({ type: 'success', text: "Profile updated successfully!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: "An error occurred while updating profile" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = async (key: string, value: any, parentKey?: string) => {
    let newSettings;
    if (parentKey) {
      newSettings = { 
        ...settings, 
        [parentKey]: { ...((settings as any)[parentKey] || {}), [key]: value } 
      };
    } else {
      newSettings = { ...settings, [key]: value };
    }
    
    setSettings(newSettings as any);
    
    // Auto-save settings
    try {
      await updateUser({ settings: newSettings as any });
    } catch (err) {
      console.error("Failed to auto-save settings:", err);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "Profile Information":
        return (
          <div className="space-y-8">
            <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 rounded-3xl accent-gradient flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-accent/30 relative group cursor-pointer">
                  <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Edit</span>
                  </div>
                  {user?.name[0]}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary tracking-tight">Personal Details</h3>
                  <p className="text-text-secondary text-sm font-medium">Update your name and email address.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="micro-label ml-1">Full Name</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="micro-label ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>

                {message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-highlight/10 text-highlight border border-highlight/20' : 'bg-warning/10 text-warning border border-warning/20'}`}
                  >
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-bold">{message.text}</span>
                  </motion.div>
                )}

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-10 py-4 rounded-2xl accent-gradient text-white font-bold text-sm shadow-xl shadow-accent/20 flex items-center gap-3 glow-button disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Save size={18} />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
            <div className="p-10 rounded-[2.5rem] border-2 border-dashed border-warning/20 bg-warning/5">
              <h3 className="text-xl font-bold text-warning tracking-tight mb-2">Danger Zone</h3>
              <p className="text-text-secondary text-sm font-medium mb-8">Once you delete your account, there is no going back. Please be certain.</p>
              <button className="px-8 py-3 rounded-2xl bg-warning/10 border border-warning/20 text-warning font-bold text-sm hover:bg-warning/20 transition-all">
                Delete Account
              </button>
            </div>
          </div>
        );
      case "Security & Privacy":
        return (
          <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-warning/10">
                  <Shield size={24} className="text-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Security & Privacy</h3>
                  <p className="text-text-secondary text-sm font-medium">Protect your account with advanced security features.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <SecurityToggle 
                label="Two-Factor Authentication (2FA)" 
                description="Add an extra layer of security to your account." 
                enabled={settings.twoFactor} 
                onToggle={(val) => updateSetting('twoFactor', val)}
              />
              <SecurityToggle 
                label="Biometric Login" 
                description="Use FaceID or Fingerprint to access StockSense." 
                enabled={settings.biometric} 
                onToggle={(val) => updateSetting('biometric', val)}
              />
              <SecurityToggle 
                label="Data Sharing" 
                description="Allow AI to use anonymized data for better predictions." 
                enabled={settings.dataSharing} 
                onToggle={(val) => updateSetting('dataSharing', val)}
              />
            </div>
          </div>
        );
      case "Notification Center":
        return (
          <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/10">
                  <Bell size={24} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Notification Center</h3>
                  <p className="text-text-secondary text-sm font-medium">Choose how you want to be notified about market changes.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <SecurityToggle 
                label="Email Notifications" 
                description="Receive daily summaries and important alerts via email." 
                enabled={settings.notifications?.email} 
                onToggle={(val) => updateSetting('email', val, 'notifications')}
              />
              <SecurityToggle 
                label="Push Notifications" 
                description="Get real-time alerts on your mobile device or browser." 
                enabled={settings.notifications?.push} 
                onToggle={(val) => updateSetting('push', val, 'notifications')}
              />
              <SecurityToggle 
                label="Market Volatility Alerts" 
                description="Special alerts when major market movements are detected." 
                enabled={settings.notifications?.marketAlerts} 
                onToggle={(val) => updateSetting('marketAlerts', val, 'notifications')}
              />
            </div>
          </div>
        );
      case "Language & Region":
        return (
          <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-highlight/10">
                  <Globe size={24} className="text-highlight" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Language & Region</h3>
                  <p className="text-text-secondary text-sm font-medium">Customize your experience with local preferences.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="micro-label ml-1">Market Preference</label>
                <select 
                  value={settings.market || 'GLOBAL'}
                  onChange={(e) => updateSetting('market', e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl py-3.5 px-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
                >
                  <option value="GLOBAL" className="text-text-primary bg-card">Global (USD)</option>
                  <option value="INDIA" className="text-text-primary bg-card">India (INR)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="micro-label ml-1">Primary Language</label>
                <select 
                  value={settings.language}
                  onChange={(e) => updateSetting('language', e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl py-3.5 px-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
                >
                  <option value="English" className="text-text-primary bg-card">English</option>
                  <option value="Spanish" className="text-text-primary bg-card">Spanish</option>
                  <option value="French" className="text-text-primary bg-card">French</option>
                  <option value="German" className="text-text-primary bg-card">German</option>
                  <option value="Japanese" className="text-text-primary bg-card">Japanese</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="micro-label ml-1">Region</label>
                <select 
                  value={settings.region}
                  onChange={(e) => updateSetting('region', e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl py-3.5 px-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
                >
                  <option value="United States" className="text-text-primary bg-card">United States</option>
                  <option value="United Kingdom" className="text-text-primary bg-card">United Kingdom</option>
                  <option value="European Union" className="text-text-primary bg-card">European Union</option>
                  <option value="Canada" className="text-text-primary bg-card">Canada</option>
                  <option value="Australia" className="text-text-primary bg-card">Australia</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="micro-label ml-1">Preferred Currency</label>
                <select 
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl py-3.5 px-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-sm text-text-primary"
                >
                  <option value="USD" className="text-text-primary bg-card">USD ($)</option>
                  <option value="EUR" className="text-text-primary bg-card">EUR (€)</option>
                  <option value="GBP" className="text-text-primary bg-card">GBP (£)</option>
                  <option value="JPY" className="text-text-primary bg-card">JPY (¥)</option>
                  <option value="CAD" className="text-text-primary bg-card">CAD ($)</option>
                  <option value="INR" className="text-text-primary bg-card">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>
        );
      case "Billing & Subscription":
        return (
          <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/10">
                  <CreditCard size={24} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Billing & Subscription</h3>
                  <p className="text-text-secondary text-sm font-medium">Manage your plan and payment methods.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-between">
                <div>
                  <p className="micro-label text-accent mb-1">Current Plan</p>
                  <h4 className="text-2xl font-black text-text-primary tracking-tighter">{settings.subscription?.plan} Plan</h4>
                  <p className="text-xs text-text-secondary font-medium mt-1">Status: <span className="text-highlight">{settings.subscription?.status}</span></p>
                </div>
                <button className="px-6 py-2.5 rounded-xl accent-gradient text-white font-bold text-xs shadow-lg shadow-accent/20">
                  Upgrade to Pro
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-text-primary">Billing Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <p className="micro-label mb-1">Next Billing Date</p>
                    <p className="text-sm font-bold text-text-primary">{settings.subscription?.nextBilling}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-card border border-border">
                    <p className="micro-label mb-1">Payment Method</p>
                    <p className="text-sm font-bold text-text-primary">•••• 4242</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button className="text-xs font-bold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                  <LogOut size={14} /> View Billing History
                </button>
              </div>
            </div>
          </div>
        );
      case "Market Data Status":
        return (
          <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-highlight/10">
                  <Zap size={24} className="text-highlight" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Market Data Providers</h3>
                  <p className="text-text-secondary text-sm font-medium">Status of connected market data APIs.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight font-black">P</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Polygon.io</h4>
                    <p className="text-xs text-text-secondary">Primary Real-time Data</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-highlight/10 text-highlight text-[10px] font-black uppercase tracking-widest">Connected</span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black">TD</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Twelve Data</h4>
                    <p className="text-xs text-text-secondary">Primary Market Data</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-highlight/10 text-highlight text-[10px] font-black uppercase tracking-widest">Connected</span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight font-black">AV</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Alpha Vantage</h4>
                    <p className="text-xs text-text-secondary">Secondary Stock Data</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-highlight/10 text-highlight text-[10px] font-black uppercase tracking-widest">Connected</span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black">FH</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Finnhub</h4>
                    <p className="text-xs text-text-secondary">Secondary Stock Data</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-highlight/10 text-highlight text-[10px] font-black uppercase tracking-widest">Connected</span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning font-black">CG</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">CoinGecko</h4>
                    <p className="text-xs text-text-secondary">Crypto Market Data</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-highlight/10 text-highlight text-[10px] font-black uppercase tracking-widest">Connected</span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-text-secondary/10 flex items-center justify-center text-text-secondary font-black">YF</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Yahoo Finance (Backup)</h4>
                    <p className="text-xs text-text-secondary">Fallback Data Source</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-warning/10 text-warning text-[10px] font-black uppercase tracking-widest">Fallback Only</span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black">AI</div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Gemini AI</h4>
                    <p className="text-xs text-text-secondary">Intelligence & Analysis Engine</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-highlight/10 text-highlight text-[10px] font-black uppercase tracking-widest">Active</span>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-accent/5 border border-accent/10">
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="text-accent font-bold uppercase mr-2">Note:</span>
                API keys are managed via environment variables for security. If a provider shows "Disconnected", ensure the corresponding key is set in your project settings.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12 pb-20"
    >
      <div>
        <h2 className="text-4xl font-black text-text-primary tracking-tighter">Account Settings</h2>
        <p className="text-text-secondary font-medium mt-1">Manage your profile, security, and notification preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar Navigation for Settings */}
        <div className="lg:col-span-1 space-y-4">
          <SettingsNavItem 
            icon={<UserIcon size={20} />} 
            label="Profile Information" 
            active={activeSection === "Profile Information"} 
            onClick={() => setActiveSection("Profile Information")}
          />
          <SettingsNavItem 
            icon={<Shield size={20} />} 
            label="Security & Privacy" 
            active={activeSection === "Security & Privacy"} 
            onClick={() => setActiveSection("Security & Privacy")}
          />
          <SettingsNavItem 
            icon={<Bell size={20} />} 
            label="Notification Center" 
            active={activeSection === "Notification Center"} 
            onClick={() => setActiveSection("Notification Center")}
          />
          <SettingsNavItem 
            icon={<Globe size={20} />} 
            label="Language & Region" 
            active={activeSection === "Language & Region"} 
            onClick={() => setActiveSection("Language & Region")}
          />
          <SettingsNavItem 
            icon={<CreditCard size={20} />} 
            label="Billing & Subscription" 
            active={activeSection === "Billing & Subscription"} 
            onClick={() => setActiveSection("Billing & Subscription")}
          />
          <SettingsNavItem 
            icon={<Zap size={20} />} 
            label="Market Data Status" 
            active={activeSection === "Market Data Status"} 
            onClick={() => setActiveSection("Market Data Status")}
          />
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${active ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20' : 'bg-card border-transparent text-text-secondary hover:bg-card-hover hover:text-text-primary'}`}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
    </button>
  );
}

function SecurityToggle({ label, description, enabled = false, onToggle }: { label: string, description: string, enabled?: boolean, onToggle?: (val: boolean) => void }) {
  const [isOn, setIsOn] = useState(enabled);
  
  const handleToggle = () => {
    const newVal = !isOn;
    setIsOn(newVal);
    if (onToggle) onToggle(newVal);
  };
  
  return (
    <div className="flex items-center justify-between p-5 rounded-2xl bg-card border border-border hover:border-text-primary/10 transition-all">
      <div className="flex-1 pr-8">
        <h4 className="text-sm font-bold text-text-primary mb-1">{label}</h4>
        <p className="text-xs text-text-secondary font-medium">{description}</p>
      </div>
      <button 
        onClick={handleToggle}
        className={`w-12 h-6 rounded-full relative transition-all ${isOn ? 'bg-accent shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-300'}`}
      >
        <motion.div 
          animate={{ x: isOn ? 26 : 4 }}
          className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}
