// types.ts

interface VideoJsPlayer {
  eme: () => void;
}

export interface Player extends VideoJsPlayer {}

export interface Segment {
  start: number;
  end: number;
  title: string;
}