'use client';
import React, { useEffect, useRef, FunctionComponent } from 'react';
import videojs, { ReadyCallback } from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-eme';
import 'videojs-mobile-ui/dist/videojs-mobile-ui.css';
import 'videojs-mobile-ui';
import 'videojs-sprite-thumbnails';
// todo correct types
interface VideoPlayerProps {
  options: any;
  onReady?: (player: Player) => void;
}

export const VideoPlayer: FunctionComponent<VideoPlayerProps> = ({
  options,
  onReady,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player: any = (playerRef.current = videojs(
        videoElement,
        options,
        () => {
          player.mobileUi(); // mobile ui #https://github.com/mister-ben/videojs-mobile-ui
          player.eme(); // Initialize EME
          if (options.isComposite) {
            player.spriteThumbnails({
              interval: options.delta,
              url: options.thumbnail.secure_url,
              width: options.width,
              height: options.height,
            });
          }
          player.on('loadedmetadata', () => {
            if (onReady) {
              onReady(player);
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
    </div>
  );
};

export default VideoPlayer;
