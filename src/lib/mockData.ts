export const mockSentiment = {
  score: 0.65,
  confidence: 85,
  impact: "High",
  explanation: "Strong institutional accumulation and positive earnings guidance suggest a bullish trend.",
  fakeNewsRisk: 5
};

export const mockEmotion = {
  value: 72,
  label: "Greed",
  summary: "Market participants are showing high confidence as major indices hit new highs, though some technical indicators suggest overbought conditions."
};

export const mockPrediction = {
  probability: 68,
  predictedPrice: 185.50,
  reasoning: "Historical patterns after similar sentiment spikes show a 70% success rate for continued momentum."
};

export const mockTrendingStocks = [
  { symbol: "NVDA", price: 890.50, change: 12.4, changePercent: 1.4, sentiment: 0.85 },
  { symbol: "AAPL", price: 172.10, change: -1.2, changePercent: -0.7, sentiment: 0.45 },
  { symbol: "TSLA", price: 175.30, change: 5.6, changePercent: 3.2, sentiment: 0.60 },
  { symbol: "MSFT", price: 420.15, change: 2.3, changePercent: 0.5, sentiment: 0.75 },
  { symbol: "BTC", price: 68500, change: 1200, changePercent: 1.8, sentiment: 0.90 }
];
