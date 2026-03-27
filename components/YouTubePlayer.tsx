import React, { forwardRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';

interface Props {
  videoId: string;
  height?: number;
}

export const YouTubePlayer = forwardRef<YoutubeIframeRef, Props>(
  function YouTubePlayer({ videoId, height = 220 }, ref) {
    const onStateChange = useCallback((state: string) => {
      // イベントハンドリング（必要に応じて拡張）
    }, []);

    return (
      <View style={[styles.container, { height }]}>
        <YoutubePlayer
          ref={ref}
          height={height}
          videoId={videoId}
          onChangeState={onStateChange}
        />
      </View>
    );
  }
);

export function seekTo(playerRef: React.RefObject<YoutubeIframeRef | null>, seconds: number) {
  playerRef.current?.seekTo(seconds, true);
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
});
