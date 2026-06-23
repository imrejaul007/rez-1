/**
 * Simple i18n utility for backend responses
 * Supports: en (English), hi (Hindi), ta (Tamil), te (Telugu), kn (Kannada), ar (Arabic)
 * Usage: t('order_confirmed', 'hi') -> "आपका ऑर्डर कन्फर्म हो गया"
 */

type Locale = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ar';

const translations: Record<string, Record<Locale, string>> = {
  // Order notifications
  'order_confirmed': {
    en: 'Your order has been confirmed',
    hi: 'आपका ऑर्डर कन्फर्म हो गया',
    ta: 'உங்கள் ஆர்டர் உறுதிப்படுத்தப்பட்டது',
    te: 'మీ ఆర్డర్ నిర్ధారించబడింది',
    kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ',
    ar: 'تم تأكيد طلبك',
  },
  'order_preparing': {
    en: 'Your order is being prepared',
    hi: 'आपका ऑर्डर तैयार किया जा रहा है',
    ta: 'உங்கள் ஆர்டர் தயாரிக்கப்படுகிறது',
    te: 'మీ ఆర్డర్ తయారు చేయబడుతోంది',
    kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ತಯಾರಿಸಲಾಗುತ್ತಿದೆ',
    ar: 'جاري تحضير طلبك',
  },
  'order_ready': {
    en: 'Your order is ready for pickup',
    hi: 'आपका ऑर्डर पिकअप के लिए तैयार है',
    ta: 'உங்கள் ஆர்டர் பிக்அப்புக்கு தயாராக உள்ளது',
    te: 'మీ ఆర్డర్ పికప్‌కి సిద్ధంగా ఉంది',
    kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ಪಿಕಪ್‌ಗೆ ಸಿದ್ಧವಾಗಿದೆ',
    ar: 'طلبك جاهز للاستلام',
  },
  'order_delivered': {
    en: 'Your order has been delivered',
    hi: 'आपका ऑर्डर डिलीवर हो गया',
    ta: 'உங்கள் ஆர்டர் டெலிவரி செய்யப்பட்டது',
    te: 'మీ ఆర్డర్ డెలివరీ చేయబడింది',
    kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ವಿತರಿಸಲಾಗಿದೆ',
    ar: 'تم توصيل طلبك',
  },
  'order_cancelled': {
    en: 'Your order has been cancelled',
    hi: 'आपका ऑर्डर रद्द कर दिया गया',
    ta: 'உங்கள் ஆர்டர் ரத்து செய்யப்பட்டது',
    te: 'మీ ఆర్డర్ రద్దు చేయబడింది',
    kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ರದ್ದಾಗಿದೆ',
    ar: 'تم إلغاء طلبك',
  },
  // Payment notifications
  'payment_success': {
    en: 'Payment successful',
    hi: 'भुगतान सफल',
    ta: 'பணம் செலுத்தப்பட்டது',
    te: 'చెల్లింపు విజయవంతం',
    kn: 'ಪಾವತಿ ಯಶಸ್ವಿ',
    ar: 'تمت عملية الدفع بنجاح',
  },
  'payment_failed': {
    en: 'Payment failed. Please try again',
    hi: 'भुगतान विफल। कृपया पुनः प्रयास करें',
    ta: 'பணம் செலுத்துதல் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்',
    te: 'చెల్లింపు విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి',
    kn: 'ಪಾವತಿ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    ar: 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى',
  },
  'payment_refunded': {
    en: 'Your payment has been refunded',
    hi: 'आपका भुगतान वापस कर दिया गया',
    ta: 'உங்கள் பணம் திரும்ப வழங்கப்பட்டது',
    te: 'మీ చెల్లింపు తిరిగి ఇవ్వబడింది',
    kn: 'ನಿಮ್ಮ ಪಾವತಿ ಮರುಪಾವತಿ ಮಾಡಲಾಗಿದೆ',
    ar: 'تم استرداد المبلغ المدفوع',
  },
  // Coins
  'coins_earned': {
    en: 'You earned {amount} coins!',
    hi: 'आपने {amount} सिक्के कमाए!',
    ta: 'நீங்கள் {amount} நாணயங்களைப் பெற்றீர்கள்!',
    te: 'మీరు {amount} నాణేలు సంపాదించారు!',
    kn: 'ನೀವು {amount} ನಾಣ್ಯಗಳನ್ನು ಗಳಿಸಿದ್ದೀರಿ!',
    ar: 'لقد ربحت {amount} عملات!',
  },
  'coins_deducted': {
    en: '{amount} coins have been deducted',
    hi: '{amount} सिक्के काटे गए',
    ta: '{amount} நாணயங்கள் கழிக்கப்பட்டன',
    te: '{amount} నాణేలు తీసివేయబడ్డాయి',
    kn: '{amount} ನಾಣ್ಯಗಳನ್ನು ಕಡಿತಗೊಳಿಸಲಾಗಿದೆ',
    ar: 'تم خصم {amount} عملات',
  },
  'coins_transferred': {
    en: 'You transferred {amount} coins to {recipient}',
    hi: 'आपने {recipient} को {amount} सिक्के भेजे',
    ta: 'நீங்கள் {recipient} க்கு {amount} நாணயங்களை மாற்றினீர்கள்',
    te: 'మీరు {recipient} కు {amount} నాణేలు బదిలీ చేశారు',
    kn: 'ನೀವು {recipient} ಗೆ {amount} ನಾಣ್ಯಗಳನ್ನು ವರ್ಗಾಯಿಸಿದ್ದೀರಿ',
    ar: 'لقد حولت {amount} عملات إلى {recipient}',
  },
  // General
  'welcome': {
    en: 'Welcome to {appName}',
    hi: '{appName} में आपका स्वागत है',
    ta: '{appName} க்கு வரவேற்கிறோம்',
    te: '{appName} కి స్వాగతం',
    kn: '{appName} ಗೆ ಸ್ವಾಗತ',
    ar: 'مرحباً بك في {appName}',
  },
  'otp_message': {
    en: 'Your {appName} OTP is {otp}. Valid for {minutes} minutes.',
    hi: 'आपका {appName} OTP {otp} है। {minutes} मिनट के लिए मान्य।',
    ta: 'உங்கள் {appName} OTP {otp}. {minutes} நிமிடங்களுக்கு செல்லுபடியாகும்.',
    te: 'మీ {appName} OTP {otp}. {minutes} నిమిషాలు చెల్లుబాటు అవుతుంది.',
    kn: 'ನಿಮ್ಮ {appName} OTP {otp}. {minutes} ನಿಮಿಷಗಳವರೆಗೆ ಮಾನ್ಯ.',
    ar: 'رمز {appName} الخاص بك هو {otp}. صالح لمدة {minutes} دقائق.',
  },
  // Wallet
  'wallet_credited': {
    en: '{amount} coins credited to your wallet',
    hi: 'आपके वॉलेट में {amount} सिक्के जमा हुए',
    ta: 'உங்கள் வாலட்டில் {amount} நாணயங்கள் சேர்க்கப்பட்டன',
    te: 'మీ వాలెట్‌లో {amount} నాణేలు జమ అయ్యాయి',
    kn: 'ನಿಮ್ಮ ವ್ಯಾಲೆಟ್‌ಗೆ {amount} ನಾಣ್ಯಗಳು ಕ್ರೆಡಿಟ್ ಆಗಿವೆ',
    ar: 'تمت إضافة {amount} عملات إلى محفظتك',
  },
  'wallet_frozen': {
    en: 'Your wallet has been temporarily frozen',
    hi: 'आपका वॉलेट अस्थायी रूप से फ्रीज कर दिया गया है',
    ta: 'உங்கள் வாலட் தற்காலிகமாக முடக்கப்பட்டுள்ளது',
    te: 'మీ వాలెట్ తాత్కాలికంగా ఫ్రీజ్ చేయబడింది',
    kn: 'ನಿಮ್ಮ ವ್ಯಾಲೆಟ್ ತಾತ್ಕಾಲಿಕವಾಗಿ ಫ್ರೀಜ್ ಮಾಡಲಾಗಿದೆ',
    ar: 'تم تجميد محفظتك مؤقتاً',
  },
  // Promotions
  'promo_coins_expiring': {
    en: 'Your {amount} promo coins expire in {days} days',
    hi: 'आपके {amount} प्रोमो सिक्के {days} दिनों में समाप्त हो रहे हैं',
    ta: 'உங்கள் {amount} ப்ரோமோ நாணயங்கள் {days} நாட்களில் காலாவதியாகின்றன',
    te: 'మీ {amount} ప్రోమో నాణేలు {days} రోజుల్లో గడువు ముగుస్తాయి',
    kn: 'ನಿಮ್ಮ {amount} ಪ್ರೋಮೋ ನಾಣ್ಯಗಳು {days} ದಿನಗಳಲ್ಲಿ ಮುಗಿದುಹೋಗುತ್ತವೆ',
    ar: 'ستنتهي صلاحية {amount} عملات ترويجية خلال {days} أيام',
  },
  // Referral
  'referral_success': {
    en: 'Your friend {name} joined! You both earned {amount} coins',
    hi: 'आपका दोस्त {name} शामिल हुआ! आप दोनों ने {amount} सिक्के कमाए',
    ta: 'உங்கள் நண்பர் {name} சேர்ந்தார்! நீங்கள் இருவரும் {amount} நாணயங்கள் பெற்றீர்கள்',
    te: 'మీ స్నేహితుడు {name} చేరారు! మీరిద్దరూ {amount} నాణేలు సంపాదించారు',
    kn: 'ನಿಮ್ಮ ಸ್ನೇಹಿತ {name} ಸೇರಿದ್ದಾರೆ! ನೀವಿಬ್ಬರೂ {amount} ನಾಣ್ಯಗಳನ್ನು ಗಳಿಸಿದ್ದೀರಿ',
    ar: 'انضم صديقك {name}! كلاكما حصل على {amount} عملات',
  },
  // Reviews
  'review_approved': {
    en: 'Your review has been approved. You earned {amount} coins!',
    hi: 'आपकी समीक्षा स्वीकृत हो गई। आपने {amount} सिक्के कमाए!',
    ta: 'உங்கள் மதிப்பாய்வு அங்கீகரிக்கப்பட்டது. நீங்கள் {amount} நாணயங்கள் பெற்றீர்கள்!',
    te: 'మీ సమీక్ష ఆమోదించబడింది. మీరు {amount} నాణేలు సంపాదించారు!',
    kn: 'ನಿಮ್ಮ ವಿಮರ್ಶೆ ಅನುಮೋದಿಸಲಾಗಿದೆ. ನೀವು {amount} ನಾಣ್ಯಗಳನ್ನು ಗಳಿಸಿದ್ದೀರಿ!',
    ar: 'تمت الموافقة على مراجعتك. لقد ربحت {amount} عملات!',
  },
  // Subscription
  'subscription_activated': {
    en: 'Your {tier} subscription is now active',
    hi: 'आपकी {tier} सदस्यता अब सक्रिय है',
    ta: 'உங்கள் {tier} சந்தா இப்போது செயலில் உள்ளது',
    te: 'మీ {tier} సభ్యత్వం ఇప్పుడు యాక్టివ్ అయింది',
    kn: 'ನಿಮ್ಮ {tier} ಚಂದಾದಾರಿಕೆ ಈಗ ಸಕ್ರಿಯವಾಗಿದೆ',
    ar: 'اشتراكك في {tier} نشط الآن',
  },
  'subscription_expiring': {
    en: 'Your {tier} subscription expires in {days} days',
    hi: 'आपकी {tier} सदस्यता {days} दिनों में समाप्त हो रही है',
    ta: 'உங்கள் {tier} சந்தா {days} நாட்களில் காலாவதியாகிறது',
    te: 'మీ {tier} సభ్యత్వం {days} రోజుల్లో ముగుస్తుంది',
    kn: 'ನಿಮ್ಮ {tier} ಚಂದಾದಾರಿಕೆ {days} ದಿನಗಳಲ್ಲಿ ಮುಗಿದುಹೋಗುತ್ತದೆ',
    ar: 'ينتهي اشتراكك في {tier} خلال {days} أيام',
  },
};

/**
 * Translate a key to the specified locale with optional parameter interpolation.
 * Falls back to English if translation is missing, returns the key if not found.
 */
export function t(key: string, locale: Locale = 'en', params?: Record<string, string | number>): string {
  const template = translations[key]?.[locale] || translations[key]?.['en'] || key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}

/**
 * Extract the preferred locale from the request's Accept-Language header.
 * Returns a supported Locale, defaulting to 'en'.
 */
export function getLocaleFromRequest(req: { headers?: Record<string, string | undefined> }): Locale {
  const lang = req.headers?.['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
  const supported: Locale[] = ['en', 'hi', 'ta', 'te', 'kn', 'ar'];
  return supported.includes(lang as Locale) ? (lang as Locale) : 'en';
}

/**
 * Check if a locale is supported.
 */
export function isLocaleSupported(locale: string): locale is Locale {
  return ['en', 'hi', 'ta', 'te', 'kn', 'ar'].includes(locale);
}

/**
 * Get all supported locales.
 */
export function getSupportedLocales(): Locale[] {
  return ['en', 'hi', 'ta', 'te', 'kn', 'ar'];
}

/**
 * Get all available translation keys.
 */
export function getTranslationKeys(): string[] {
  return Object.keys(translations);
}

export type { Locale };
