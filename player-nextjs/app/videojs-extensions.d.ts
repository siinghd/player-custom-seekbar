import 'video.js';

declare module 'video.js' {
  interface VideoJsPlayer {
    eme(): void;
  }
}
