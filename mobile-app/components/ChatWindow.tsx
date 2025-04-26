
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import styles from './chatStyles';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface Props {
  onClose: () => void;
}

const extra = Constants.expoConfig?.extra || (Constants.manifest as any)?.extra || {};
const apiUrl = extra?.apiUrl;


const categories = [
  { key: 'energy', label: 'Energy', icon: require('../assets/images/energy.png') },
  { key: 'water', label: 'Water', icon: require('../assets/images/water.png') },
  { key: 'co2', label: 'Emission', icon: require('../assets/images/emission.png') },
  { key: 'waste', label: 'Waste', icon: require('../assets/images/waste.png') },
  { key: 'environment', label: 'Environment', icon: require('../assets/images/environment.png') },
];

export default function ChatWindow({ onClose }: Props) {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);


  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isListening, setIsListening] = useState(false); 

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [micPressed, setMicPressed] = useState(false);
  const listRef = useRef<FlatList>(null);
  const mounted = useRef(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [recordStartX, setRecordStartX] = useState<number | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        setRecordStartX(e.nativeEvent.pageX);
        setIsCancelled(false);
        startRecording();
      },
      onPanResponderMove: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (recordStartX !== null) {
          const dx = e.nativeEvent.pageX - recordStartX;
          if (dx < -60 && !isCancelled) { 
            setIsCancelled(true);
            endRec(); // stop immediately when cancelled
          }
        }
      },
      onPanResponderRelease: () => {
        if (!isCancelled) {
          endRec();
        }
      },
      onPanResponderTerminate: () => {
        if (!isCancelled) {
          endRec();
        }
      },
    })
  ).current;
  
  const { startRecording: beginRec, stopRecording: endRec, isRecording } = useAudioRecorder((transcribedText) => {
    setIsTranscribing(false);
    setStatusMessage(null); 
    setInput(transcribedText);
  });
  
  const startRecording = () => {
    setMicPressed(true);
    setIsListening(true);    
    setStatusMessage(' Listening...');
    beginRec();
  };
  
  const stopRecording = () => {
    setMicPressed(false);
    setIsListening(false);   
    setStatusMessage(' Transcribing...');
    setIsTranscribing(true);
    endRec();
  };
  
  
<View {...panResponder.panHandlers}>
  <TouchableOpacity
    style={styles.iconButton2}
    onPress={isRecording ? stopRecording : startRecording}
  >
    <Image
      source={require('../assets/images/voice.png')}
      style={[
        styles.inputIcon,
        { tintColor: micPressed || isRecording ? 'green' : 'grey' },
      ]}
    />
  </TouchableOpacity>
</View>
{isListening && (
  <View style={styles.listeningBar}>
    <Image
      source={require('../assets/images/voice.png')}
      style={styles.listeningMic}
    />
    <Text style={styles.listeningText}>Listening...</Text>
    {/* Optional: add animated bars here */}
  </View>
)}


  // Scroll to bottom on new messages or typing
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages, isBotTyping]);

  // Cleanup flag
  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  // --- Login handlers ---
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setIsUsernameValid(value.trim().toLowerCase() === 'admin');
  };
  const handleLogin = () => {
    if (username === 'AEL' && password === 'aeldashboard') {
      setIsLoggedIn(true);
    } else {
      Alert.alert('Login Failed', 'Invalid username or password');
    }
  };

  // --- Send & receive messages ---
  const sendMessageToBackend = useCallback(
    async (text: string) => {
      if (!selectedCategory) {
        setMessages((m) => [...m, { sender: 'bot', text: 'Please select a category first.' }]);
        return;
      }
      setIsBotTyping(true);
      try {
        const { data } = await axios.post(`${apiUrl}/chat/`, { user_input: text });
        if (!mounted.current) return;
        setMessages((m) => [...m, { sender: 'bot', text: data.response }]);
      } catch {
        if (mounted.current) {
          setMessages((m) => [...m, { sender: 'bot', text: 'An error occurred. Please try again.' }]);
        }
      } finally {
        mounted.current && setIsBotTyping(false);
      }
    },
    [selectedCategory]
  );

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { sender: 'user', text: t }]);
    setInput('');
    sendMessageToBackend(t);
  };

  // --- Category selection ---
  const selectCategory = async (cat: string) => {
    setChatStarted(true);
    try {
      await axios.post(`${apiUrl}/select_category/`, { category: cat });
      setMessages([{ sender: 'bot', text: `You selected ${cat}. You can now ask questions.` }]);
    } catch {
      setMessages([{ sender: 'bot', text: 'Error selecting category. Please try again.' }]);
    }
  };

  const handleBack = () => {
    setChatStarted(false);
    setMessages([]);
    setSelectedCategory(null);
  };

  return (
 <SafeAreaView style={styles.container}>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <KeyboardAvoidingView
      style={{ flex: 1, justifyContent: 'center' }} // Centers vertically
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Tweak for iPhone X notch
    >
      {!isLoggedIn ? (
        <View style={{ paddingHorizontal: 24 }}>
          <Image
            source={require('../assets/images/sqbg.png')}
            style={{
              width: '100%',
              height: 160,
              resizeMode: 'contain',
              alignSelf: 'center',
              marginBottom: 24,
              marginTop: 12,
            }}
          />

          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#1BBAC7', marginBottom: 6 }}>
            Welcome
          </Text>
          <Text style={{ fontSize: 16, color: '#444', marginBottom: 30 }}>
            Let's get started
          </Text>

          {/* Username */}
          <Text style={{ marginBottom: 6, fontWeight: '600', color: '#444' }}>Username</Text>
          <View style={{
            backgroundColor: '#f3f3f3',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
          }}>
            <TextInput
              style={{ flex: 1, fontSize: 16 }}
              placeholder="Enter username"
              value={username}
              onChangeText={handleUsernameChange}
            />
            {isUsernameValid && (
              <Image source={require('../assets/images/check.png')} style={{ width: 20, height: 20 }} />
            )}
          </View>

          {/* Password */}
          <Text style={{ marginBottom: 6, fontWeight: '600', color: '#444' }}>Password</Text>
          <View style={{
            backgroundColor: '#f3f3f3',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 24,
          }}>
            <TextInput
              style={{ flex: 1, fontSize: 16 }}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Image
                source={
                  showPassword
                    ? require('../assets/images/eye-open.png')
                    : require('../assets/images/eye-closed.png')
                }
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={{
              width: '100%',
              backgroundColor: '#1BBAC7',
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleLogin}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Log in</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>Powered by SquareCloud</Text>
            <Image
              source={require('../assets/images/sqc.png')}
              style={{ width: 20, height: 20, marginTop: 6 }}
              resizeMode="contain"
            />
          </View>
        </View>
        ) : (
          <>
          
            {chatStarted ? (
              <View style={styles.chatHeader}>
                <TouchableOpacity onPress={handleBack}>
                  <Image source={require('../assets/images/back1.png')} style={styles.headerIcon} />
                </TouchableOpacity>
                <Image source={require('../assets/images/GreenBOS.png')} style={styles.headerLogo} resizeMode="contain" />
                <TouchableOpacity onPress={() => setIsMuted(!isMuted)}>
                  <Image
                    source={isMuted ? require('../assets/images/mute.png') : require('../assets/images/sound.png')}
                    style={styles.headerIcon}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.headerPlaceholder} />
            )}

            {/* CATEGORY SELECTION */}
            {!chatStarted ? (
              <View style={styles.categorySelection}>
                <Text style={styles.assistantTitle}>Your AI Assistant</Text>
                <Text style={styles.categorySubtitle}>
                  Feel free to ask anything from GreenBOS!{"\n"}Just choose a category to start.
                </Text>
                <View style={styles.starRow1}>
                  <View style={styles.starSpacer} />
                  <TouchableOpacity
                    style={[styles.categoryCard, selectedCategory === 'energy' && styles.categoryCardSelected]}
                    onPress={() => setSelectedCategory('energy')}
                  >
                    <Image source={require('../assets/images/energy.png')} style={styles.categoryIcon} />
                    <Text style={styles.categoryLabel}>Energy</Text>
                  </TouchableOpacity>
                  <View style={styles.starSpacer} />
                </View>
                <View style={styles.starRow2}>
                  {['water', 'co2'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryCard, selectedCategory === cat && styles.categoryCardSelected]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Image source={categories.find((c) => c.key === cat)?.icon} style={styles.categoryIcon} />
                      <Text style={styles.categoryLabel}>
                        {categories.find((c) => c.key === cat)?.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.starRow3}>
                  {['waste', 'environment'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryCard, selectedCategory === cat && styles.categoryCardSelected]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Image source={categories.find((c) => c.key === cat)?.icon} style={styles.categoryIcon} />
                      <Text style={styles.categoryLabel}>
                        {categories.find((c) => c.key === cat)?.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.startChatBtn, !selectedCategory && styles.startChatBtnDisabled]}
                  onPress={() => selectedCategory && selectCategory(selectedCategory)}
                  disabled={!selectedCategory}
                >
                  <Text style={[styles.startChatText, !selectedCategory && styles.startChatTextDisabled]}>
                    Start Chat
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
              
                {/* CHAT */}
                {statusMessage && (
  <View style={[styles.messageRow, styles.messageRowLeft]}>
    <Image source={require('../assets/images/sqc.png')} style={styles.avatar} />
    <View style={[styles.messageContainer, styles.botBubble]}>
      <Text style={styles.messageText}>{statusMessage}</Text>
    </View>
  </View>
)}
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(_, i) => String(i)}
                  renderItem={({ item }) => {
                    const isUser = item.sender === 'user';
                    return (
                      <View style={[styles.messageRow, isUser ? styles.messageRowRight : styles.messageRowLeft]}>
                        {!isUser && <Image source={require('../assets/images/sqc.png')} style={styles.avatar} />}
                        <View style={[styles.messageContainer, isUser ? styles.userBubble : styles.botBubble]}>
                          <Text style={[styles.messageText, isUser && { color: '#fff' }]}>{item.text}</Text>
                        </View>
                        {isUser && <Image source={require('../assets/images/AEL.png')} style={styles.avatar} />}
                      </View>
                    );
                  }}
                  style={styles.chatArea}
                  onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                  onLayout={() => listRef.current?.scrollToEnd({ animated: true })}
                />

                {isBotTyping && <ActivityIndicator style={{ margin: 8 }} />}

                <View style={styles.inputArea}>
                  {/* Mic button toggles recording, icon tinted red when active */}
                  <TouchableOpacity
                    style={styles.iconButton2}
                    onPress={isRecording ? endRec : startRecording}
                  >
              <Image
  source={require('../assets/images/voice.png')}
  style={[
    styles.inputIcon,
    { tintColor: isRecording ? '#10C15C' : '#B0B0B0' }, // green while recording, grey otherwise
  ]}
/>

                  </TouchableOpacity>

                  <TextInput
                    style={styles.input}
                    placeholder="Type your message..."
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />

                  <TouchableOpacity style={styles.iconButton2} onPress={handleSend}>
                    <Image
                      source={require('../assets/images/send1.png')}
                      style={styles.inputIcon}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
