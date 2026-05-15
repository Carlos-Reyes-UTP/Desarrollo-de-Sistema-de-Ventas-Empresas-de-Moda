import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'dark';
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  default: 'bg-gray-200',
  muted: 'bg-gray-100',
  dark: 'bg-white/10',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'default',
  ...props
}) => (
  <div
    className={`animate-pulse rounded-lg ${variantClasses[variant]} ${className}`}
    aria-hidden
    {...props}
  />
);
