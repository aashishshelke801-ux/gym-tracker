import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface ExerciseImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: '4/3' | 'square' | '16/9' | 'auto';
  objectFit?: 'cover' | 'contain';
  fallbackIconSize?: number;
  showFallbackLabel?: boolean;
}

export default function ExerciseImage({
  src,
  alt,
  className = '',
  aspectRatio = '4/3',
  objectFit = 'cover',
  fallbackIconSize = 24,
  showFallbackLabel = false,
}: ExerciseImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if src is a real image path or data URL
  const isValidUrl =
    Boolean(src) &&
    typeof src === 'string' &&
    (src.startsWith('/') ||
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:image/'));

  const aspectClass =
    aspectRatio === '4/3'
      ? 'aspect-[4/3]'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === '16/9'
      ? 'aspect-video'
      : '';

  if (!isValidUrl || hasError) {
    return (
      <div
        className={`w-full ${aspectClass} bg-gradient-to-br from-[#1c1c1c] to-[#121212] border border-[#2a2a2a] flex flex-col items-center justify-center text-center p-3 text-[#777777] select-none ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-[#252525] flex items-center justify-center mb-1 text-[#888888] shadow-inner">
          <Dumbbell size={fallbackIconSize} strokeWidth={1.75} />
        </div>
        {showFallbackLabel && (
          <span className="text-[11px] font-medium line-clamp-1 text-[#aaaaaa] px-1 max-w-full">
            {alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden bg-[#141414] ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#1c1c1c] animate-pulse flex items-center justify-center text-[#555]">
          <Dumbbell size={fallbackIconSize} strokeWidth={1.5} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
      />
    </div>
  );
}
