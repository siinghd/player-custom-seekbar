'use client';
import React, { useRef, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import { createSegmentMarkersWithoutDuration } from '../utils/methods';

interface Thumbnail {
  time: number;
  url: string;
}
const Video = () => {
  const playerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null);

  const segments = [
    { start: 0, end: 10, title: 'starting the life circle' },
    { start: 10, end: 20, title: 'CSS' },
    { start: 35, end: 50, title: 'HTML' },
    {
      start: 50,
      end: 210,
      title: 'Last part, jumping around the life circle. Awesome end',
    },
  ]; // or fetch and assuming that segments have end time included
  const videoJsOptions = {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    sources: [
      {
        // Set video source
        src: 'https://cdn.bitmovin.com/content/assets/art-of-motion_drm/mpds/11331.mpd',
        type: 'application/dash+xml',
        keySystems: {
          'com.widevine.alpha': 'https://cwip-shaka-proxy.appspot.com/no_auth',
        },
      },
    ],
  };

  const handlePlayerReady = async (player: any) => {
    playerRef.current = player;

    createSegmentMarkersWithoutDuration(player, segments);

    player.on('waiting', () => {
      console.log('player is waiting');
    });

    player.on('dispose', () => {
      console.log('player will dispose');
    });
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-10">
          <div className="loader">Loading...</div>
        </div>
      )}

      {videoJsOptions.sources.length > 0 && segments.length > 0 && (
        <>
          <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
        </>
      )}
    </>
  );
};
export default Video;
