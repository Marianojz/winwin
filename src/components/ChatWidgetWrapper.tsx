import { useNavigate } from 'react-router-dom';
import ChatWidget from './ChatWidget';

const ChatWidgetWrapper = () => {
  const navigate = useNavigate();

  const handleContactClick = () => {
    navigate('/contacto');
  };

  const handleHelpCenterClick = () => {
    navigate('/ayuda');
  };

  return (
    <ChatWidget
      onContactClick={handleContactClick}
      onHelpCenterClick={handleHelpCenterClick}
    />
  );
};

export default ChatWidgetWrapper;

