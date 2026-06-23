interface NavigationEvent {
  timestamp: number;
  from: string;
  to: string;
  trigger: string;
}

class NavigationDebugger {
  private events: NavigationEvent[] = [];
  private maxEvents = 50;

  logNavigation(from: string, to: string, trigger: string) {
    const event: NavigationEvent = {
      timestamp: Date.now(),
      from,
      to,
      trigger,
    };

    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Check for potential loops
    this.detectNavigationLoops();
  }

  private detectNavigationLoops() {
    const recentEvents = this.events.slice(-5); // Check last 5 navigations
    const now = Date.now();
    
    // Look for rapid back-and-forth navigation
    const rapidEvents = recentEvents.filter(event => 
      now - event.timestamp < 2000 // Within 2 seconds
    );

    if (rapidEvents.length >= 3) {
      const routes = rapidEvents.map(e => e.to);
      const hasCycling = routes.some((route, index) => 
        routes.indexOf(route) !== index
      );

      if (hasCycling) {
      }
    }
  }

  getRecentEvents(count: number = 10): NavigationEvent[] {
    return this.events.slice(-count);
  }

  clear() {
    this.events = [];
  }
}

export const navigationDebugger = new NavigationDebugger();
