
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  // Ajustes de escala refinados para um visual mais profissional e menos exagerado
  // O tamanho 'lg' foi reduzido para se encaixar perfeitamente em cabeçalhos de relatórios A4
  const styles = {
    sm: { 
      fontSize: 'text-sm',
      spacing: 'gap-1'
    },
    md: { 
      fontSize: 'text-lg sm:text-xl',
      spacing: 'gap-2'
    },
    lg: { 
      fontSize: 'text-2xl sm:text-3xl',
      spacing: 'gap-2'
    }
  };

  return (
    <div className={`flex items-center whitespace-nowrap ${styles[size].spacing} ${className}`}>
      <span 
        className={`text-[#EE202E] font-bold uppercase tracking-tight ${styles[size].fontSize}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        TERRAPLANAGEM
      </span>
      <span 
        className={`text-black uppercase tracking-tighter font-black ${styles[size].fontSize}`}
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }}
      >
        BAURU
      </span>
    </div>
  );
};

export default Logo;
