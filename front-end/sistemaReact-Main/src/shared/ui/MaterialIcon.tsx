import React from 'react';

export interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: string;
  className?: string;
  variant?: 'outlined' | 'rounded' | 'sharp';
  fill?: boolean;
}

export function MaterialIcon({
  icon,
  className = '',
  variant = 'rounded', // rounded style matches modern premium aesthetics
  fill = false,
  ...props
}: MaterialIconProps) {
  const sizeStyle: React.CSSProperties = {};
  
  // Detect standard Tailwind size classes (w-X / h-X)
  const sizeMatch = className.match(/\b[wh]-(\d+)\b/);
  if (sizeMatch) {
    const sizeVal = parseInt(sizeMatch[1]);
    const pxSize = sizeVal * 4; // Tailwind scale is 1 = 4px
    sizeStyle.fontSize = `${pxSize}px`;
    sizeStyle.width = `${pxSize}px`;
    sizeStyle.height = `${pxSize}px`;
  }

  // Detect arbitrary Tailwind size classes (w-[Xpx] / h-[Xpx])
  const arbSizeMatch = className.match(/\b[wh]-\[(\d+)px\]/);
  if (arbSizeMatch) {
    const pxSize = parseInt(arbSizeMatch[1]);
    sizeStyle.fontSize = `${pxSize}px`;
    sizeStyle.width = `${pxSize}px`;
    sizeStyle.height = `${pxSize}px`;
  }

  const fontFamily =
    variant === 'outlined'
      ? '"Material Symbols Outlined"'
      : variant === 'sharp'
        ? '"Material Symbols Sharp"'
        : '"Material Symbols Rounded"';

  const variationSettings = fill ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";

  const iconStyle: React.CSSProperties = {
    fontFamily,
    fontWeight: 'normal',
    fontVariationSettings: variationSettings,
    lineHeight: 1,
    ...sizeStyle,
  };

  // Clean Tailwind sizing classes so they do not conflict with our dynamic inline sizing
  const cleanClassName = className
    .replace(/\b[wh]-(\d+)\b/g, '')
    .replace(/\b[wh]-\[(\d+)px\]/g, '')
    .trim();

  return (
    <span
      className={`material-symbols-${variant} select-none inline-flex items-center justify-center shrink-0 font-normal leading-none ${cleanClassName}`}
      style={iconStyle}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    >
      {icon}
    </span>
  );
}

export default MaterialIcon;
