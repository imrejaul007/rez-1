/**
 * Maps Indian mobile number prefixes to operator + circle.
 * Used when operator/circle is not provided by the client.
 */

interface TelecomInfo {
  operator: string;
  circle: string;
}

const JIO_PREFIXES = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69'];
const VI_PREFIXES = ['70', '71', '72', '73', '81', '82', '83', '84', '85', '86', '87', '88', '89', '99'];
const AIRTEL_PREFIXES = ['90', '91', '92', '93', '94', '95', '96', '97', '98'];
const BSNL_PREFIXES = ['74', '75', '76', '77', '78', '79'];

export function detectOperator(mobile: string): Partial<TelecomInfo> {
  if (!mobile || mobile.length < 2) {
    return {};
  }

  const prefix2 = mobile.slice(0, 2);

  if (JIO_PREFIXES.includes(prefix2)) {
    return { operator: 'jio' };
  }
  if (VI_PREFIXES.includes(prefix2)) {
    return { operator: 'vi' };
  }
  if (AIRTEL_PREFIXES.includes(prefix2)) {
    return { operator: 'airtel' };
  }
  if (BSNL_PREFIXES.includes(prefix2)) {
    return { operator: 'bsnl' };
  }

  return {};
}

export function validateIndianMobile(mobile: string): boolean {
  return /^[6-9][0-9]{9}$/.test(mobile);
}

export function getCircleFromState(state: string): string {
  const stateToCircle: Record<string, string> = {
    'delhi': 'DL',
    'mumbai': 'MH',
    'maharashtra': 'MH',
    'karnataka': 'KA',
    'bangalore': 'KA',
    'bengaluru': 'KA',
    'tamil nadu': 'TN',
    'andhra pradesh': 'AP',
    'telangana': 'TG',
    'gujarat': 'GJ',
    'rajasthan': 'RJ',
    'punjab': 'PB',
    'haryana': 'HR',
    'uttar pradesh': 'UP',
    'west bengal': 'WB',
    'kerala': 'KL',
    'madhya pradesh': 'MP',
    'bihar': 'BR',
    'odisha': 'OD',
    'uttarakhand': 'UK',
    'himachal pradesh': 'HP',
    'jammu': 'JK',
    'kashmir': 'JK',
    'chhattisgarh': 'CG',
    'assam': 'AS',
  };
  return stateToCircle[state.toLowerCase()] || 'DL';
}

export const telecomUtils = {
  detectOperator,
  validateIndianMobile,
  getCircleFromState,
};

export default telecomUtils;
