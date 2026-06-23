declare module 'razorpay' {
  interface Razorpay {
    contacts: {
      create(params: any): Promise<any>;
      fetch(contactId: string): Promise<any>;
      edit(contactId: string, params: any): Promise<any>;
    };
    fundAccounts: {
      create(params: any): Promise<any>;
      fetch(fundAccountId: string): Promise<any>;
    };
    payouts: {
      create(params: any): Promise<any>;
      fetch(payoutId: string): Promise<any>;
      cancel(payoutId: string): Promise<any>;
      all(params?: any): Promise<any>;
    };
    balance: {
      fetch(accountNumber?: string): Promise<any>;
    };
  }
}

export {};
