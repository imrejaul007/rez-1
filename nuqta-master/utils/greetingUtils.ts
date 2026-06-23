import {
  GreetingData,
  TimeOfDay,
  GreetingConfig,
  GreetingVariations,
  TimeBasedGreeting,
  GreetingTemplates,
} from '@/types/greeting.types';

// Greeting templates for different languages
const GREETING_TEMPLATES: GreetingTemplates = {
  en: {
    morning: {
      messages: [
        'Good morning',
        'Rise and shine',
        'Morning sunshine',
        'Start your day right',
        'Good morning, beautiful day ahead',
      ],
      emojis: ['🌅', '☀️', '🌞', '🌄', '🌻'],
    },
    afternoon: {
      messages: [
        'Good afternoon',
        'Hope you\'re having a great day',
        'Afternoon vibes',
        'Keep up the great work',
        'Good afternoon, stay productive',
      ],
      emojis: ['☀️', '🌤️', '😊', '💪', '🌟'],
    },
    evening: {
      messages: [
        'Good evening',
        'Evening greetings',
        'Hope you had a wonderful day',
        'Good evening, time to unwind',
        'Evening blessings',
      ],
      emojis: ['🌆', '🌅', '🌇', '✨', '🌙'],
    },
    night: {
      messages: [
        'Good night',
        'Sweet dreams',
        'Sleep well',
        'Good night, rest well',
        'Night time blessings',
      ],
      emojis: ['🌙', '⭐', '🌠', '💤', '🌌'],
    },
  },
  hi: {
    morning: {
      messages: [
        'सुप्रभात',
        'सुबह की शुभकामनाएं',
        'अच्छी सुबह',
        'सुबह का आशीर्वाद',
      ],
      emojis: ['🌅', '☀️', '🌞', '🌄'],
    },
    afternoon: {
      messages: [
        'नमस्कार',
        'दोपहर की शुभकामनाएं',
        'अच्छी दोपहर',
        'दोपहर का आशीर्वाद',
      ],
      emojis: ['☀️', '🌤️', '😊', '💪'],
    },
    evening: {
      messages: [
        'शुभ संध्या',
        'शाम की शुभकामनाएं',
        'अच्छी शाम',
        'शाम का आशीर्वाद',
      ],
      emojis: ['🌆', '🌅', '🌇', '✨'],
    },
    night: {
      messages: [
        'शुभ रात्रि',
        'सुखद सपने',
        'अच्छी रात',
        'रात का आशीर्वाद',
      ],
      emojis: ['🌙', '⭐', '🌠', '💤'],
    },
  },
  te: {
    morning: {
      messages: [
        'శుభోదయం',
        'మంచి ఉదయం',
        'ఉదయం శుభాకాంక్షలు',
      ],
      emojis: ['🌅', '☀️', '🌞'],
    },
    afternoon: {
      messages: [
        'మంచి మధ్యాహ్నం',
        'మధ్యాహ్నం శుభాకాంక్షలు',
        'అఫ్టర్నూన్ గ్రీటింగ్స్',
      ],
      emojis: ['☀️', '🌤️', '😊'],
    },
    evening: {
      messages: [
        'శుభ సాయంత్రం',
        'మంచి సాయంత్రం',
        'సాయంత్రం శుభాకాంక్షలు',
      ],
      emojis: ['🌆', '🌅', '🌇'],
    },
    night: {
      messages: [
        'శుభ రాత్రి',
        'మంచి రాత్రి',
        'రాత్రి శుభాకాంక్షలు',
      ],
      emojis: ['🌙', '⭐', '🌠'],
    },
  },
  ta: {
    morning: {
      messages: [
        'காலை வணக்கம்',
        'நல்ல காலை',
        'காலை ஆசீர்வாதம்',
      ],
      emojis: ['🌅', '☀️', '🌞'],
    },
    afternoon: {
      messages: [
        'மதிய வணக்கம்',
        'நல்ல மதியம்',
        'மதிய ஆசீர்வாதம்',
      ],
      emojis: ['☀️', '🌤️', '😊'],
    },
    evening: {
      messages: [
        'மாலை வணக்கம்',
        'நல்ல மாலை',
        'மாலை ஆசீர்வாதம்',
      ],
      emojis: ['🌆', '🌅', '🌇'],
    },
    night: {
      messages: [
        'இரவு வணக்கம்',
        'நல்ல இரவு',
        'இரவு ஆசீர்வாதம்',
      ],
      emojis: ['🌙', '⭐', '🌠'],
    },
  },
  bn: {
    morning: {
      messages: [
        'সুপ্রভাত',
        'ভালো সকাল',
        'সকালের শুভেচ্ছা',
      ],
      emojis: ['🌅', '☀️', '🌞'],
    },
    afternoon: {
      messages: [
        'শুভ দুপুর',
        'ভালো দুপুর',
        'দুপুরের শুভেচ্ছা',
      ],
      emojis: ['☀️', '🌤️', '😊'],
    },
    evening: {
      messages: [
        'শুভ সন্ধ্যা',
        'ভালো সন্ধ্যা',
        'সন্ধ্যার শুভেচ্ছা',
      ],
      emojis: ['🌆', '🌅', '🌇'],
    },
    night: {
      messages: [
        'শুভ রাত্রি',
        'ভালো রাত',
        'রাতের শুভেচ্ছা',
      ],
      emojis: ['🌙', '⭐', '🌠'],
    },
  },
};

/**
 * Get time of day based on hour
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Get time of day from date
 */
export function getTimeOfDayFromDate(date: Date): TimeOfDay {
  const hour = date.getHours();
  return getTimeOfDay(hour);
}

/**
 * Get random greeting message for time of day
 */
export function getRandomGreetingMessage(
  timeOfDay: TimeOfDay,
  language: string = 'en'
): string {
  const templates = GREETING_TEMPLATES[language as keyof GreetingTemplates] || GREETING_TEMPLATES.en;
  const messages = templates[timeOfDay].messages;
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/**
 * Get random emoji for time of day
 */
export function getRandomEmoji(
  timeOfDay: TimeOfDay,
  language: string = 'en'
): string {
  const templates = GREETING_TEMPLATES[language as keyof GreetingTemplates] || GREETING_TEMPLATES.en;
  const emojis = templates[timeOfDay].emojis;
  const randomIndex = Math.floor(Math.random() * emojis.length);
  return emojis[randomIndex];
}

/**
 * Create personalized greeting message
 */
export function createPersonalizedGreeting(
  baseMessage: string,
  userName?: string,
  location?: string
): string {
  let personalizedMessage = baseMessage;
  
  if (userName) {
    personalizedMessage += `, ${userName}`;
  }
  
  if (location) {
    personalizedMessage += ` from ${location}`;
  }
  
  return personalizedMessage + '!';
}

/**
 * Get greeting data for specific time and configuration
 */
export function getGreetingForTime(
  date: Date,
  config: GreetingConfig = {}
): GreetingData {
  const {
    userName,
    timezone = 'Asia/Kolkata',
    language = 'en',
    includeEmoji = true,
    personalized = true,
  } = config;

  // Convert to local time if timezone is provided
  const localTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const timeOfDay = getTimeOfDayFromDate(localTime);
  
  const baseMessage = getRandomGreetingMessage(timeOfDay, language);
  const emoji = includeEmoji ? getRandomEmoji(timeOfDay, language) : '';
  
  let personalizedMessage = baseMessage;
  if (personalized && userName) {
    personalizedMessage = createPersonalizedGreeting(baseMessage, userName);
  }

  return {
    message: baseMessage,
    timeOfDay,
    emoji,
    personalizedMessage,
    timezone,
    localTime,
  };
}

/**
 * Get current greeting data
 */
export function getCurrentGreeting(config: GreetingConfig = {}): GreetingData {
  return getGreetingForTime(new Date(), config);
}

/**
 * Get greeting variations for all times of day
 */
export function getAllGreetingVariations(
  language: string = 'en',
  userName?: string
): TimeBasedGreeting[] {
  const timesOfDay: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];
  
  return timesOfDay.map(timeOfDay => {
    const baseMessage = getRandomGreetingMessage(timeOfDay, language);
    const emoji = getRandomEmoji(timeOfDay, language);
    const personalizedMessage = userName 
      ? createPersonalizedGreeting(baseMessage, userName)
      : baseMessage;

    return {
      timeOfDay,
      message: baseMessage,
      emoji,
      personalizedMessage,
    };
  });
}

/**
 * Format time for display
 */
export function formatTimeForDisplay(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  if (timezone) {
    return date.toLocaleTimeString('en-US', { ...options, timeZone: timezone });
  }

  return date.toLocaleTimeString('en-US', options);
}

/**
 * Get time-based greeting with location context
 */
export function getGreetingWithLocation(
  date: Date,
  config: GreetingConfig & { location?: string } = {}
): GreetingData {
  const greeting = getGreetingForTime(date, config);
  
  if (config.location && config.personalized) {
    greeting.personalizedMessage = createPersonalizedGreeting(
      greeting.message,
      config.userName,
      config.location
    );
  }

  return greeting;
}

/**
 * Check if it's a special time (like birthday, festival, etc.)
 */
export function isSpecialTime(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  
  // Add special dates here
  const specialDates = [
    { month: 0, day: 1 }, // New Year
    { month: 11, day: 25 }, // Christmas
    // Add more special dates as needed
  ];

  return specialDates.some(special => special.month === month && special.day === day);
}

/**
 * Get special greeting for special times
 */
export function getSpecialGreeting(date: Date, userName?: string): string {
  const month = date.getMonth();
  const day = date.getDate();
  
  if (month === 0 && day === 1) {
    return userName ? `Happy New Year, ${userName}! 🎉` : 'Happy New Year! 🎉';
  }
  
  if (month === 11 && day === 25) {
    return userName ? `Merry Christmas, ${userName}! 🎄` : 'Merry Christmas! 🎄';
  }
  
  return '';
}

/**
 * Get greeting with special time consideration
 */
export function getSmartGreeting(
  date: Date,
  config: GreetingConfig = {}
): GreetingData {
  // Check for special times first
  if (isSpecialTime(date)) {
    const specialMessage = getSpecialGreeting(date, config.userName);
    if (specialMessage) {
      return {
        message: specialMessage,
        timeOfDay: getTimeOfDayFromDate(date),
        emoji: '🎉',
        personalizedMessage: specialMessage,
        timezone: config.timezone || 'Asia/Kolkata',
        localTime: date,
      };
    }
  }

  // Return regular greeting
  return getGreetingForTime(date, config);
}
