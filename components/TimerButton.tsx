import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';

interface Props {
  seconds: number;
}

export function TimerButton({ seconds }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // seconds propが変わったらタイマーをリセット
  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
  }, [seconds]);

  // remainingを依存配列から除外: setRemainingの関数形式で十分なため
  // remaining毎に再生成するとintervalがリークする
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            Vibration.vibrate([500, 500, 500]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    if (remaining === 0) {
      setRemaining(seconds);
      setRunning(false);
    } else {
      setRunning(!running);
    }
  };

  const isComplete = remaining === 0;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        running && styles.running,
        isComplete && styles.complete,
      ]}
      onPress={handlePress}
    >
      <Text style={styles.icon}>{isComplete ? '✓' : running ? '⏸' : '⏱'}</Text>
      <Text style={[styles.time, running && styles.runningText]}>
        {formatTime(remaining)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  running: {
    backgroundColor: '#FF6B35',
  },
  complete: {
    backgroundColor: '#4CAF50',
  },
  icon: {
    fontSize: 20,
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  runningText: {
    color: '#fff',
  },
});
