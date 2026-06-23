import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useGreetingTime } from '@/hooks/useGreeting';
import { TimeOfDay } from '@/types/greeting.types';
import { colors } from '@/constants/theme';

interface TimeDisplayProps {
  showDate?: boolean;
  showTimezone?: boolean;
  showTimeOfDay?: boolean;
  format24Hour?: boolean;
  compact?: boolean;
  onPress?: () => void;
  style?: any;
  timeStyle?: any;
  dateStyle?: any;
  timezoneStyle?: any;
  timeOfDayStyle?: any;
}

function TimeDisplay({
  showDate = true,
  showTimezone = true,
  showTimeOfDay = true,
  format24Hour = false,
  compact = false,
  onPress,
  style,
  timeStyle,
  dateStyle,
  timezoneStyle,
  timeOfDayStyle,
}: TimeDisplayProps) {
  const { currentTime, formattedTime, timeOfDay, getFormattedTime } = useGreetingTime();
  const [displayTime, setDisplayTime] = useState(formattedTime);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = getFormattedTime();
      setDisplayTime(newTime);
    }, 60000);

    return () => clearInterval(interval);
  }, [getFormattedTime]);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getTimeOfDayText = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning':
        return 'Morning';
      case 'afternoon':
        return 'Afternoon';
      case 'evening':
        return 'Evening';
      case 'night':
        return 'Night';
      default:
        return '';
    }
  };

  const getTimeOfDayColor = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning':
        return '#FFA500';
      case 'afternoon':
        return colors.brand.goldBright;
      case 'evening':
        return '#FF6347';
      case 'night':
        return '#4169E1';
      default:
        return colors.darkGray;
    }
  };

  const getTimeOfDayEmoji = (timeOfDay: TimeOfDay) => {
    switch (timeOfDay) {
      case 'morning':
        return '🌅';
      case 'afternoon':
        return '☀️';
      case 'evening':
        return '🌆';
      case 'night':
        return '🌙';
      default:
        return '';
    }
  };

  if (compact) {
    return (
      <Pressable
        style={[styles.compactContainer, style]}
        onPress={onPress}
       
      >
        <Text style={[styles.compactTime, timeStyle]}>
          {displayTime}
        </Text>
        {showTimeOfDay && (
          <Text style={[styles.compactTimeOfDay, timeOfDayStyle, { color: getTimeOfDayColor(timeOfDay) }]}>
            {getTimeOfDayEmoji(timeOfDay)} {getTimeOfDayText(timeOfDay)}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.container, style]}
      onPress={onPress}
     
    >
      <View style={styles.content}>
        {/* Time */}
        <Text style={[styles.time, timeStyle]}>
          {displayTime}
        </Text>

        {/* Date */}
        {showDate && (
          <Text style={[styles.date, dateStyle]}>
            {formatDate(currentTime)}
          </Text>
        )}

        {/* Time of Day */}
        {showTimeOfDay && (
          <View style={styles.timeOfDayRow}>
            <Text style={styles.timeOfDayEmoji}>
              {getTimeOfDayEmoji(timeOfDay)}
            </Text>
            <Text style={[styles.timeOfDayText, timeOfDayStyle, { color: getTimeOfDayColor(timeOfDay) }]}>
              {getTimeOfDayText(timeOfDay)}
            </Text>
          </View>
        )}

        {/* Timezone */}
        {showTimezone && (
          <Text style={[styles.timezone, timezoneStyle]}>
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
  },
  content: {
    alignItems: 'center',
  },
  time: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 4,
  },
  compactTime: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginRight: 8,
  },
  date: {
    fontSize: 16,
    color: colors.midGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeOfDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeOfDayEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  timeOfDayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  compactTimeOfDay: {
    fontSize: 14,
    fontWeight: '500',
  },
  timezone: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
});

// Compact version for small spaces
export function CompactTimeDisplay(props: TimeDisplayProps) {
  return (
    <TimeDisplay
      {...props}
      compact={true}
      showDate={false}
      showTimezone={false}
    />
  );
}

// Full version with all details
export function FullTimeDisplay(props: TimeDisplayProps) {
  return (
    <TimeDisplay
      {...props}
      showDate={true}
      showTimezone={true}
      showTimeOfDay={true}
    />
  );
}

export default React.memo(TimeDisplay);
