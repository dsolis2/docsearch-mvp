import type { Citation } from '../types/message.types';

export class RAGCitationPanel extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private citations: Citation[] = [];
  private isVisible = false;
  
  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this.setupComponent();
  }
  
  connectedCallback() {
    this.render();
  }
  
  private setupComponent() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        background: var(--rag-surface-color, #f8fafc);
        border-top: 1px solid var(--rag-border-color, #e2e8f0);
        max-height: 250px;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      :host([hidden]) {
        display: none;
      }
      
      .citation-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);
        background: var(--rag-background-color, #ffffff);
        border-bottom: 1px solid var(--rag-border-color, #e2e8f0);
        font-size: var(--rag-font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--rag-text-secondary, #64748b);
      }
      
      .panel-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .citation-count {
        background: var(--rag-primary-color, #2563eb);
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 0.75rem;
        font-size: 0.75rem;
        font-weight: 500;
      }
      
      .close-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
        color: var(--rag-text-muted, #94a3b8);
        transition: all 0.2s ease;
      }
      
      .close-button:hover {
        background: var(--rag-surface-color, #f8fafc);
        color: var(--rag-text-secondary, #64748b);
      }
      
      .citation-list {
        flex: 1;
        overflow-y: auto;
        padding: var(--rag-spacing-sm, 0.5rem);
      }
      
      .citation {
        display: flex;
        flex-direction: column;
        padding: var(--rag-spacing-sm, 0.5rem);
        margin-bottom: var(--rag-spacing-sm, 0.5rem);
        background: var(--rag-background-color, #ffffff);
        border: 1px solid var(--rag-border-color, #e2e8f0);
        border-radius: var(--rag-border-radius-sm, 0.25rem);
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        color: inherit;
      }
      
      .citation:hover {
        border-color: var(--rag-primary-color, #2563eb);
        box-shadow: var(--rag-shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
        transform: translateY(-1px);
      }
      
      .citation:last-child {
        margin-bottom: 0;
      }
      
      .citation__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--rag-spacing-xs, 0.25rem);
        gap: var(--rag-spacing-sm, 0.5rem);
      }
      
      .citation__title {
        font-weight: 600;
        font-size: var(--rag-font-size-sm, 0.875rem);
        color: var(--rag-text-primary, #1e293b);
        line-height: 1.4;
        flex: 1;
        margin: 0;
      }
      
      .citation__score {
        font-size: 0.75rem;
        color: var(--rag-text-muted, #94a3b8);
        background: var(--rag-surface-color, #f8fafc);
        padding: 0.125rem 0.375rem;
        border-radius: 0.75rem;
        white-space: nowrap;
        flex-shrink: 0;
      }
      
      .citation__snippet {
        font-size: var(--rag-font-size-sm, 0.875rem);
        color: var(--rag-text-secondary, #64748b);
        line-height: 1.4;
        margin-bottom: var(--rag-spacing-xs, 0.25rem);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .citation__meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: var(--rag-text-muted, #94a3b8);
        gap: var(--rag-spacing-sm, 0.5rem);
      }
      
      .citation__file-info {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex: 1;
      }
      
      .file-type-badge {
        padding: 0.0625rem 0.25rem;
        background: var(--rag-primary-color, #2563eb);
        color: white;
        border-radius: 0.25rem;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .citation__page {
        white-space: nowrap;
      }
      
      .external-link-icon {
        width: 0.875rem;
        height: 0.875rem;
        opacity: 0.5;
        transition: opacity 0.2s ease;
      }
      
      .citation:hover .external-link-icon {
        opacity: 1;
      }
      
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--rag-spacing-xl, 2rem);
        text-align: center;
        color: var(--rag-text-secondary, #64748b);
      }
      
      .empty-state__icon {
        font-size: 2rem;
        margin-bottom: var(--rag-spacing-sm, 0.5rem);
        opacity: 0.5;
      }
      
      .empty-state__message {
        font-size: var(--rag-font-size-sm, 0.875rem);
      }
      
      /* Scrollbar styling */
      .citation-list::-webkit-scrollbar {
        width: 6px;
      }
      
      .citation-list::-webkit-scrollbar-track {
        background: var(--rag-surface-color, #f8fafc);
      }
      
      .citation-list::-webkit-scrollbar-thumb {
        background: var(--rag-border-color, #e2e8f0);
        border-radius: 3px;
      }
      
      .citation-list::-webkit-scrollbar-thumb:hover {
        background: var(--rag-text-muted, #94a3b8);
      }
    `;
    
    this._shadowRoot.appendChild(style);
  }
  
  private render() {
    const container = document.createElement('div');
    container.className = 'citation-panel';
    
    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = `
      <span>Sources</span>
      <span class="citation-count">${this.citations.length}</span>
    `;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '✕';
    closeButton.setAttribute('aria-label', 'Close citations panel');
    closeButton.addEventListener('click', () => this.hide());
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Citation list
    const listContainer = document.createElement('div');
    listContainer.className = 'citation-list';
    
    this.renderCitations(listContainer);
    
    container.appendChild(header);
    container.appendChild(listContainer);
    
    this._shadowRoot.appendChild(container);
  }
  
  private renderCitations(container: HTMLElement) {
    if (this.citations.length === 0) {
      this.renderEmptyState(container);
      return;
    }
    
    container.innerHTML = '';
    
    this.citations.forEach((citation, index) => {
      const citationElement = this.createCitationElement(citation, index);
      container.appendChild(citationElement);
    });
  }
  
  private renderEmptyState(container: HTMLElement) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📄</div>
        <div class="empty-state__message">
          No sources available for this message
        </div>
      </div>
    `;
  }
  
  private createCitationElement(citation: Citation, index: number): HTMLElement {
    const element = document.createElement('a');
    element.className = 'citation';
    element.href = citation.source_file_url;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    
    // Header with title and relevance score
    const header = document.createElement('div');
    header.className = 'citation__header';
    
    const title = document.createElement('h4');
    title.className = 'citation__title';
    title.textContent = citation.source_file_name;
    
    header.appendChild(title);
    
    if (citation.relevance_score !== undefined) {
      const score = document.createElement('div');
      score.className = 'citation__score';
      score.textContent = `${Math.round(citation.relevance_score * 100)}%`;
      header.appendChild(score);
    }
    
    // Content snippet
    const snippet = document.createElement('div');
    snippet.className = 'citation__snippet';
    snippet.textContent = citation.content_snippet;
    
    // Meta information
    const meta = document.createElement('div');
    meta.className = 'citation__meta';
    
    const fileInfo = document.createElement('div');
    fileInfo.className = 'citation__file-info';
    
    // File type badge
    if (citation.metadata?.file_type) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'file-type-badge';
      typeBadge.textContent = this.getFileTypeDisplay(citation.metadata.file_type);
      fileInfo.appendChild(typeBadge);
    }
    
    // File name (truncated)
    const fileName = document.createElement('span');
    fileName.textContent = this.truncateFileName(citation.source_file_name, 30);
    fileInfo.appendChild(fileName);
    
    meta.appendChild(fileInfo);
    
    // Page number if available
    if (citation.page_number) {
      const pageInfo = document.createElement('div');
      pageInfo.className = 'citation__page';
      pageInfo.textContent = `Page ${citation.page_number}`;
      meta.appendChild(pageInfo);
    }
    
    // External link icon
    const linkIcon = document.createElement('div');
    linkIcon.className = 'external-link-icon';
    linkIcon.innerHTML = '↗';
    meta.appendChild(linkIcon);
    
    element.appendChild(header);
    element.appendChild(snippet);
    element.appendChild(meta);
    
    // Add click tracking
    element.addEventListener('click', () => {
      this.trackCitationClick(citation, index);
    });
    
    return element;
  }
  
  private getFileTypeDisplay(fileType: string): string {
    const typeMap: Record<string, string> = {
      'pdf': 'PDF',
      'doc': 'DOC',
      'docx': 'DOCX',
      'txt': 'TXT',
      'md': 'MD',
      'html': 'HTML',
      'xlsx': 'XLSX',
      'pptx': 'PPTX'
    };
    
    return typeMap[fileType.toLowerCase()] || fileType.toUpperCase();
  }
  
  private truncateFileName(fileName: string, maxLength: number): string {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...';
    
    return `${truncated}.${extension}`;
  }
  
  private trackCitationClick(citation: Citation, index: number) {
    // Emit event for analytics/tracking
    const event = new CustomEvent('rag-citation-clicked', {
      detail: { citation, index },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  
  private updateHeader() {
    const countElement = this._shadowRoot.querySelector('.citation-count');
    if (countElement) {
      countElement.textContent = this.citations.length.toString();
    }
  }
  
  // Public API
  public setCitations(citations: Citation[]) {
    this.citations = citations;
    this.updateHeader();
    
    const listContainer = this._shadowRoot.querySelector('.citation-list');
    if (listContainer) {
      this.renderCitations(listContainer as HTMLElement);
    }
  }
  
  public addCitation(citation: Citation) {
    this.citations.push(citation);
    this.setCitations(this.citations);
  }
  
  public clearCitations() {
    this.citations = [];
    this.setCitations(this.citations);
  }
  
  public show() {
    this.isVisible = true;
    this.style.display = 'block';
    
    // Emit show event
    const event = new CustomEvent('rag-citation-panel-show', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  
  public hide() {
    this.isVisible = false;
    this.style.display = 'none';
    
    // Emit hide event
    const event = new CustomEvent('rag-citation-panel-hide', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  
  public toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  public getCitations(): Citation[] {
    return [...this.citations];
  }
  
  public isShowing(): boolean {
    return this.isVisible;
  }
}

// Register the custom element
if (!customElements.get('rag-citation-panel')) {
  customElements.define('rag-citation-panel', RAGCitationPanel);
}
