/**
 * Simple RAG Chat Frontend - Test Entry Point
 */

console.log('RAG Chat System Loading...');

// Simple class to test compilation
export class SimpleRAGChat {
  private container: HTMLElement;
  
  constructor(container: HTMLElement | string) {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container element "${container}" not found`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = container;
    }
    
    this.init();
  }
  
  private init() {
    this.container.innerHTML = `
      <div style="padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
        <h2>RAG Chat System</h2>
        <p>Frontend is loading...</p>
      </div>
    `;
  }
}

// Make it available globally
(window as any).SimpleRAGChat = SimpleRAGChat;

export default SimpleRAGChat;