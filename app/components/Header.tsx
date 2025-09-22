import React from 'react';

interface HeaderProps {
  onAboutClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAboutClick }) => {
  return (
    <div 
      style={{ 
        backgroundColor: '#151B3C',
        width: '100%',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}
    >
      <div style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={onAboutClick}
          style={{ 
            fontFamily: 'Manrope, sans-serif', 
            backgroundColor: '#2e5ce5',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            minWidth: '100px'
          }}
        >
          about
        </button>
      </div>
    </div>
  );
};

export default Header;
