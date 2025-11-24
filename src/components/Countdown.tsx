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
  const [prevTime, setPrevTime] = useState(timeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = formatCountdown(endTime);
      setPrevTime(timeLeft);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isExpired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire, timeLeft]);

  if (timeLeft.isExpired) {
    return (
      <div className="countdown expired">
        <Clock size={18} className="clock-icon" />
        <span>Subasta Finalizada</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;

  // Función para renderizar un módulo flip
  const FlipModule = ({ value, label, prevValue }: { value: string; label: string; prevValue?: string }) => {
    const isFlipping = prevValue !== undefined && prevValue !== value;
    
    return (
      <div className="flip-module">
        <div className="flip-card">
          <div className={`flip-card-inner ${isFlipping ? 'flipping' : ''}`}>
            <div className="flip-card-front">
              <div className="flip-number">{value}</div>
            </div>
            <div className="flip-card-back">
              <div className="flip-number">{prevValue || value}</div>
            </div>
          </div>
        </div>
        <div className="flip-label">{label}</div>
      </div>
    );
  };

  return (
    <div className="countdown-flip-container">
      <div className="countdown-flip">
        {days > 0 && (
          <FlipModule 
            value={String(days).padStart(2, '0')} 
            label="DAYS"
            prevValue={String(prevTime.days).padStart(2, '0')}
          />
        )}
        <FlipModule 
          value={String(hours).padStart(2, '0')} 
          label="HOURS"
          prevValue={String(prevTime.hours).padStart(2, '0')}
        />
        <FlipModule 
          value={String(minutes).padStart(2, '0')} 
          label="MINUTES"
          prevValue={String(prevTime.minutes).padStart(2, '0')}
        />
        <FlipModule 
          value={String(seconds).padStart(2, '0')} 
          label="SECONDS"
          prevValue={String(prevTime.seconds).padStart(2, '0')}
        />
      </div>
    </div>
  );
};

export default Countdown;
