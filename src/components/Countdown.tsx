import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatCountdown } from '../utils/helpers';
import './Countdown.css';

interface CountdownProps {
  endTime: Date;
  onExpire?: () => void;
}

const Countdown = ({ endTime, onExpire }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState(formatCountdown(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = formatCountdown(endTime);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isExpired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className="countdown expired">
        <Clock size={18} />
        <span>Subasta Finalizada</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <div className="countdown">
      <Clock size={18} />
      <div className="countdown-time">
        {days > 0 && (
          <div className="countdown-unit">
            <span className="countdown-value">{days}</span>
            <span className="countdown-label">d</span>
          </div>
        )}
        <div className="countdown-unit">
          <span className="countdown-value">{String(hours).padStart(2, '0')}</span>
          <span className="countdown-label">h</span>
        </div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(minutes).padStart(2, '0')}</span>
          <span className="countdown-label">m</span>
        </div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(seconds).padStart(2, '0')}</span>
          <span className="countdown-label">s</span>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
