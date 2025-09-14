/**
 * DOM utility functions for Web Components
 */
export declare function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, attributes?: Record<string, string>, ...children: (string | Node)[]): HTMLElementTagNameMap[K];
export declare function createElementFromHTML(html: string): DocumentFragment;
export declare function generateId(prefix?: string): string;
export declare function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => void>(func: T, limit: number): (...args: Parameters<T>) => void;
export declare function escapeHtml(text: string): string;
export declare function formatTimestamp(date: Date): string;
//# sourceMappingURL=dom-helpers.d.ts.map