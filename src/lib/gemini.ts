import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function analyzeSentiment(news: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the sentiment of the following news headlines and return a JSON object with:
      - score: number (-1 to 1)
      - confidence: number (0 to 100)
      - impact: "High" | "Medium" | "Low"
      - explanation: string (brief)
      
      News: ${news.join("\n")}`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Sentiment AI Error:", error);
    return { score: 0, confidence: 50, impact: "Medium", explanation: "Error connecting to AI service", isFallback: true };
  }
}

export async function predictPriceMovement(symbol: string, sentimentScore: number, currentPrice: number) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Predict the short-term price movement for ${symbol} based on:
      - Current Price: $${currentPrice}
      - Sentiment Score: ${sentimentScore}
      
      Return a JSON object with:
      - probability: number (0 to 100)
      - predictedPrice: number
      - reasoning: string (brief)
      - recommendation: "Buy" | "Hold" | "Avoid"
      - riskLevel: "High Risk" | "Medium Risk" | "Low Risk"`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Prediction AI Error:", error);
    return { 
      probability: 50, 
      predictedPrice: currentPrice, 
      reasoning: "Error connecting to AI service", 
      recommendation: "Hold",
      riskLevel: "Medium Risk",
      isFallback: true 
    };
  }
}

export async function getMarketEmotion() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Assess the current overall market emotion (Fear & Greed index style).
      Return a JSON object with:
      - value: number (0 to 100, where 0 is extreme fear and 100 is extreme greed)
      - label: string (e.g., "Greed", "Fear", "Neutral")
      - summary: string (brief explanation)`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Emotion AI Error:", error);
    return { value: 50, label: "Neutral", summary: "Error connecting to AI service", isFallback: true };
  }
}
