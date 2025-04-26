
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

const extra = Constants.expoConfig?.extra || (Constants.manifest as any)?.extra || {};
const apiUrl = extra?.apiUrl;
export function useAudioRecorder(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    console.debug('[AudioRecorder] Hook mounted');
    return () => {
      console.debug('[AudioRecorder] Hook unmounted – cleaning up');
      if (recordingRef.current) {
        recordingRef.current
          .stopAndUnloadAsync()
          .then(() => console.debug('[AudioRecorder] Recording unloaded on cleanup'))
          .catch(err => console.debug('[AudioRecorder] Error unloading recording', err));
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    console.debug('[AudioRecorder] startRecording() called');
    try {
      const { status } = await Audio.requestPermissionsAsync();
      console.debug('[AudioRecorder] Permission status:', status);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.debug('[AudioRecorder] Audio mode configured');

      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      console.debug('[AudioRecorder] Recording instance created', recording);

      recordingRef.current = recording;
      setRecording(recording);
      setIsRecording(true);
      console.debug('[AudioRecorder] Recording started');
    } catch (error) {
      console.debug('[AudioRecorder] Error starting recording', error);
      Alert.alert('Error', 'Failed to start microphone');
    }
  };

  const stopRecording = async () => {
    console.debug('[AudioRecorder] stopRecording() called');
    try {
      const rec = recordingRef.current;
      if (!rec) {
        console.debug('[AudioRecorder] No active recording to stop');
        return;
      }

      await rec.stopAndUnloadAsync();
      console.debug('[AudioRecorder] Recording stopped and unloaded');
      setIsRecording(false);

      const uri = rec.getURI();
      console.debug('[AudioRecorder] Recorded file URI:', uri);
      if (!uri) throw new Error('No URI available');

      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.debug('[AudioRecorder] File info:', fileInfo);

      // Determine correct file name and MIME type
      const isIOS = Platform.OS === 'ios';
      const fileType = isIOS ? 'audio/m4a' : 'audio/3gp';
      const fileName = isIOS ? 'recording.m4a' : 'recording.3gp';

      const formData = new FormData();
      formData.append('file', {
        uri: fileInfo.uri,
        type: fileType,
        name: fileName,
      } as any); // fix TS warning

      console.debug('[AudioRecorder] FormData prepared for upload', { fileType, fileName });

      const response = await axios.post(`${apiUrl}/transcribe-openai/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.debug('[AudioRecorder] Transcription response:', response.data);

      const transcription = response.data?.transcription;
      if (transcription) {
        console.debug('[AudioRecorder] Transcription text:', transcription);
        onTranscript(transcription);
      } else {
        console.debug('[AudioRecorder] No transcription returned');
      }
    } catch (error) {
      console.debug('[AudioRecorder] Error during stop/transcribe', error);
      Alert.alert('Transcription Failed', 'Could not process the audio.');
    } finally {
      setRecording(null);
    }
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
  };
}

