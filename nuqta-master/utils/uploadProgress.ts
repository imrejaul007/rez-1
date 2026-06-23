/**
 * Upload Progress Tracking Utilities
 *
 * Provides comprehensive progress tracking for file uploads including:
 * - Progress calculation
 * - Speed estimation
 * - Time remaining calculation
 * - Progress formatting for display
 * - Upload state management
 */

/**
 * Upload state enum
 */
export enum UploadState {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}

/**
 * Upload progress data
 */
export interface UploadProgress {
  state: UploadState;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemainingMs: number;
  startTime: number;
  currentTime: number;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Upload progress snapshot for tracking
 */
interface ProgressSnapshot {
  bytesUploaded: number;
  timestamp: number;
}

/**
 * Progress tracker class for managing upload progress
 */
export class UploadProgressTracker {
  private startTime: number = 0;
  private bytesUploaded: number = 0;
  private totalBytes: number = 0;
  private state: UploadState = UploadState.IDLE;
  private snapshots: ProgressSnapshot[] = [];
  private maxSnapshots: number = 10;
  private fileName?: string;
  private error?: string;

  constructor(totalBytes: number, fileName?: string) {
    this.totalBytes = totalBytes;
    this.fileName = fileName;
  }

  /**
   * Start tracking progress
   */
  start(): void {
    this.startTime = Date.now();
    this.state = UploadState.UPLOADING;
    this.bytesUploaded = 0;
    this.snapshots = [];
    this.error = undefined;
  }

  /**
   * Update progress with new bytes uploaded
   */
  update(bytesUploaded: number): void {
    if (this.state !== UploadState.UPLOADING) {
      return;
    }

    this.bytesUploaded = Math.min(bytesUploaded, this.totalBytes);

    // Store snapshot for speed calculation
    const snapshot: ProgressSnapshot = {
      bytesUploaded: this.bytesUploaded,
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Mark upload as preparing
   */
  preparing(): void {
    this.state = UploadState.PREPARING;
  }

  /**
   * Mark upload as processing
   */
  processing(): void {
    this.state = UploadState.PROCESSING;
  }

  /**
   * Mark upload as completed
   */
  complete(): void {
    this.state = UploadState.COMPLETED;
    this.bytesUploaded = this.totalBytes;
  }

  /**
   * Mark upload as failed
   */
  fail(error?: string): void {
    this.state = UploadState.FAILED;
    this.error = error;
  }

  /**
   * Mark upload as cancelled
   */
  cancel(): void {
    this.state = UploadState.CANCELLED;
  }

  /**
   * Pause upload
   */
  pause(): void {
    this.state = UploadState.PAUSED;
  }

  /**
   * Resume upload
   */
  resume(): void {
    if (this.state === UploadState.PAUSED) {
      this.state = UploadState.UPLOADING;
    }
  }

  /**
   * Calculate current upload speed (bytes per second)
   */
  private calculateSpeed(): number {
    if (this.snapshots.length < 2) {
      return 0;
    }

    // Use recent snapshots for more accurate speed
    const recentSnapshots = this.snapshots.slice(-5);
    const oldest = recentSnapshots[0];
    const newest = recentSnapshots[recentSnapshots.length - 1];

    const bytesTransferred = newest.bytesUploaded - oldest.bytesUploaded;
    const timeElapsed = newest.timestamp - oldest.timestamp;

    if (timeElapsed === 0) {
      return 0;
    }

    // Convert to bytes per second
    return (bytesTransferred / timeElapsed) * 1000;
  }

  /**
   * Calculate estimated time remaining in milliseconds
   */
  private calculateTimeRemaining(): number {
    const speed = this.calculateSpeed();

    if (speed === 0 || this.state !== UploadState.UPLOADING) {
      return 0;
    }

    const bytesRemaining = this.totalBytes - this.bytesUploaded;
    return (bytesRemaining / speed) * 1000;
  }

  /**
   * Get current progress information
   */
  getProgress(): UploadProgress {
    const percentage = this.totalBytes > 0
      ? Math.round((this.bytesUploaded / this.totalBytes) * 100)
      : 0;

    return {
      state: this.state,
      bytesUploaded: this.bytesUploaded,
      totalBytes: this.totalBytes,
      percentage,
      speed: this.calculateSpeed(),
      timeRemainingMs: this.calculateTimeRemaining(),
      startTime: this.startTime,
      currentTime: Date.now(),
      fileName: this.fileName,
      fileSize: this.totalBytes,
      error: this.error,
    };
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.startTime = 0;
    this.bytesUploaded = 0;
    this.state = UploadState.IDLE;
    this.snapshots = [];
    this.error = undefined;
  }
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format upload speed for display
 *
 * @param bytesPerSecond - Speed in bytes per second
 * @returns Formatted string (e.g., "2.5 MB/s")
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';

  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format time duration for display
 *
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted string (e.g., "2m 30s", "45s")
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

/**
 * Format upload progress for display
 *
 * @param progress - Upload progress data
 * @returns Formatted progress information
 */
export interface FormattedProgress {
  percentage: string;
  uploaded: string;
  total: string;
  speed: string;
  timeRemaining: string;
  statusText: string;
}

export function formatProgress(progress: UploadProgress): FormattedProgress {
  let statusText = '';

  switch (progress.state) {
    case UploadState.IDLE:
      statusText = 'Ready to upload';
      break;
    case UploadState.PREPARING:
      statusText = 'Preparing upload...';
      break;
    case UploadState.UPLOADING:
      statusText = 'Uploading...';
      break;
    case UploadState.PROCESSING:
      statusText = 'Processing...';
      break;
    case UploadState.COMPLETED:
      statusText = 'Upload complete';
      break;
    case UploadState.FAILED:
      statusText = `Upload failed${progress.error ? `: ${progress.error}` : ''}`;
      break;
    case UploadState.CANCELLED:
      statusText = 'Upload cancelled';
      break;
    case UploadState.PAUSED:
      statusText = 'Upload paused';
      break;
  }

  return {
    percentage: `${progress.percentage}%`,
    uploaded: formatFileSize(progress.bytesUploaded),
    total: formatFileSize(progress.totalBytes),
    speed: formatSpeed(progress.speed),
    timeRemaining: formatDuration(progress.timeRemainingMs),
    statusText,
  };
}

/**
 * Calculate average upload speed over entire duration
 *
 * @param bytesUploaded - Total bytes uploaded
 * @param startTime - Upload start timestamp
 * @returns Speed in bytes per second
 */
export function calculateAverageSpeed(
  bytesUploaded: number,
  startTime: number
): number {
  const elapsedTime = Date.now() - startTime;

  if (elapsedTime === 0) {
    return 0;
  }

  return (bytesUploaded / elapsedTime) * 1000;
}

/**
 * Estimate total upload time based on current progress
 *
 * @param progress - Upload progress data
 * @returns Estimated total time in milliseconds
 */
export function estimateTotalTime(progress: UploadProgress): number {
  if (progress.speed === 0 || progress.bytesUploaded === 0) {
    return 0;
  }

  const elapsedTime = progress.currentTime - progress.startTime;
  const percentComplete = progress.percentage / 100;

  if (percentComplete === 0) {
    return 0;
  }

  return elapsedTime / percentComplete;
}

/**
 * Create a progress message for display
 *
 * @param progress - Upload progress data
 * @returns User-friendly progress message
 */
export function createProgressMessage(progress: UploadProgress): string {
  const formatted = formatProgress(progress);

  switch (progress.state) {
    case UploadState.UPLOADING:
      if (progress.speed > 0 && progress.timeRemainingMs > 1000) {
        return `Uploading ${formatted.percentage} - ${formatted.timeRemaining} remaining`;
      }
      return `Uploading ${formatted.percentage}`;

    case UploadState.PROCESSING:
      return 'Processing your bill...';

    case UploadState.COMPLETED:
      const totalTime = formatDuration(progress.currentTime - progress.startTime);
      return `Upload completed in ${totalTime}`;

    case UploadState.FAILED:
      return formatted.statusText;

    case UploadState.PAUSED:
      return `Paused at ${formatted.percentage}`;

    default:
      return formatted.statusText;
  }
}

/**
 * Get progress color based on state and percentage
 *
 * @param progress - Upload progress data
 * @returns Color identifier (for styling)
 */
export function getProgressColor(progress: UploadProgress): string {
  switch (progress.state) {
    case UploadState.UPLOADING:
    case UploadState.PROCESSING:
      return 'primary';

    case UploadState.COMPLETED:
      return 'success';

    case UploadState.FAILED:
      return 'error';

    case UploadState.PAUSED:
      return 'warning';

    case UploadState.PREPARING:
      return 'info';

    default:
      return 'default';
  }
}

/**
 * Check if upload is in progress
 *
 * @param state - Upload state
 * @returns True if upload is active
 */
export function isUploadInProgress(state: UploadState): boolean {
  return (
    state === UploadState.PREPARING ||
    state === UploadState.UPLOADING ||
    state === UploadState.PROCESSING
  );
}

/**
 * Check if upload is complete (success or failure)
 *
 * @param state - Upload state
 * @returns True if upload is complete
 */
export function isUploadComplete(state: UploadState): boolean {
  return (
    state === UploadState.COMPLETED ||
    state === UploadState.FAILED ||
    state === UploadState.CANCELLED
  );
}

/**
 * Create upload progress from XMLHttpRequest progress event
 *
 * @param event - Progress event from XHR
 * @param totalBytes - Total file size
 * @returns Upload progress data
 */
export function createProgressFromEvent(
  event: ProgressEvent,
  totalBytes: number
): Partial<UploadProgress> {
  return {
    bytesUploaded: event.loaded,
    totalBytes: event.lengthComputable ? event.total : totalBytes,
    percentage: event.lengthComputable
      ? Math.round((event.loaded / event.total) * 100)
      : 0,
  };
}

/**
 * Multiple file upload progress tracker
 */
export class MultiFileUploadTracker {
  private trackers: Map<string, UploadProgressTracker> = new Map();

  /**
   * Add a file to track
   */
  addFile(fileId: string, fileSize: number, fileName?: string): void {
    const tracker = new UploadProgressTracker(fileSize, fileName);
    this.trackers.set(fileId, tracker);
  }

  /**
   * Get tracker for a specific file
   */
  getTracker(fileId: string): UploadProgressTracker | undefined {
    return this.trackers.get(fileId);
  }

  /**
   * Remove a file tracker
   */
  removeFile(fileId: string): void {
    this.trackers.delete(fileId);
  }

  /**
   * Get overall progress across all files
   */
  getOverallProgress(): UploadProgress {
    const trackers = Array.from(this.trackers.values());

    if (trackers.length === 0) {
      return {
        state: UploadState.IDLE,
        bytesUploaded: 0,
        totalBytes: 0,
        percentage: 0,
        speed: 0,
        timeRemainingMs: 0,
        startTime: 0,
        currentTime: Date.now(),
      };
    }

    const totalBytes = trackers.reduce((sum, t) => sum + t.getProgress().totalBytes, 0);
    const bytesUploaded = trackers.reduce((sum, t) => sum + t.getProgress().bytesUploaded, 0);
    const avgSpeed = trackers.reduce((sum, t) => sum + t.getProgress().speed, 0) / trackers.length;

    const percentage = totalBytes > 0 ? Math.round((bytesUploaded / totalBytes) * 100) : 0;

    // Determine overall state
    let state = UploadState.IDLE;
    if (trackers.some(t => t.getProgress().state === UploadState.UPLOADING)) {
      state = UploadState.UPLOADING;
    } else if (trackers.every(t => t.getProgress().state === UploadState.COMPLETED)) {
      state = UploadState.COMPLETED;
    } else if (trackers.some(t => t.getProgress().state === UploadState.FAILED)) {
      state = UploadState.FAILED;
    }

    const bytesRemaining = totalBytes - bytesUploaded;
    const timeRemainingMs = avgSpeed > 0 ? (bytesRemaining / avgSpeed) * 1000 : 0;

    return {
      state,
      bytesUploaded,
      totalBytes,
      percentage,
      speed: avgSpeed,
      timeRemainingMs,
      startTime: Math.min(...trackers.map(t => t.getProgress().startTime)),
      currentTime: Date.now(),
    };
  }

  /**
   * Clear all trackers
   */
  clear(): void {
    this.trackers.clear();
  }
}
