import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_DURATION = 4000;
const TOAST_ANIMATION_DURATION = 300;

export type ToastType = 'climate' | 'market' | 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'warning' | 'info';
  onPress?: () => void;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  index: number;
}

const getToastStyle = (type: ToastType, severity?: string) => {
  switch (type) {
    case 'climate':
      if (severity === 'critical' || severity === 'high') {
        return { bg: '#FEE2E2', border: '#EF4444', icon: 'thunderstorm' as const, iconColor: '#DC2626' };
      }
      if (severity === 'medium') {
        return { bg: '#FEF3C7', border: '#F59E0B', icon: 'cloud' as const, iconColor: '#D97706' };
      }
      return { bg: '#DBEAFE', border: '#3B82F6', icon: 'partly-sunny' as const, iconColor: '#2563EB' };
    case 'market':
      return { bg: '#ECFDF5', border: '#10B981', icon: 'trending-up' as const, iconColor: '#059669' };
    case 'success':
      return { bg: '#ECFDF5', border: '#10B981', icon: 'checkmark-circle' as const, iconColor: '#059669' };
    case 'error':
      return { bg: '#FEE2E2', border: '#EF4444', icon: 'alert-circle' as const, iconColor: '#DC2626' };
    case 'info':
    default:
      return { bg: '#DBEAFE', border: '#3B82F6', icon: 'information-circle' as const, iconColor: '#2563EB' };
  }
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss, index }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const style = getToastStyle(toast.type, toast.severity);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          // Swipe to dismiss
          Animated.timing(translateX, {
            toValue: gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss(toast.id));
        } else {
          // Spring back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: TOAST_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      dismissToast();
    }, TOAST_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismissToast = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: TOAST_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: TOAST_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  const handlePress = () => {
    if (toast.onPress) {
      toast.onPress();
    }
    dismissToast();
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.toastContainer,
        {
          transform: [
            { translateY },
            { translateX },
          ],
          opacity,
          top: 50 + index * 85,
          backgroundColor: style.bg,
          borderLeftColor: style.border,
        },
      ]}
      testID={`toast-${toast.id}`}
    >
      <TouchableOpacity 
        onPress={handlePress} 
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={style.icon} size={24} color={style.iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        </View>
        <TouchableOpacity testID={`toast-close-${toast.id}`} onPress={dismissToast} style={styles.closeButton}>
          <Ionicons name="close" size={18} color="#6B7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Container Component to manage multiple toasts
interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.slice(0, 3).map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          index={index}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'OpenSans-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    fontFamily: 'OpenSans-Regular',
    color: '#4B5563',
    lineHeight: 16,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default Toast;
