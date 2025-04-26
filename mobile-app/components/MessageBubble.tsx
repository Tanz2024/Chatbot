// components/MessageBubble.tsx
import React from 'react';
import { View, Text } from 'react-native';
import chatStyles from './chatStyles';

interface MessageBubbleProps {
  sender: 'user' | 'bot';
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ sender, text }) => {
  const isUser = sender === 'user';

  return (
    <View
      style={[
        chatStyles.bubble,
        isUser ? chatStyles.userBubble : chatStyles.botBubble,
      ]}
    >
      <Text style={chatStyles.messageText}>{text}</Text>
    </View>
  );
};

export default MessageBubble;
