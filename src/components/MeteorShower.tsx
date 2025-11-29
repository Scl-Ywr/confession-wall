import React from 'react';

interface MeteorShowerProps {
  number?: number;
  className?: string;
}

const MeteorShower: React.FC<MeteorShowerProps> = ({ number = 20, className = '' }) => {
  const [meteors, setMeteors] = React.useState<Array<{ top: string; left: string; delay: string; duration: string }>>([]);

  React.useEffect(() => {
    const newMeteors = new Array(number).fill(true).map(() => ({
      top: Math.floor(Math.random() * 100) + '%',
      left: Math.floor(Math.random() * 100) + '%',
      delay: Math.random() * (0.8 - 0.2) + 0.2 + 's',
      duration: Math.floor(Math.random() * (10 - 2) + 2) + 's',
    }));
    setMeteors(newMeteors);
  }, [number]);
  
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {meteors.map((meteor, idx) => (
        <span
          key={idx}
          className="absolute top-1/2 left-1/2 h-0.5 w-[100px] rounded-[9999px] bg-gradient-to-r from-slate-500 to-transparent shadow-[0_0_0_1px_#ffffff10] rotate-[215deg] animate-meteor opacity-0 dark:from-slate-200"
          style={{
            top: meteor.top,
            left: meteor.left,
            animationDelay: meteor.delay,
            animationDuration: meteor.duration,
          }}
        >
          {/* Meteor Head */}
          <div className="pointer-events-none absolute top-1/2 -z-10 h-[1px] w-[50px] -translate-y-1/2 bg-gradient-to-r from-primary-500 to-transparent" />
        </span>
      ))}
    </div>
  );
};

export default MeteorShower;
