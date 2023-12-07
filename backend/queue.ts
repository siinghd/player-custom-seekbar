class Queue<T> {
  private queue: Record<number, T>;
  private front: number;
  private rear: number;

  constructor() {
    this.queue = {};
    this.front = 0;
    this.rear = 0;
  }

  enqueue(item: T): void {
    this.queue[this.rear] = item;
    this.rear++;
  }

  dequeue(): T | null {
    if (this.rear === this.front) {
      return null; 
    }

    const item = this.queue[this.front];
    delete this.queue[this.front];
    this.front++;
    return item;
  }

  isEmpty(): boolean {
    return this.rear === this.front;
  }
}

export default Queue;
