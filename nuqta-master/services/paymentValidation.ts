// Payment Validation Service
// Handles validation for payment-related data

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PaymentValidator {
  /**
   * Validate UPI ID format
   */
  static validateUPIId(upiId: string): ValidationResult {
    const errors: string[] = [];
    
    if (!upiId || upiId.trim().length === 0) {
      errors.push('UPI ID is required');
      return { isValid: false, errors };
    }

    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    if (!upiRegex.test(upiId.trim())) {
      errors.push('Please enter a valid UPI ID (e.g., user@paytm)');
    }

    if (upiId.length > 100) {
      errors.push('UPI ID is too long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate card number using Luhn algorithm
   */
  static validateCardNumber(cardNumber: string): ValidationResult {
    const errors: string[] = [];
    
    if (!cardNumber || cardNumber.trim().length === 0) {
      errors.push('Card number is required');
      return { isValid: false, errors };
    }

    // Remove all non-digit characters
    const number = cardNumber.replace(/\D/g, '');
    
    if (number.length < 13 || number.length > 19) {
      errors.push('Card number must be between 13 and 19 digits');
      return { isValid: false, errors };
    }

    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      errors.push('Invalid card number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate card expiry date
   */
  static validateCardExpiry(expiry: string): ValidationResult {
    const errors: string[] = [];
    
    if (!expiry || expiry.trim().length === 0) {
      errors.push('Expiry date is required');
      return { isValid: false, errors };
    }

    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryRegex.test(expiry.trim())) {
      errors.push('Please enter expiry date in MM/YY format');
      return { isValid: false, errors };
    }

    const [month, year] = expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    const expiryYear = parseInt(year);
    const expiryMonth = parseInt(month);

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      errors.push('Card has expired');
    }

    if (expiryYear > currentYear + 20) {
      errors.push('Invalid expiry year');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate CVV
   */
  static validateCVV(cvv: string, cardType?: string): ValidationResult {
    const errors: string[] = [];
    
    if (!cvv || cvv.trim().length === 0) {
      errors.push('CVV is required');
      return { isValid: false, errors };
    }

    const cvvNumber = cvv.replace(/\D/g, '');
    
    if (cardType === 'amex') {
      if (cvvNumber.length !== 4) {
        errors.push('CVV must be 4 digits for American Express');
      }
    } else {
      if (cvvNumber.length !== 3) {
        errors.push('CVV must be 3 digits');
      }
    }

    if (!/^\d+$/.test(cvvNumber)) {
      errors.push('CVV must contain only numbers');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate cardholder name
   */
  static validateCardholderName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || name.trim().length === 0) {
      errors.push('Cardholder name is required');
      return { isValid: false, errors };
    }

    if (name.trim().length < 2) {
      errors.push('Cardholder name must be at least 2 characters');
    }

    if (name.trim().length > 50) {
      errors.push('Cardholder name is too long');
    }

    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      errors.push('Cardholder name can only contain letters and spaces');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment amount
   */
  static validateAmount(amount: number): ValidationResult {
    const errors: string[] = [];
    
    if (!amount || isNaN(amount)) {
      errors.push('Amount is required');
      return { isValid: false, errors };
    }

    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (amount < 1) {
      errors.push('Minimum amount is ₹1');
    }

    if (amount > 100000) {
      errors.push('Maximum amount is ₹1,00,000');
    }

    // Check for decimal places (max 2)
    if (amount % 1 !== 0 && amount.toString().split('.')[1]?.length > 2) {
      errors.push('Amount can have maximum 2 decimal places');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment method
   */
  static validatePaymentMethod(method: string): ValidationResult {
    const errors: string[] = [];
    
    if (!method || method.trim().length === 0) {
      errors.push('Payment method is required');
      return { isValid: false, errors };
    }

    const validMethods = ['upi', 'card', 'wallet', 'netbanking'];
    if (!validMethods.includes(method.toLowerCase())) {
      errors.push('Invalid payment method');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate bank code for net banking
   */
  static validateBankCode(bankCode: string): ValidationResult {
    const errors: string[] = [];
    
    if (!bankCode || bankCode.trim().length === 0) {
      errors.push('Bank selection is required');
      return { isValid: false, errors };
    }

    const validBanks = ['SBIN', 'HDFC', 'ICICI', 'AXIS'];
    if (!validBanks.includes(bankCode.toUpperCase())) {
      errors.push('Invalid bank selection');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate wallet type
   */
  static validateWalletType(walletType: string): ValidationResult {
    const errors: string[] = [];
    
    if (!walletType || walletType.trim().length === 0) {
      errors.push('Wallet type is required');
      return { isValid: false, errors };
    }

    const validWallets = ['paytm', 'phonepe', 'gpay', 'amazonpay'];
    if (!validWallets.includes(walletType.toLowerCase())) {
      errors.push('Invalid wallet type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete card details
   */
  static validateCardDetails(cardDetails: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
  }): ValidationResult {
    const errors: string[] = [];

    // Validate each field
    const numberValidation = this.validateCardNumber(cardDetails.number);
    const expiryValidation = this.validateCardExpiry(cardDetails.expiry);
    const cvvValidation = this.validateCVV(cardDetails.cvv);
    const nameValidation = this.validateCardholderName(cardDetails.name);

    errors.push(...numberValidation.errors);
    errors.push(...expiryValidation.errors);
    errors.push(...cvvValidation.errors);
    errors.push(...nameValidation.errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect card type from card number
   */
  static detectCardType(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';
    if (number.startsWith('6')) return 'discover';
    
    return 'unknown';
  }

  /**
   * Format card number for display
   */
  static formatCardNumber(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /**
   * Format expiry date
   */
  static formatExpiryDate(expiry: string): string {
    const numbers = expiry.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.replace(/(\d{2})(\d{2})/, '$1/$2');
    }
    return numbers;
  }
}

export default PaymentValidator;
