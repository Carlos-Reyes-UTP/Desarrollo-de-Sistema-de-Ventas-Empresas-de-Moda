import React from 'react';

interface StandardPageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const StandardPageWrapper: React.FC<StandardPageWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`max-w-5xl mx-auto w-full bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
};

export default StandardPageWrapper;
