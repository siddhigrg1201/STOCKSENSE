export interface User {
  id: string;
  name: string;
  email: string;
  settings?: {
    twoFactor?: boolean;
    biometric?: boolean;
    dataSharing?: boolean;
    notifications?: {
      email: boolean;
      push: boolean;
      marketAlerts: boolean;
    };
    language?: string;
    region?: string;
    market?: 'GLOBAL' | 'INDIA';
    currency?: string;
    subscription?: {
      plan: 'Free' | 'Pro';
      status: 'Active' | 'Inactive';
      nextBilling: string;
    };
  };
}

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  sentiment: number; // -1 to 1
  confidence: number; // 0-100
  impact: "High" | "Medium" | "Low";
  probability: number; // 0-100
  news: NewsItem[];
  currency?: string;
  recommendation?: "Buy" | "Hold" | "Avoid";
  riskLevel?: "High Risk" | "Medium Risk" | "Low Risk";
  reasoning?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: number;
  impact: "High" | "Medium" | "Low";
  isFake?: boolean;
}

export interface MarketEmotion {
  value: number;
  label: string;
  summary: string;
}
