'use client';
import { useEffect, useState } from 'react';
import videojs from 'video.js';
import 'videojs-contrib-eme';
import { Segment } from '../utils/types';
import Player from 'video.js/dist/types/player';

export const usePlayer = (
  videoRef: React.RefObject<HTMLVideoElement>,
  initialSegments: Segment[]
) => {
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const vjsPlayer: any = videojs(videoRef.current, { fluid: true });

    // Initialize EME
    vjsPlayer.eme();

    // Set video source with DRM configurations
    vjsPlayer.src({
      src: 'https://cdn.bitmovin.com/content/assets/art-of-motion_drm/mpds/11331.mpd',
      type: 'application/dash+xml',
      keySystems: {
        'com.widevine.alpha': 'https://cwip-shaka-proxy.appspot.com/no_auth',
      },
    });

    setPlayer(vjsPlayer);

    // ... rest of your code

    return () => {
      vjsPlayer.dispose();
    };
  }, [videoRef, initialSegments]);

  // ... rest of your hook code

  return player;
};
