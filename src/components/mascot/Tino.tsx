import type { SVGProps } from 'react';

export type TinoState = 'sleepy' | 'attentive' | 'celebrating' | 'streak' | 'encouraging' | 'graduated';

interface TinoProps extends SVGProps<SVGSVGElement> {
  state?: TinoState;
  size?: number;
}

const stateExpressions = {
  sleepy: { eyes: 'M 35 45 Q 40 50 45 45', eyeBrows: 'M 30 35 Q 40 33 50 35' },
  attentive: { eyes: 'M 35 42 L 45 42 M 60 42 L 70 42', eyeBrows: 'M 30 30 L 50 30' },
  celebrating: { eyes: 'M 35 40 Q 40 38 45 40 M 60 40 Q 65 38 70 40', eyeBrows: 'M 30 25 Q 40 20 50 25' },
  streak: { eyes: 'M 35 42 L 45 42 M 60 42 L 70 42', eyeBrows: 'M 30 28 Q 40 25 50 28' },
  encouraging: { eyes: 'M 35 40 Q 40 45 45 40 M 60 40 Q 65 45 70 40', eyeBrows: 'M 30 32 Q 40 30 50 32' },
  graduated: { eyes: 'M 35 42 L 45 42 M 60 42 L 70 42', eyeBrows: 'M 30 28 Q 40 20 50 28' },
};

export function Tino({ state = 'attentive', size = 120, ...props }: TinoProps) {
  const expr = stateExpressions[state];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      className="text-brand-primary"
      {...props}
    >
      {/* Cuerpo redondo (tecolote) */}
      <circle cx="50" cy="65" r="28" fill="currentColor" />

      {/* Cabeza */}
      <circle cx="50" cy="35" r="22" fill="currentColor" />

      {/* Orejas (plumas) */}
      <polygon points="30,15 25,5 35,12" fill="currentColor" />
      <polygon points="70,15 75,5 65,12" fill="currentColor" />

      {/* Ojos blancos */}
      <circle cx="40" cy="30" r="6" fill="white" />
      <circle cx="60" cy="30" r="6" fill="white" />

      {/* Pupilas */}
      <circle cx="40" cy="32" r="3" fill="currentColor" />
      <circle cx="60" cy="32" r="3" fill="currentColor" />

      {/* Cejas (expresión) */}
      <path d={expr.eyeBrows} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Pico */}
      <polygon points="50,40 47,45 53,45" fill="#FBBF24" />

      {/* Patas */}
      <line x1="42" y1="95" x2="40" y2="105" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="58" y1="95" x2="60" y2="105" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Decoración por estado */}
      {state === 'celebrating' && (
        <>
          <circle cx="20" cy="20" r="3" fill="#F97316" opacity="0.8" />
          <circle cx="80" cy="25" r="3" fill="#22C55E" opacity="0.8" />
          <circle cx="25" cy="60" r="2" fill="#38BDF8" opacity="0.7" />
        </>
      )}

      {state === 'streak' && (
        <>
          <line x1="10" y1="50" x2="20" y2="40" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
          <line x1="90" y1="50" x2="80" y2="40" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {state === 'graduated' && (
        <g>
          <rect x="40" y="8" width="20" height="4" fill="#7C3AED" />
          <polygon points="50,12 44,16 56,16" fill="#7C3AED" />
        </g>
      )}
    </svg>
  );
}
