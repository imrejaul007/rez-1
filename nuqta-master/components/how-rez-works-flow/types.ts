export type ScreenId =
    | 'ROOT'
    | 'A1' | 'A2' | 'A3' | 'A4'
    | 'B1' | 'B2' | 'B3' | 'B4'
    | 'C1' | 'C2'
    | 'D1' | 'D2'
    | 'SOCIAL'
    | 'TRUST'
    | 'FINAL';

export interface FlowState {
    currentScreen: ScreenId;
    history: ScreenId[];
}

export type NavigationAction = (nextScreen: ScreenId) => void;
export type BackAction = () => void;
