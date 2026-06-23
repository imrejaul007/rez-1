import React, { useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutLeft,
    SlideInLeft,
    SlideOutRight
} from 'react-native-reanimated';
import { ScreenId, NavigationAction, BackAction } from './types';

// Screens
import RootScreen from './screens/RootScreen';
// Path A
import DiscoverStoresScreen from './screens/path-a/DiscoverStoresScreen';
import PayInStoreScreen from './screens/path-a/PayInStoreScreen';
import EarnRewardsScreen from './screens/path-a/EarnRewardsScreen';
import UseNextTimeScreen from './screens/path-a/UseNextTimeScreen';
// Path B
import OnlineModeSelectorScreen from './screens/path-b/OnlineModeSelectorScreen';
import RezMallScreen from './screens/path-b/RezMallScreen';
import CashStoreScreen from './screens/path-b/CashStoreScreen';
import ProductLockScreen from './screens/path-b/ProductLockScreen';
// Path C
import OffersHubScreen from './screens/path-c/OffersHubScreen';
import SaveAndEarnScreen from './screens/path-c/SaveAndEarnScreen';
// Path D
import WalletOverviewScreen from './screens/path-d/WalletOverviewScreen';
import TransparencyScreen from './screens/path-d/TransparencyScreen';
// Common
import SocialEarningScreen from './screens/SocialEarningScreen';
import TrustControlScreen from './screens/TrustControlScreen';
// Final
import FinalScreen from './screens/FinalScreen';
import { colors } from '@/constants/theme';

const HowRezWorksFlow: React.FC = () => {
    const [currentScreen, setCurrentScreen] = useState<ScreenId>('ROOT');
    const [history, setHistory] = useState<ScreenId[]>([]);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');

    const navigate: NavigationAction = (nextScreen) => {
        setDirection('forward');
        setHistory((prev) => [...prev, currentScreen]);
        setCurrentScreen(nextScreen);
    };

    const goBack: BackAction = () => {
        if (history.length === 0) {
            // If at root, maybe let the parent handle it or do nothing
            return;
        }
        setDirection('back');
        const newHistory = [...history];
        const prevScreen = newHistory.pop();
        setHistory(newHistory);
        if (prevScreen) {
            setCurrentScreen(prevScreen);
        }
    };

    // Handle hardware back button
    React.useEffect(() => {
        const backAction = () => {
            if (history.length > 0) {
                goBack();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [history]);

    const renderScreen = () => {
        switch (currentScreen) {
            case 'ROOT':
                return <RootScreen onNavigate={navigate} />;

            // Path A
            case 'A1': return <DiscoverStoresScreen onNavigate={navigate} onBack={goBack} />;
            case 'A2': return <PayInStoreScreen onNavigate={navigate} onBack={goBack} />;
            case 'A3': return <EarnRewardsScreen onNavigate={navigate} onBack={goBack} />;
            case 'A4': return <UseNextTimeScreen onNavigate={navigate} onBack={goBack} />;

            // Path B
            case 'B1': return <OnlineModeSelectorScreen onNavigate={navigate} onBack={goBack} />;
            case 'B2': return <RezMallScreen onNavigate={navigate} onBack={goBack} />;
            case 'B3': return <CashStoreScreen onNavigate={navigate} onBack={goBack} />;
            case 'B4': return <ProductLockScreen onNavigate={navigate} onBack={goBack} />;

            // Path C
            case 'C1': return <OffersHubScreen onNavigate={navigate} onBack={goBack} />;
            case 'C2': return <SaveAndEarnScreen onNavigate={navigate} onBack={goBack} />;

            // Path D
            case 'D1': return <WalletOverviewScreen onNavigate={navigate} onBack={goBack} />;
            case 'D2': return <TransparencyScreen onNavigate={navigate} onBack={goBack} />;

            // Common screens
            case 'SOCIAL': return <SocialEarningScreen onNavigate={navigate} onBack={goBack} />;
            case 'TRUST': return <TrustControlScreen onNavigate={navigate} onBack={goBack} />;

            // Final
            case 'FINAL': return <FinalScreen onNavigate={navigate} onBack={goBack} />;

            default:
                return <RootScreen onNavigate={navigate} />;
        }
    };

    return (
        <View style={styles.container}>
            <Animated.View
                key={currentScreen}
                entering={direction === 'forward' ? SlideInRight : SlideInLeft}
                exiting={direction === 'forward' ? SlideOutLeft : SlideOutRight}
                style={styles.screenContainer}
            >
                {renderScreen()}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
        overflow: 'hidden',
    },
    screenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});

export default React.memo(HowRezWorksFlow);
