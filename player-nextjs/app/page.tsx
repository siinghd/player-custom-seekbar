import Image from 'next/image';
import VideoPlayer from './components/VideoPlayer';
import Video from './components/Video';

export default async function Home() {
  let data = null;
  try {
    data = await (
      await fetch('https://backend-siinghd-player-custom-seekbar-x.hsingh.site/video?fileId=1234')
    ).json();
  } catch (error) {
    data = null;
  }
 
  return (
    <main className="">
      <Video
        thumbnails={data ? data.thumbnails : []}
        segments={[
          { start: 0, end: 10, title: 'starting the life circle' },
          { start: 10, end: 20, title: 'CSS' },
          { start: 20, end: 35, title: 'Homo sapiens' },
          { start: 35, end: 50, title: 'HTML' },
          {
            start: 50,
            end: 210,
            title: 'Last part, jumping around the life circle. Awesome end',
          },
        ]}
        videoJsOptions={{
          thumbnail: data.isComposite ? data.thumbnails[0] : null,
          isComposite: data.isComposite,
          height: data.height,
          width: data.width,
          delta: data.delta,
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
                'com.widevine.alpha':
                  'https://cwip-shaka-proxy.appspot.com/no_auth',
              },
            },
          ],
        }}
      />
    </main>
  );
}
