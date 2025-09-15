import type { Message } from '../types/message.types';
export declare class RAGMessageList extends HTMLElement {
    private _shadowRoot;
    private messages;
    private messageContainer;
    constructor();
    connectedCallback(): void;
    private setupComponent;
    private render;
    private renderMessages;
    private renderEmptyState;
    private createMessageElement;
    private formatMessageContent;
    private getStatusText;
    private createCitationIndicators;
    private scrollToBottom;
    addMessage(message: Message): void;
    updateMessage(updatedMessage: Message): void;
    clearMessages(): void;
    getMessages(): Message[];
    streamMessageUpdate(messageId: string, contentDelta: string): void;
    updateStreamingMessage(messageId: string, contentDelta: string): void;
    completeMessage(messageId: string): void;
}
//# sourceMappingURL=message-list.d.ts.map