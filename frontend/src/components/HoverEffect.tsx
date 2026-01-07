import { clsx } from 'clsx';
import { HTMLAttributes, CSSProperties, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HoverEffectProps extends HTMLAttributes<HTMLDivElement> {
  outerClass?: string;
  pClass?: string;
  hoverStyle?: CSSProperties;
  children: React.ReactNode;
  hover?: string;
}

export default function HoverEffect({
  outerClass = '',
  pClass = '',
  hoverStyle = {},
  children,
  hover,
  ...props
}: HoverEffectProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [triggerWidth, setTriggerWidth] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
      setTriggerWidth(Math.max(rect.width * 0.9, 100));
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={triggerRef}
      className={clsx('group relative max-w-full', outerClass)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className={clsx('truncate', pClass)}>{children}</div>
      {isHovered &&
        // hover &&
        createPortal(
          <div
            className="fixed bg-slate-900/80 text-green-100 text-xs px-2 py-1 rounded-md whitespace-wrap text-center -translate-x-1/2 pointer-events-none z-[9999]"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              maxWidth: triggerWidth,
              ...hoverStyle,
            }}
          >
            {hover}
          </div>,
          document.body,
        )}
    </div>
  );
}
