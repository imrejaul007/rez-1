// Toast notification utility for web
// Provides a modern alternative to window.alert()
// For native platforms, use react-native-toast-message instead

import { Platform } from 'react-native';
import { colors } from '@/constants/theme';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  type?: 'success' | 'error' | 'info' | 'warning';
}

class ToastManager {
  private container: any = null; // Use any for cross-platform compatibility

  private getContainer(): any {
    // Only available on web
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return null;
    }

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message: string, options: ToastOptions = {}) {
    // Guard: Only run on web
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      // On native, just log the message (use react-native-toast-message for real toasts)
      return;
    }

    const {
      duration = 5000,
      position = 'top-right',
      type = 'info'
    } = options;

    const container = this.getContainer();
    if (!container) return;

    // Update container position
    this.updateContainerPosition(container, position);

    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      min-width: 300px;
      pointer-events: auto;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      font-size: 14px;
      line-height: 1.5;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    // Add icon
    const icon = this.getIcon(type);
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    iconSpan.style.cssText = 'font-size: 20px;';

    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    messageSpan.style.cssText = 'flex: 1;';

    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;
      line-height: 1;
      opacity: 0.8;
    `;
    closeBtn.onclick = () => this.removeToast(toast);
    toast.appendChild(closeBtn);

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    if (!document.getElementById('toast-animations')) {
      style.id = 'toast-animations';
      document.head.appendChild(style);
    }

    // Add to container
    container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }

    // Click to dismiss
    toast.onclick = () => this.removeToast(toast);
  }

  private removeToast(toast: HTMLDivElement) {
    // Guard: Only run on web
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
      // Clean up container if empty
      if (this.container && this.container.children.length === 0) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
  }

  private updateContainerPosition(container: HTMLDivElement, position: string) {
    // Reset all position values
    container.style.top = 'auto';
    container.style.bottom = 'auto';
    container.style.left = 'auto';
    container.style.right = 'auto';

    const margin = '20px';

    switch (position) {
      case 'top':
        container.style.top = margin;
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        container.style.bottom = margin;
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        break;
      case 'top-left':
        container.style.top = margin;
        container.style.left = margin;
        break;
      case 'top-right':
        container.style.top = margin;
        container.style.right = margin;
        break;
      case 'bottom-left':
        container.style.bottom = margin;
        container.style.left = margin;
        break;
      case 'bottom-right':
        container.style.bottom = margin;
        container.style.right = margin;
        break;
    }
  }

  private getBackgroundColor(type: string): string {
    switch (type) {
      case 'success':
        return '#10B981'; // Green
      case 'error':
        return colors.error; // Red
      case 'warning':
        return '#F59E0B'; // Orange
      case 'info':
      default:
        return '#3B82F6'; // Blue
    }
  }

  private getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  }

  success(message: string, options?: Omit<ToastOptions, 'type'>) {
    this.show(message, { ...options, type: 'success' });
  }

  error(message: string, options?: Omit<ToastOptions, 'type'>) {
    this.show(message, { ...options, type: 'error' });
  }

  warning(message: string, options?: Omit<ToastOptions, 'type'>) {
    this.show(message, { ...options, type: 'warning' });
  }

  info(message: string, options?: Omit<ToastOptions, 'type'>) {
    this.show(message, { ...options, type: 'info' });
  }
}

// Export singleton instance
export const toast = new ToastManager();

// Export convenience methods
export default toast;
