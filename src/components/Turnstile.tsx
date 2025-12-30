'use client';

import { Turnstile as TurnstileComponent } from '@marsidev/react-turnstile';

interface TurnstileProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onTimeout?: () => void;
}

const Turnstile: React.FC<TurnstileProps> = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  onTimeout,
}) => {
  return (
    <div className="flex justify-center w-full">
      <TurnstileComponent
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        onTimeout={onTimeout}
      />
    </div>
  );
};

export default Turnstile;