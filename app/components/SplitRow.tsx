import React from 'react';

interface SplitRowProps {
  children: React.ReactNode;
  topColor?: string;
  bottomColor?: string;
  splitAt?: number; // percentage (0-100)
  splitAtMobile?: number; // percentage for mobile (0-100)
  className?: string;
}

const SplitRow: React.FC<SplitRowProps> = ({
  children,
  topColor = '#151B3C',
  bottomColor = '#F3F9FF',
  splitAt = 50,
  splitAtMobile = 60,
  className = ''
}) => {
  const backgroundStyle = {
    background: `linear-gradient(to bottom, ${topColor} 0%, ${topColor} ${splitAt}%, ${bottomColor} ${splitAt}%, ${bottomColor} 100%)`
  };

  const mobileBackgroundStyle = {
    background: `linear-gradient(to bottom, ${topColor} 0%, ${topColor} ${splitAtMobile}%, ${bottomColor} ${splitAtMobile}%, ${bottomColor} 100%)`
  };

  return (
    <section 
      className={`relative ${className}`}
      style={backgroundStyle}
    >
      <style jsx>{`
        @media (max-width: 768px) {
          section {
            background: linear-gradient(to bottom, ${topColor} 0%, ${topColor} ${splitAtMobile}%, ${bottomColor} ${splitAtMobile}%, ${bottomColor} 100%) !important;
          }
        }
      `}</style>
      {children}
    </section>
  );
};

export default SplitRow;
