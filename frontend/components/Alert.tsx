import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertProps {
  IconComponent?: React.FC<any>; 
  title: string;
  description: string;
  time?: string;
  severity?: 'warning' | 'critical' | 'info';
  isRead?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
}

const SEVERITY_COLORS = {
  critical: { border: '#D32F2F', bg: '#FFEBEE' },
  warning: { border: '#F57C00', bg: '#FFF3E0' },
  info: { border: '#186F71', bg: '#BDDBE8' },
};

const Alert = ({ 
  IconComponent, 
  title, 
  description, 
  time, 
  severity = 'info',
  isRead = false,
  onPress,
  onDismiss,
}: AlertProps) => {
  const colors = SEVERITY_COLORS[severity];
  
  return (
    <TouchableOpacity 
      style={[
        styles.alertCard, 
        { 
          borderLeftColor: colors.border,
          backgroundColor: colors.bg,
          opacity: isRead ? 0.7 : 1,
        }
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {IconComponent && (
        <View style={styles.alertIconWrapper}>
          <IconComponent width={32} height={32} />
        </View>
      )}
      
      {!IconComponent && (
        <View style={[styles.alertIconWrapper, { backgroundColor: colors.border + '20', borderRadius: 20, padding: 6 }]}>
          <Ionicons 
            name={severity === 'critical' ? 'warning' : severity === 'warning' ? 'alert-circle' : 'information-circle'} 
            size={24} 
            color={colors.border} 
          />
        </View>
      )}

      <View style={styles.alertTextContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.alertTitle, { color: colors.border }]}>{title}</Text>
          {!isRead && <View style={[styles.unreadDot, { backgroundColor: colors.border }]} />}
        </View>
        <Text style={styles.alertDescription}>{description}</Text>
        {time && <Text style={styles.alertTime}>{time}</Text>}
      </View>
      
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color="#666" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default Alert;

const styles = StyleSheet.create({
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#BDDBE8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#186F71',
    elevation: 3,
    shadowColor: '#042f30ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertIconWrapper: {
    marginRight: 12,
    marginTop: 6,
  },
  alertTextContainer: {
    flex: 1, 
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  alertTitle: {
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    flex: 1,
  },
  alertDescription: {
    fontSize: 12,
    fontFamily: 'OpenSans-Regular',
    color: '#186F71',
    lineHeight: 16,
  },
  alertTime: {
    fontSize: 10,
    fontFamily: 'OpenSans-Italic',
    color: '#186F71',
    textAlign: 'right',
    opacity: 0.7,
    marginTop: 4,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});