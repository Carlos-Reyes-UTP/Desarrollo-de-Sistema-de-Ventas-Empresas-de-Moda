import React from "react";

interface BorderBeamProps {
  children: React.ReactNode;
  size?: "line" | "full";
  colorVariant?: "mono" | "color";
  duration?: number;
  strength?: number;
  className?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  size: _size = "line",
  colorVariant = "mono",
  duration = 2.4,
  strength = 0.83,
  className = "",
}) => {
  const color = colorVariant === "mono" ? "rgba(0,0,0,0.8)" : "rgba(59,130,246,0.8)";
  
  return (
    <div className={`relative p-[1px] overflow-hidden rounded-[1.5rem] ${className}`}>
      {/* Beam Animation */}
      <div 
        className="absolute inset-[-100%] z-0"
        style={{
          background: `conic-gradient(from 0deg, transparent 0%, transparent 40%, ${color} 50%, transparent 60%, transparent 100%)`,
          animation: `spin ${duration}s linear infinite`,
          opacity: strength,
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 bg-white rounded-[1.5rem] w-full h-full">
        {children}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
