'use client';
import React, {
  FunctionComponent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import VideoPlayer from './VideoPlayer';
import {
  createSegmentMarkersWithoutDuration,
  formatTime,
  getCurrentSegmentName,
} from '../utils/methods';
import { Segment } from '../utils/types';
import Player from 'video.js/dist/types/player';
import { MdClose, MdMenu } from 'react-icons/md';
export interface Thumbnail {
  public_id: string;
  version: number;
  url: string;
  secure_url: string;
  timestamp: number;
}

interface VideoProps {
  thumbnails: Thumbnail[];
  segments: Segment[];
  videoJsOptions: any;
}
function ThumbnailComponent({
  startTime,
  endTime,
  thumbWidth,
  thumbHeight,
  deltaTime,
  imageUrl,
}: {
  startTime: number;
  endTime: number;
  thumbWidth: number;
  thumbHeight: number;
  deltaTime: number;
  imageUrl: string;
}) {
  const scaleFactor = 0.75;
  // middle time of the segments
  const midpoint = (startTime + endTime) / 2;
  // index of the thumbnail
  const index = Math.floor(midpoint / deltaTime); // Rounding down to get to the closest 10-second mark
  //  the x-coordinate for the background position
  const xPos = -(index * thumbWidth);
  const scaledWidth = thumbWidth * scaleFactor;
  const scaledHeight = thumbHeight * scaleFactor;
  // inline  styles for the thumbnail div
  const styles = {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    backgroundImage: `url(${imageUrl})`,
    backgroundPosition: `${xPos}px 0px`,
  };

  return <div style={styles} />;
}

type TimeCodeCommentProps = {
  comment: string;
  scrollToTime: (time: number) => void;
};
const TimeCodeComment: React.FC<TimeCodeCommentProps> = ({
  comment,
  scrollToTime,
}) => {
  // convert the time to seconds
  const convertToSeconds = (timeCode: string): number => {
    const parts = timeCode.split(':').reverse().map(Number);
    return parts.reduce(
      (acc, part, index) => acc + part * Math.pow(60, index),
      0
    );
  };

  // we need to match time in the comments hh:mm:ss, mm:ss, or ss time codes
  const timeCodeRegex = /(\d{1,2}:)?(\d{1,2}:)?(\d{1,2})/g;

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = timeCodeRegex.exec(comment)) !== null) {
    // Aif there is something before the time
    if (match.index > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {comment.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Convert the time code to seconds and create a clickable button
    const timeInSeconds = convertToSeconds(match[0]);
    elements.push(
      <button
        key={`timecode-${match.index}`}
        className="text-blue-500 hover:underline"
        onClick={() => scrollToTime(timeInSeconds)}
      >
        {match[0]}
      </button>
    );
    //keeps track of the last index in the comment string after the last time code match.
    lastIndex = match.index + match[0].length;
  }

  // text after the last match
  if (lastIndex < comment.length) {
    elements.push(
      <span key={`text-end-${lastIndex}`}>{comment.substring(lastIndex)}</span>
    );
  }

  return <p>{elements}</p>;
};

const Video: FunctionComponent<VideoProps> = ({
  thumbnails,
  segments,
  videoJsOptions,
}) => {
  const playerRef = useRef<Player | null>(null);
  const thumbnailPreviewRef = useRef<HTMLDivElement>(null);
  const sideBarRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const comment = '2:40 what is that?';
  const comment2 = ' Hi harkirat is that you at 40?';
  const comment3 = ' Hi harkiratcan re explain this at 1:50 in another video?';
  // const getThumbnailSize = () => {
  //   const isMobile = window.innerWidth <= 768; // Example breakpoint for mobile
  //   return isMobile ? { width: 160, height: 90 } : { width: 320, height: 180 }; // Half size for mobile
  // };
  // const findClosestThumbnail = useMemo(() => {
  //   const timestamps = thumbnails.map((thumb) =>
  //     parseInt(thumb.timestamp.toString(), 10)
  //   );

  //   // A binary search function to find the closest timestamp
  //   const binarySearchClosest = (hoverTime: number) => {
  //     let start = 0;
  //     let end = timestamps.length - 1;

  //     while (start <= end) {
  //       let mid = Math.floor((start + end) / 2);
  //       if (timestamps[mid] === hoverTime) {
  //         return mid;
  //       } else if (timestamps[mid] < hoverTime) {
  //         start = mid + 1;
  //       } else {
  //         end = mid - 1;
  //       }
  //     }

  //     if (end < 0) return 0;
  //     if (start >= timestamps.length) return timestamps.length - 1;

  //     const startDiff = Math.abs(timestamps[start] - hoverTime);
  //     const endDiff = Math.abs(hoverTime - timestamps[end]);
  //     console.log(startDiff < endDiff ? start : end);
  //     return startDiff < endDiff ? start : end;
  //   };

  //   return (hoverTime: number) => {
  //     const closestIndex = binarySearchClosest(hoverTime);

  //     return thumbnails[closestIndex].secure_url;
  //   };
  // }, [thumbnails]); // Only recompute if thumbnails change

  // useEffect(() => {
  //   if (isPlayerReady && playerRef.current && !videoJsOptions.isComposite) {
  //     const seekBar = playerRef.current
  //       ?.getChild('ControlBar')
  //       ?.getChild('ProgressControl')
  //       ?.getChild('SeekBar');

  //     const handleSeekBarHover = (event: MouseEvent | TouchEvent) => {
  //       const seekBar = playerRef.current
  //         ?.getChild('ControlBar')
  //         ?.getChild('ProgressControl')
  //         ?.getChild('SeekBar');
  //       if (seekBar && thumbnailPreviewRef.current) {
  //         const seekBarRect = seekBar.el().getBoundingClientRect();
  //         let clientX = 0;
  //         if (
  //           typeof TouchEvent !== 'undefined' &&
  //           event instanceof TouchEvent
  //         ) {
  //           // For TouchEvent, get the clientX from the first touch point
  //           clientX = event.touches[0].clientX;
  //         } else if (event instanceof MouseEvent) {
  //           // For MouseEvent, directly use the clientX property
  //           clientX = event.clientX;
  //         } else {
  //           // Handle other cases or throw an error
  //           throw new Error('Unsupported event type');
  //         }

  //         // Determine if we are in desktop view
  //         const isDesktop = window.innerWidth > 768;
  //         let adjustedClientX = clientX;

  //         // Adjust clientX if the sidebar is open and we are in desktop view
  //         if (isSidebarOpen && isDesktop) {
  //           const sidebarElement = sideBarRef.current;
  //           const sidebarWidth = sidebarElement
  //             ? sidebarElement.getBoundingClientRect().width
  //             : 0;

  //           adjustedClientX -= sidebarWidth + 30;
  //         }

  //         // Calculate the position of the hover relative to the seek bar
  //         const seekBarPoint = adjustedClientX - seekBarRect.left;
  //         const hoverTime =
  //           (seekBarPoint / seekBarRect.width) *
  //           (playerRef.current?.duration() ||
  //             segments[segments.length - 1].end);
  //         console.log(hoverTime);
  //         const thumbnailUrl = findClosestThumbnail(hoverTime);
  //         // Update the thumbnail preview element
  //         const thumbnailPreviewEl =
  //           document.getElementById('thumbnail-preview');
  //         const { width, height } = getThumbnailSize();
  //         if (thumbnailPreviewEl) {
  //           thumbnailPreviewEl.style.width = `${width}px`;
  //           thumbnailPreviewEl.style.height = `${height}px`;
  //           thumbnailPreviewEl.style.backgroundImage = `url(${thumbnailUrl})`;
  //           thumbnailPreviewEl.classList.remove('hidden');

  //           const previewWidth = thumbnailPreviewEl.offsetWidth;
  //           const previewHeight = thumbnailPreviewEl.offsetHeight;
  //           let correctedLeft = adjustedClientX - previewWidth / 2;
  //           const rightEdge = window.innerWidth - previewWidth;

  //           if (correctedLeft < 0) correctedLeft = 0;

  //           if (correctedLeft > rightEdge) correctedLeft = rightEdge;

  //           thumbnailPreviewEl.style.left = `${correctedLeft}px`;

  //           thumbnailPreviewEl.style.top = `${
  //             seekBarRect.top - previewHeight - 30
  //           }px`;
  //         }
  //       }
  //     };
  //     const hideThumbnailPreview = () => {
  //       if (thumbnailPreviewRef.current) {
  //         thumbnailPreviewRef.current.classList.add('hidden');
  //       }
  //     };

  //     const player = playerRef.current;
  //     let controller: any;
  //     if (player) {
  //       controller = playerRef.current
  //         ?.getChild('ControlBar')
  //         ?.getChild('ProgressControl')
  //         ?.el();

  //       controller.addEventListener('mousemove', handleSeekBarHover);
  //       controller.addEventListener('touchmove', handleSeekBarHover); // For touch devices
  //       controller.addEventListener('mouseout', hideThumbnailPreview);
  //       controller.addEventListener('touchend', hideThumbnailPreview); // For touch devices
  //     }

  //     // Cleanup event listeners on unmount
  //     return () => {
  //       if (player) {
  //         controller.removeEventListener('mousemove', handleSeekBarHover);
  //         controller.removeEventListener('touchmove', handleSeekBarHover); // For touch devices
  //         controller.removeEventListener('mouseout', hideThumbnailPreview);
  //         controller.removeEventListener('touchend', hideThumbnailPreview); // For touch devices
  //       }
  //     };
  //   }
  // }, [
  //   findClosestThumbnail,
  //   isPlayerReady,
  //   isSidebarOpen,
  //   segments,
  //   videoJsOptions.isComposite,
  // ]); // Re-run effect if findClosestThumbnail changes
  // // optimize
  const overrideUpdateTime = (player: Player) => {
    const seekBar = player
      .getChild('ControlBar')
      ?.getChild('ProgressControl')
      ?.getChild('SeekBar');

    if (seekBar) {
      const mouseTimeDisplay = seekBar.getChild('mouseTimeDisplay');
      if (mouseTimeDisplay) {
        const timeTooltip: any = mouseTimeDisplay.getChild('timeTooltip');
        if (timeTooltip) {
          timeTooltip.update = function (
            seekBarRect: any,
            seekBarPoint: any,
            time: string
          ) {
            const segmentName = getCurrentSegmentName(time, segments);
            this.write(`${time} - ${segmentName}`);

            // Delay the execution to ensure the tooltip width is calculated after the content update
            setTimeout(() => {
              const tooltipWidth = this.el().offsetWidth;
              // Calculate the offset from the right side
              const rightOffset = tooltipWidth / 2;
              this.el().style.right = `-${rightOffset}px`;

              // Adjust the left style to 'auto' to avoid conflict with the right property
              this.el().style.left = 'auto';
            }, 0);
          };
        } else {
          console.error('TimeTooltip component not found.');
        }
      } else {
        console.error('MouseTimeDisplay component not found.');
      }
    } else {
      console.error('SeekBar component not found.');
    }
  };
  const handlePlayerReady = async (player: Player) => {
    playerRef.current = player;

    createSegmentMarkersWithoutDuration(player, segments);
    setIsPlayerReady(true);
    overrideUpdateTime(player);
    // player.on('waiting', () => {
    //   console.log('player is waiting');
    // });

    // player.on('dispose', () => {
    //   console.log('player will dispose');
    // });
  };
  const scrollTopSegment = (index: number) => {
    if (playerRef.current) {
      // Access the player API to set the current time to the start of the segment
      const segmentStartTime = segments[index].start;
      playerRef.current.currentTime(segmentStartTime);
    }
  };
  const scrollToTime = (time: number) => {
    if (playerRef.current) {
      // Access the player API to set the current time to the start of the segment

      playerRef.current.currentTime(time);
    }
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex md:flex-row flex-col-reverse">
      {/* Sidebar */}
      <div
        ref={sideBarRef}
        className={`transform top-0 left-0 md:left-auto md:transform-none ${
          isSidebarOpen
            ? 'translate-x-0 w-full md:w-1/4 p-4'
            : '-translate-x-full w-0 p-0'
        } transition-all ease-in-out duration-500 z-20 h-auto bg-gray-700 overflow-hidden relative`}
      >
        {/* Close Button (Top Right of Sidebar) */}
        <div className="flex justify-end">
          {isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-full text-white transition duration-300 ease-in-out hover:bg-red-600 bg-red-500  top-5 right-5 z-30"
            >
              <MdClose size={24} /> {/* Icon for closing */}
            </button>
          )}
        </div>

        <ul className={`${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
          {segments.map((segment, index) => (
            <li
              key={index}
              className="flex mb-2 items-center space-x-2 cursor-pointer hover:bg-blue-100"
              onClick={() => scrollTopSegment(index)}
            >
              <div className="shrink-0">
                <ThumbnailComponent
                  startTime={segment.start}
                  endTime={segment.end}
                  thumbWidth={videoJsOptions.width}
                  thumbHeight={videoJsOptions.height}
                  imageUrl={videoJsOptions.thumbnail.secure_url}
                  deltaTime={videoJsOptions.delta}
                />
              </div>

              <button className="flex-grow text-left transition-colors duration-150 ease-in-out">
                {formatTime(segment.start)} - {formatTime(segment.end)} -{' '}
                {segment.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Video Player */}
        <div
          id="thumbnail-preview"
          ref={thumbnailPreviewRef}
          className="hidden absolute bg-no-repeat bg-cover w-[320px] h-[180px] pointer-events-none z-10"
        />
        <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
        <TimeCodeComment comment={comment} scrollToTime={scrollToTime} />
        <TimeCodeComment comment={comment2} scrollToTime={scrollToTime} />
        <TimeCodeComment comment={comment3} scrollToTime={scrollToTime} />

        {/* Open Sidebar Button (Floating Bottom Right) */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed bottom-5 right-5 p-2 rounded-full text-white transition duration-300 ease-in-out hover:bg-blue-600 bg-blue-500 z-30"
          >
            <MdMenu size={24} /> {/* Icon for opening */}
          </button>
        )}
      </div>
    </div>
  );
};
export default Video;
