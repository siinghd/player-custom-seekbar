import Player from 'video.js/dist/types/player';
import { Segment } from './types';
import videojs from 'video.js';

const formatTime = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
};

const generateCompleteSegments = (
  userSegments: Segment[],
  videoLength: number | null,
  defaultTitle: string = 'Video about html'
): Segment[] => {
  userSegments.sort((a, b) => a.start - b.start);

  let completeSegments = [];
  let lastEnd = 0;

  if (userSegments[0]?.start > 0) {
    completeSegments.push({
      start: 0,
      end: userSegments[0].start,
      title: defaultTitle,
    });
  }

  userSegments.forEach((segment, index) => {
    completeSegments.push(segment);
    lastEnd = segment.end;

    if (
      index < userSegments.length - 1 &&
      lastEnd < userSegments[index + 1].start
    ) {
      completeSegments.push({
        start: lastEnd,
        end: userSegments[index + 1].start,
        title: defaultTitle,
      });
    }
  });

  if (videoLength === null || lastEnd < videoLength) {
    completeSegments.push({
      start: lastEnd,
      end: videoLength !== null ? videoLength : Infinity,
      title: defaultTitle,
    });
  }

  return completeSegments;
};
const createSegmentMarkerElements = (
  player: Player,
  segment: Segment,
  lastSegment: Segment
) => {
  const segmentEnd = isFinite(segment.end)
    ? (segment.end / (player.duration() || lastSegment.end)) * 100
    : 100;

  // Create gap element
  const gapEl = document.createElement('div');
  gapEl.className = 'segment-gap absolute bg-[#222932b3] h-full w-[3px]';
  gapEl.style.left = `${segmentEnd}%`;

  return { gapEl };
};

const createSegmentMarkers = (player: any, allSegments: Segment[]) => {
  const seekBar = player.controlBar.progressControl.seekBar.el();
  const fragment = document.createDocumentFragment();

  seekBar
    .querySelectorAll('.segment-marker, .segment-tooltip')
    .forEach((el: HTMLElement) => el.remove());

  allSegments.forEach((segment: Segment) => {
    const { gapEl } = createSegmentMarkerElements(
      player,
      segment,
      allSegments[allSegments.length - 1]
    );

    fragment.appendChild(gapEl);
  });

  seekBar.appendChild(fragment);
};

const createSegmentMarkersWithoutDuration = (
  player: any,
  allSegments: Segment[]
) => {
  const seekBar = player.controlBar.progressControl.seekBar.el();
  const fragment = document.createDocumentFragment();

  seekBar
    .querySelectorAll('.segment-marker, .segment-tooltip')
    .forEach((el: any) => el.remove());

  allSegments.forEach((segment) => {
    const { gapEl } = createSegmentMarkerElements(
      player,
      segment,
      allSegments[allSegments.length - 1]
    );

    fragment.appendChild(gapEl);
  });

  seekBar.appendChild(fragment);
};
const convertTimeToSeconds = (timeStr: string): number => {
  return timeStr.split(':').reduce((acc, time) => 60 * acc + +time, 0);
};

const getCurrentSegmentName = (
  timeStr: string,
  segments: Segment[]
): string => {
  const timeInSeconds = convertTimeToSeconds(timeStr);
  const currentSegment = segments.find(
    (segment) => segment.start <= timeInSeconds && timeInSeconds <= segment.end
  );
  return currentSegment ? currentSegment.title : '';
};

export {
  formatTime,
  generateCompleteSegments,
  createSegmentMarkers,
  createSegmentMarkersWithoutDuration,
  getCurrentSegmentName,
};
