import React from 'react';
import { Text as KittenText, TextProps } from '@ui-kitten/components';

export interface TrakrTextProps extends TextProps {
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'label';
}

export const Text: React.FC<TrakrTextProps> = ({ 
  variant = 'body',
  category,
  ...props 
}) => {
  // Map variants to UI Kitten categories
  const getTextCategory = () => {
    if (category) return category;
    
    switch (variant) {
      case 'heading':
        return 'h5';
      case 'subheading':
        return 'h6';
      case 'body':
        return 'p1';
      case 'caption':
        return 'c1';
      case 'label':
        return 's1';
      default:
        return 'p1';
    }
  };

  return (
    <KittenText
      category={getTextCategory()}
      {...props}
    />
  );
};
