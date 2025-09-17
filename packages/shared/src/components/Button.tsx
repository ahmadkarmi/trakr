import React from 'react';
import { Button as KittenButton, ButtonProps } from '@ui-kitten/components';

export interface TrakrButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export const Button: React.FC<TrakrButtonProps> = ({ 
  variant = 'primary', 
  status,
  appearance,
  ...props 
}) => {
  // Map variants to UI Kitten props
  const getButtonProps = () => {
    switch (variant) {
      case 'primary':
        return { status: 'primary', appearance: 'filled' };
      case 'secondary':
        return { status: 'basic', appearance: 'filled' };
      case 'outline':
        return { status: 'primary', appearance: 'outline' };
      case 'danger':
        return { status: 'danger', appearance: 'filled' };
      default:
        return { status: status || 'primary', appearance: appearance || 'filled' };
    }
  };

  const buttonProps = getButtonProps();

  return (
    <KittenButton
      {...buttonProps}
      {...props}
    />
  );
};
