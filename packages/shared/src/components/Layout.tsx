import React from 'react';
import { Layout as KittenLayout, LayoutProps } from '@ui-kitten/components';

export interface TrakrLayoutProps extends LayoutProps {
  variant?: 'primary' | 'secondary' | 'background';
}

export const Layout: React.FC<TrakrLayoutProps> = ({ 
  variant = 'primary',
  level,
  ...props 
}) => {
  // Map variants to UI Kitten levels
  const getLayoutLevel = () => {
    if (level) return level;
    
    switch (variant) {
      case 'primary':
        return '1';
      case 'secondary':
        return '2';
      case 'background':
        return '3';
      default:
        return '1';
    }
  };

  return (
    <KittenLayout
      level={getLayoutLevel()}
      {...props}
    />
  );
};
