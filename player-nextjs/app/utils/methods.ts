import { Segment } from './types';

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
const createSegmentMarkers = (player: any, allSegments: Segment[]) => {
  const seekBar = player.controlBar.progressControl.seekBar.el();

  // Clear existing segments and tooltips
  seekBar
    .querySelectorAll('.segment-marker, .segment-tooltip')
    .forEach((el) => el.remove());

  allSegments.forEach((segment) => {
    // Create segment element
    const gapEl = document.createElement('div');
    gapEl.classList.add(
      'segment-gap',
      'absolute',
      'bg-[#515151]',
      'h-full',
      'w-[3px]'
    );
    const segmentEl = document.createElement('div');
    segmentEl.classList.add(
      'segment-marker',
      'absolute',
      'bg-transparent',
      'h-full',
      'z-10'
    );

    // Calculate width and left position of the segment
    const segmentStart = (segment.start / player.duration()) * 100;
    const segmentEnd = isFinite(segment.end)
      ? (segment.end / player.duration()) * 100
      : 100;
    segmentEl.style.width = `${segmentEnd - segmentStart}%`;
    segmentEl.style.left = `${segmentStart}%`;

    // Create tooltip element
    const tooltipEl = document.createElement('div');
    tooltipEl.classList.add(
      'segment-tooltip',
      'absolute',
      'bottom-10',
      'bg-gray-600',
      'text-white',
      'text-xs',
      'px-2',
      'py-1',
      'rounded',
      'opacity-0',
      'transition-opacity',
      'w-[100%]'
    );
    tooltipEl.textContent = segment.title;

    // Show and hide tooltip on hover
    segmentEl.addEventListener('mouseenter', () => {
      tooltipEl.classList.replace('opacity-0', 'opacity-100');
    });
    segmentEl.addEventListener('mouseleave', () => {
      tooltipEl.classList.replace('opacity-100', 'opacity-0');
    });

    const gapStart = (segment.end / player.duration()) * 100;
    // Append tooltip to the segment element
    segmentEl.appendChild(tooltipEl);
    seekBar.appendChild(segmentEl);

    gapEl.style.left = `${gapStart}%`;
    seekBar.appendChild(gapEl);
  });
};

const createSegmentMarkersWithoutDuration = (
  player: any,
  allSegments: Segment[]
) => {
  const seekBar = player.controlBar.progressControl.seekBar.el();

  // Clear existing segments and tooltips
  seekBar
    .querySelectorAll('.segment-marker, .segment-tooltip')
    .forEach((el) => el.remove());

  allSegments.forEach((segment) => {
    // Create segment element
    const gapEl = document.createElement('div');
    gapEl.classList.add(
      'segment-gap',
      'absolute',
      'bg-[#515151]',
      'h-full',
      'w-[3px]'
    );
    const segmentEl = document.createElement('div');
    segmentEl.classList.add(
      'segment-marker',
      'absolute',
      'bg-transparent',
      'h-full',
      'z-10'
    );
    const duration = allSegments[allSegments.length - 1].end;
    // Calculate width and left position of the segment
    const segmentStart = (segment.start / duration) * 100;
    const segmentEnd = isFinite(segment.end)
      ? (segment.end / duration) * 100
      : 100;
    segmentEl.style.width = `${segmentEnd - segmentStart}%`;
    segmentEl.style.left = `${segmentStart}%`;

    // Create tooltip element
    const tooltipEl = document.createElement('div');
    tooltipEl.classList.add(
      'segment-tooltip',
      'absolute',
      'bottom-10',
      'bg-gray-600',
      'text-white',
      'text-xs',
      'px-2',
      'py-1',
      'rounded',
      'opacity-0',
      'transition-opacity',
      'w-[100%]'
    );
    tooltipEl.textContent = segment.title;

    // Show and hide tooltip on hover
    segmentEl.addEventListener('mouseenter', () => {
      tooltipEl.classList.replace('opacity-0', 'opacity-100');
    });
    segmentEl.addEventListener('mouseleave', () => {
      tooltipEl.classList.replace('opacity-100', 'opacity-0');
    });

    const gapStart = (segment.end / duration) * 100;
    // Append tooltip to the segment element
    segmentEl.appendChild(tooltipEl);
    seekBar.appendChild(segmentEl);

    gapEl.style.left = `${gapStart}%`;
    seekBar.appendChild(gapEl);
  });
};
export {
  formatTime,
  generateCompleteSegments,
  createSegmentMarkers,
  createSegmentMarkersWithoutDuration,
};
