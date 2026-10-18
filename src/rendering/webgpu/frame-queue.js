// Admission control, not a GPU wait. The game keeps updating on every RAF;
// when the GPU is behind, the next admitted render uses the latest scene.
// There is no await, pixel readback, timer-query wait, or extra render loop.
export class FrameQueue {
  constructor(limit = 2) {
    this.limit = limit;
    this.pending = 0;
    this.submissions = 0;
    this.completed = 0;
    this.skipped = 0;
    this.peak = 0;
    this.generation = 0;
  }
  available() {
    if (this.pending < this.limit) return true;
    this.skipped++;
    return false;
  }
  submitted(queue) {
    const generation = this.generation;
    this.pending++;
    this.submissions++;
    this.peak = Math.max(this.peak, this.pending);
    const release = () => {
      if (this.generation !== generation) return;
      this.pending--;
      this.completed++;
    };
    try {
      void queue.onSubmittedWorkDone().then(release, release);
    } catch {
      // Device loss is handled by the backend's existing failure lifecycle.
      release();
    }
  }
  report() {
    return { limit:this.limit, pending:this.pending, peak:this.peak,
      submissions:this.submissions, completed:this.completed, skipped:this.skipped };
  }
  dispose() {
    this.generation++;
    this.pending = 0;
  }
}
