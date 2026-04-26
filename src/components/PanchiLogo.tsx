import { PANCHI_LOGO_BASE64 } from '@/assets/logoData';

interface PanchiLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
};

export const PanchiLogo = ({
  size = 'md',
  showText = true
}: PanchiLogoProps) => {
  return (
    <div className="flex items-center gap-2">
      <img
        src={PANCHI_LOGO_BASE64}
        alt="Panchi"
        className={`${sizeMap[size]} object-cover rounded-full flex-shrink-0`}
        style={{ mixBlendMode: 'multiply' }}
      />
      {showText && (
        <span className="text-xl font-bold text-amber-700">
          Panchi
        </span>
      )}
    </div>
  );
};

export default PanchiLogo;
