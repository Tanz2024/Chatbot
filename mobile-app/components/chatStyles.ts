import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  inputBox: {
    backgroundColor: '#f3f3f3',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  
  inputField: {
    flex: 1,
    fontSize: 16,
  },
  
  loginButton: {
    width: '100%',
    backgroundColor: '#1BBAC7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#e0f7fa',
    borderRadius: 20,
    shadowColor: '#00bcd4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  
  listeningMic: {
    width: 20,
    height: 20,
    tintColor: '#10C15C',
    marginRight: 10,
  },
  
  listeningText: {
    fontSize: 15,
    color: '#00796b',
    fontStyle: 'italic',
  },
  
  // ─── Chatbot Wrapper ───────────────────────────────────────────────────────
  iconButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },

  // ─── ChatWindow Container ──────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    // borderBottomWidth: 1,
    // borderBottomColor: '#eee',
    zIndex: 1, 
    height:80,
  },
  
  headerIcon: {
    width: 24,
    height: 24,
    marginTop: 40,
  },
  
  headerLogo: {
    width: 200,
    height: 90,
    marginTop: 40,
  },
  
  headerPlaceholder: {
    height: 60, 
  },
  

  // ─── Category Selection ────────────────────────────────────────────────────
  categorySelection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  
  assistantTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#43ABC1',
    marginBottom: 10,
    textAlign: 'center',
  },
  
  categorySubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 140,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 10,
  },
  
  categoryRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  categoryTopCard: {
    transform: [{ scale: 1.1 }],
  },
  starRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
    marginVertical: -15,
  },
  starRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
    marginVertical: 0,
  },
  starRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '65%',
    alignSelf: 'center',
    marginVertical: 0,
  },
  
  starSpacer: {
    flex: 1,
  },
  
    
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  
  categoryCard: {
    width: 110,
    height: 125,
    borderRadius: 30,
    backgroundColor: '#fff',
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  
  categoryCardSelected: {
    backgroundColor: '#43ABC1',
    borderColor: '#43ABC1',
    borderWidth: 2,
  },
  
  categoryIcon: {
    width: 85,
    height: 85,
    marginBottom: 8,
  },
  
  categoryLabel: {
    fontSize: 16,
    width: 100,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  
  startChatBtn: {
    backgroundColor: '#43ABC1',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: 380,
    height: 60,
    marginTop: 100,
  },
  startChatBtnDisabled: {
    backgroundColor: '#ccc', 
  },
  
  startChatTextDisabled: {
    color: '#888', 
  },
  
  
  startChatText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 3,
  },
  
  btnText: {
    fontSize: 16,
    color: '#fff',
  },
  

  // ─── Back Button ───────────────────────────────────────────────────────────
  backButton: {
    padding: 10,
    alignSelf: 'center',
  },
  backText: {
    color: '#007AFF',
    fontSize: 14,
  },

  // ─── Chat Area ─────────────────────────────────────────────────────────────
  chatArea: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bubble: {
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
  },
  typingText: {
    fontStyle: 'italic',
    color: '#666',
    marginLeft: 8,
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, 
  },
  
  
  iconButton2: {
    padding: 8,
  },
  
  inputIcon: {
    width: 24,
    height: 24,
  },
  
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 8,
    fontSize: 16,
  },
  
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
    marginHorizontal: 10,
  },
  
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 6,
  },
  
  userBubble: {
    backgroundColor: '#43ABC1',
    borderRadius: 16,
    padding: 10,
    maxWidth: '70%',
    borderBottomRightRadius: 4,
  },
  
  botBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 10,
    maxWidth: '70%',
    borderBottomLeftRadius: 4,
  },
  
  messageText: {
    color: '#000',
    fontSize: 14,
  },
  
  
  // ─── Timer Text ────────────────────────────────────────────────────────────
  recordTimer: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },

  // ─── Floating Icon Button (Optional trigger) ───────────────────────────────
  floatingIconButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
