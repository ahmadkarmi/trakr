import React from 'react';
import { Card as KittenCard, CardProps } from '@ui-kitten/components';

export interface TrakrCardProps extends CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<TrakrCardProps> = ({ 
  variant = 'default',
  ...props 
}) => {
  return (
    <KittenCard
      {...props}
    />
  );
};
