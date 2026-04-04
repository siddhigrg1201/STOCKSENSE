/**
 * Indian Stocks Service
 * 
 * This service provides functions to fetch real Indian stock data 
 * from the backend API.
 */

export interface IndianStockData {
  symbol: string;
  price: string;
  change: string;
  percentChange: string;
  lastUpdated: string;
}

/**
 * Fetches real-time Indian stock data from the backend.
 * The backend implements a 60-second caching system.
 */
export async function getIndianStocks(): Promise<IndianStockData[]> {
  try {
    const response = await fetch('/api/indian-stocks');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch Indian stocks:", error);
    // Return empty array or throw error based on app needs
    return [];
  }
}

/**
 * Example usage with axios (if preferred):
 * 
 * import axios from 'axios';
 * 
 * export async function getIndianStocksAxios() {
 *   const response = await axios.get('/api/indian-stocks');
 *   return response.data;
 * }
 */
