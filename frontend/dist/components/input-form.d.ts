export declare class RAGInputForm extends HTMLElement {
    private _shadowRoot;
    private textarea;
    private submitButton;
    private isEnabled;
    private isSubmitting;
    constructor();
    connectedCallback(): void;
    private setupComponent;
    private render;
    private setupEventListeners;
    private autoResize;
    private updateCharCounter;
    private showCharCounter;
    private hideCharCounter;
    private handleSubmit;
    private setSubmitting;
    private updateButtonState;
    focus(): void;
    setValue(value: string): void;
    getValue(): string;
    setEnabled(enabled: boolean): void;
    clear(): void;
}
//# sourceMappingURL=input-form.d.ts.map