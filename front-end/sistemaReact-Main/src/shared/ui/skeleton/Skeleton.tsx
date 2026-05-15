import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'dark';
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  default: 'skeleton-shimmer',
  muted: 'skeleton-shimmer-muted',
  dark: 'skeleton-shimmer-dark',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'default',
  ...props
}) => (
  <div
    className={`overflow-hidden rounded-lg ${variantClasses[variant]} ${className}`}
    aria-hidden
    {...props}
  />
);
