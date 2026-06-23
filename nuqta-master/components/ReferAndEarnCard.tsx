// components/ReferAndEarnCard.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator, Linking } from "react-native";
import { platformAlertSimple } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get("window");

interface ReferData {
  title: string;
  subtitle: string;
  inviteButtonText: string;
  inviteLink: string;
}

interface ReferAndEarnCardProps {
  data?: ReferData;
  onInvite?: (inviteLink: string) => void;
  isLoading?: boolean;
}

const ReferAndEarnCard: React.FC<ReferAndEarnCardProps> = ({
  data: propData,
  onInvite,
  isLoading: propLoading = false
}) => {
  const [data, setData] = useState<ReferData | null>(null);
  const [loading, setLoading] = useState(false);

  // Use dummy data as fallback
  const dummyData: ReferData = {
    title: "Refer and Earn",
    subtitle: "Invite your friends and get free jewellery",
    inviteButtonText: "Invite",
    inviteLink: "https://example.com/invite",
  };

  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(propLoading);
    } else {
      // Use dummy data if no props provided
      setData(dummyData);
      setLoading(false);
    }
  }, [propData, propLoading]);

  const handleInvite = async () => {
    if (data?.inviteLink) {
      if (onInvite) {
        onInvite(data.inviteLink);
      } else {
        try {
          await Linking.openURL(data.inviteLink);
        } catch (error) {
          platformAlertSimple("Error", "Could not open invite link");
        }
      }
    }
  };

  if (loading || propLoading) {
    return (
      <View style={[styles.card, { justifyContent: "center" }]}>
        <ActivityIndicator size="small" color="#8A4DFF" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{data?.title}</Text>
        <Text style={styles.subtitle}>{data?.subtitle}</Text>
      </View>

      <Pressable style={styles.inviteButton} onPress={handleInvite}>
        <Text style={styles.inviteText}>{data?.inviteButtonText}</Text>
      </Pressable>
    </View>
  );
};

export default React.memo(ReferAndEarnCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F3FF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
     width: width * 0.78,
    alignSelf: "center",
    marginTop: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3B1E77",
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: "#8A4DFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
