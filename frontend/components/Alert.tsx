import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AlertProps {
  IconComponent: React.FC<any>; 
  title: string;
  description: string;
  time?: string; 
}

const Alert = ({ IconComponent, title, description, time }: AlertProps) => {
  return (
    <View style={styles.alertCard}>
      <View style={styles.alertIconWrapper}>
        <IconComponent width={32} height={32} />
      </View>

      <View style={styles.alertTextContainer}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertDescription}>{description}</Text>
        
        {time && <Text style={styles.alertTime}>{time}</Text>}
      </View>
    </View>
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
    borderLeftWidth: 3,
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
  alertTitle: {
    fontSize: 12,
    fontFamily: 'OpenSans-Bold',
    color: '#186F71',
    marginBottom: 4,
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
  },
});