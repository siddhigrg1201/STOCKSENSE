export const USD_INR_RATE = 83.25;

export const formatCurrency = (amount: number, currency: 'USD' | 'INR', targetMarket: 'GLOBAL' | 'INDIA') => {
  if (targetMarket === 'GLOBAL') {
    if (currency === 'INR') {
      return {
        amount: amount / USD_INR_RATE,
        symbol: '$',
        code: 'USD'
      };
    }
    return {
      amount: amount,
      symbol: '$',
      code: 'USD'
    };
  } else {
    // INDIA market
    if (currency === 'USD') {
      return {
        amount: amount * USD_INR_RATE,
        symbol: '₹',
        code: 'INR'
      };
    }
    return {
      amount: amount,
      symbol: '₹',
      code: 'INR'
    };
  }
};
