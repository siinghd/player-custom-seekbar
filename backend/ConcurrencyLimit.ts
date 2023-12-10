// todo maybe use p-limit but reported async_hook fix is till in canary https://github.com/oven-sh/bun/issues/7488

type TaskFunction<T> = () => Promise<T>;

class ConcurrencyLimit<T> {
  private limit: number;
  private running: number;
  private queue: Array<{
    task: TaskFunction<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    priority: number;
  }>;

  constructor(limit: number) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async enqueue(task: TaskFunction<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskItem = { task, resolve, reject, priority };

      if (this.running < this.limit) {
        this.runTask(taskItem);
      } else {
        this.queue.push(taskItem);
        this.queue.sort((a, b) => b.priority - a.priority);
      }
    });
  }

  private async runTask(taskItem: {
    task: TaskFunction<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
  }): Promise<void> {
    this.running++;
    try {
      const result = await taskItem.task();
      taskItem.resolve(result);
    } catch (error) {
      taskItem.reject(error);
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        this.runTask(this.queue.shift()!);
      }
    }
  }
}

export default ConcurrencyLimit;