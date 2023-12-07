'use client';
import React, { useEffect, useRef, FunctionComponent } from 'react';
import videojs, { ReadyCallback } from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-eme';

// todo correct types
interface VideoPlayerProps {
  options: any;
  onReady?: (player: any) => void;
}

export const VideoPlayer: FunctionComponent<VideoPlayerProps> = ({
  options,
  onReady,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any | null>(null);
  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player: any = (playerRef.current = videojs(
        videoElement,
        options,
        () => {
          player.eme(); // Initialize EME
          player.on('loadedmetadata', () => {
            const duration = player.duration();
            if (duration > 0) {
              console.log('Video Duration:', duration);
              if (onReady) {
                onReady(player);
              }
            } else {
              console.log('Duration not available yet');
            }
          });
        }
      ));

      if (
        options.sources &&
        options.sources[0].type.includes('application/dash+xml')
      ) {
        player.src(options.sources[0]);
      }
    }
  }, [options, onReady]);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
      <div
        id="thumbnail-preview"
        className="hidden absolute bg-no-repeat bg-cover"
      ></div>
    </div>
  );
};

export default VideoPlayer;
