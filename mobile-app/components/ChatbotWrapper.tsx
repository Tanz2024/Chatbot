import React, { useState } from 'react';
import { TouchableOpacity, Text, Modal, View } from 'react-native';
import ChatWindow from './ChatWindow';
import styles from './chatStyles';
import LoginScreen from './LoginScreen';

const ChatbotWrapper: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const toggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsLoggedIn(false); // Start with login screen
    } else {
      setIsOpen(false);
      setIsLoggedIn(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <>
      {/* Floating chat button */}
      <TouchableOpacity style={styles.iconButton} onPress={toggle}>
        <Text style={styles.btnText}>Chat</Text>
      </TouchableOpacity>

      {/* Modal chat window */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={toggle}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chatContainer}>
            {isLoggedIn ? (
              <ChatWindow onClose={toggle} />
            ) : (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ChatbotWrapper;
