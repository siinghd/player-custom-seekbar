import videojs from 'video.js';

declare module 'video.js' {
  interface Player {
    eme: () => void;
  }
  interface Component {
    getChild(name: 'TimeTooltip'): TimeTooltip | undefined;
  }

  interface TimeTooltip extends Component {
    updateTime: (
      seekBarRect: DOMRect,
      seekBarPoint: number,
      content: string
    ) => void;
  }
}
