// Simple mock handlers for testing StoreActionButtons component

export const createSimpleMockHandlers = () => ({
  handleBuyPress: async () => {

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

  },

  handleLockPress: async () => {

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

  },

  handleBookingPress: async () => {

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

  },
});