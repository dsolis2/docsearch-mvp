import type { Citation } from '../types/message.types';
export declare class RAGCitationPanel extends HTMLElement {
    private _shadowRoot;
    private citations;
    private isVisible;
    constructor();
    connectedCallback(): void;
    private setupComponent;
    private render;
    private renderCitations;
    private renderEmptyState;
    private createCitationElement;
    private getFileTypeDisplay;
    private truncateFileName;
    private trackCitationClick;
    private updateHeader;
    setCitations(citations: Citation[]): void;
    addCitation(citation: Citation): void;
    clearCitations(): void;
    show(): void;
    hide(): void;
    toggle(): void;
    getCitations(): Citation[];
    isShowing(): boolean;
}
//# sourceMappingURL=citation-panel.d.ts.map