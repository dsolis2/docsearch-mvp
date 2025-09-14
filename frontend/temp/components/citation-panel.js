"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGCitationPanel = void 0;
var RAGCitationPanel = /** @class */ (function (_super) {
    __extends(RAGCitationPanel, _super);
    function RAGCitationPanel() {
        var _this = _super.call(this) || this;
        _this.citations = [];
        _this.isVisible = false;
        _this._shadowRoot = _this.attachShadow({ mode: 'open' });
        _this.setupComponent();
        return _this;
    }
    RAGCitationPanel.prototype.connectedCallback = function () {
        this.render();
    };
    RAGCitationPanel.prototype.setupComponent = function () {
        var style = document.createElement('style');
        style.textContent = "\n      :host {\n        display: block;\n        background: var(--rag-surface-color, #f8fafc);\n        border-top: 1px solid var(--rag-border-color, #e2e8f0);\n        max-height: 250px;\n        overflow: hidden;\n        transition: all 0.3s ease;\n      }\n      \n      :host([hidden]) {\n        display: none;\n      }\n      \n      .citation-panel {\n        display: flex;\n        flex-direction: column;\n        height: 100%;\n      }\n      \n      .panel-header {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);\n        background: var(--rag-background-color, #ffffff);\n        border-bottom: 1px solid var(--rag-border-color, #e2e8f0);\n        font-size: var(--rag-font-size-sm, 0.875rem);\n        font-weight: 600;\n        color: var(--rag-text-secondary, #64748b);\n      }\n      \n      .panel-title {\n        display: flex;\n        align-items: center;\n        gap: 0.5rem;\n      }\n      \n      .citation-count {\n        background: var(--rag-primary-color, #2563eb);\n        color: white;\n        padding: 0.125rem 0.375rem;\n        border-radius: 0.75rem;\n        font-size: 0.75rem;\n        font-weight: 500;\n      }\n      \n      .close-button {\n        background: none;\n        border: none;\n        cursor: pointer;\n        padding: 0.25rem;\n        border-radius: 0.25rem;\n        color: var(--rag-text-muted, #94a3b8);\n        transition: all 0.2s ease;\n      }\n      \n      .close-button:hover {\n        background: var(--rag-surface-color, #f8fafc);\n        color: var(--rag-text-secondary, #64748b);\n      }\n      \n      .citation-list {\n        flex: 1;\n        overflow-y: auto;\n        padding: var(--rag-spacing-sm, 0.5rem);\n      }\n      \n      .citation {\n        display: flex;\n        flex-direction: column;\n        padding: var(--rag-spacing-sm, 0.5rem);\n        margin-bottom: var(--rag-spacing-sm, 0.5rem);\n        background: var(--rag-background-color, #ffffff);\n        border: 1px solid var(--rag-border-color, #e2e8f0);\n        border-radius: var(--rag-border-radius-sm, 0.25rem);\n        cursor: pointer;\n        transition: all 0.2s ease;\n        text-decoration: none;\n        color: inherit;\n      }\n      \n      .citation:hover {\n        border-color: var(--rag-primary-color, #2563eb);\n        box-shadow: var(--rag-shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));\n        transform: translateY(-1px);\n      }\n      \n      .citation:last-child {\n        margin-bottom: 0;\n      }\n      \n      .citation__header {\n        display: flex;\n        justify-content: space-between;\n        align-items: flex-start;\n        margin-bottom: var(--rag-spacing-xs, 0.25rem);\n        gap: var(--rag-spacing-sm, 0.5rem);\n      }\n      \n      .citation__title {\n        font-weight: 600;\n        font-size: var(--rag-font-size-sm, 0.875rem);\n        color: var(--rag-text-primary, #1e293b);\n        line-height: 1.4;\n        flex: 1;\n        margin: 0;\n      }\n      \n      .citation__score {\n        font-size: 0.75rem;\n        color: var(--rag-text-muted, #94a3b8);\n        background: var(--rag-surface-color, #f8fafc);\n        padding: 0.125rem 0.375rem;\n        border-radius: 0.75rem;\n        white-space: nowrap;\n        flex-shrink: 0;\n      }\n      \n      .citation__snippet {\n        font-size: var(--rag-font-size-sm, 0.875rem);\n        color: var(--rag-text-secondary, #64748b);\n        line-height: 1.4;\n        margin-bottom: var(--rag-spacing-xs, 0.25rem);\n        display: -webkit-box;\n        -webkit-line-clamp: 3;\n        -webkit-box-orient: vertical;\n        overflow: hidden;\n      }\n      \n      .citation__meta {\n        display: flex;\n        justify-content: space-between;\n        align-items: center;\n        font-size: 0.75rem;\n        color: var(--rag-text-muted, #94a3b8);\n        gap: var(--rag-spacing-sm, 0.5rem);\n      }\n      \n      .citation__file-info {\n        display: flex;\n        align-items: center;\n        gap: 0.25rem;\n        flex: 1;\n      }\n      \n      .file-type-badge {\n        padding: 0.0625rem 0.25rem;\n        background: var(--rag-primary-color, #2563eb);\n        color: white;\n        border-radius: 0.25rem;\n        font-size: 0.625rem;\n        font-weight: 600;\n        text-transform: uppercase;\n      }\n      \n      .citation__page {\n        white-space: nowrap;\n      }\n      \n      .external-link-icon {\n        width: 0.875rem;\n        height: 0.875rem;\n        opacity: 0.5;\n        transition: opacity 0.2s ease;\n      }\n      \n      .citation:hover .external-link-icon {\n        opacity: 1;\n      }\n      \n      .empty-state {\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        justify-content: center;\n        padding: var(--rag-spacing-xl, 2rem);\n        text-align: center;\n        color: var(--rag-text-secondary, #64748b);\n      }\n      \n      .empty-state__icon {\n        font-size: 2rem;\n        margin-bottom: var(--rag-spacing-sm, 0.5rem);\n        opacity: 0.5;\n      }\n      \n      .empty-state__message {\n        font-size: var(--rag-font-size-sm, 0.875rem);\n      }\n      \n      /* Scrollbar styling */\n      .citation-list::-webkit-scrollbar {\n        width: 6px;\n      }\n      \n      .citation-list::-webkit-scrollbar-track {\n        background: var(--rag-surface-color, #f8fafc);\n      }\n      \n      .citation-list::-webkit-scrollbar-thumb {\n        background: var(--rag-border-color, #e2e8f0);\n        border-radius: 3px;\n      }\n      \n      .citation-list::-webkit-scrollbar-thumb:hover {\n        background: var(--rag-text-muted, #94a3b8);\n      }\n    ";
        this._shadowRoot.appendChild(style);
    };
    RAGCitationPanel.prototype.render = function () {
        var _this = this;
        var container = document.createElement('div');
        container.className = 'citation-panel';
        // Header
        var header = document.createElement('div');
        header.className = 'panel-header';
        var title = document.createElement('div');
        title.className = 'panel-title';
        title.innerHTML = "\n      <span>Sources</span>\n      <span class=\"citation-count\">".concat(this.citations.length, "</span>\n    ");
        var closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '✕';
        closeButton.setAttribute('aria-label', 'Close citations panel');
        closeButton.addEventListener('click', function () { return _this.hide(); });
        header.appendChild(title);
        header.appendChild(closeButton);
        // Citation list
        var listContainer = document.createElement('div');
        listContainer.className = 'citation-list';
        this.renderCitations(listContainer);
        container.appendChild(header);
        container.appendChild(listContainer);
        this._shadowRoot.appendChild(container);
    };
    RAGCitationPanel.prototype.renderCitations = function (container) {
        var _this = this;
        if (this.citations.length === 0) {
            this.renderEmptyState(container);
            return;
        }
        container.innerHTML = '';
        this.citations.forEach(function (citation, index) {
            var citationElement = _this.createCitationElement(citation, index);
            container.appendChild(citationElement);
        });
    };
    RAGCitationPanel.prototype.renderEmptyState = function (container) {
        container.innerHTML = "\n      <div class=\"empty-state\">\n        <div class=\"empty-state__icon\">\uD83D\uDCC4</div>\n        <div class=\"empty-state__message\">\n          No sources available for this message\n        </div>\n      </div>\n    ";
    };
    RAGCitationPanel.prototype.createCitationElement = function (citation, index) {
        var _this = this;
        var _a;
        var element = document.createElement('a');
        element.className = 'citation';
        element.href = citation.source_file_url;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        // Header with title and relevance score
        var header = document.createElement('div');
        header.className = 'citation__header';
        var title = document.createElement('h4');
        title.className = 'citation__title';
        title.textContent = citation.source_file_name;
        header.appendChild(title);
        if (citation.relevance_score !== undefined) {
            var score = document.createElement('div');
            score.className = 'citation__score';
            score.textContent = "".concat(Math.round(citation.relevance_score * 100), "%");
            header.appendChild(score);
        }
        // Content snippet
        var snippet = document.createElement('div');
        snippet.className = 'citation__snippet';
        snippet.textContent = citation.content_snippet;
        // Meta information
        var meta = document.createElement('div');
        meta.className = 'citation__meta';
        var fileInfo = document.createElement('div');
        fileInfo.className = 'citation__file-info';
        // File type badge
        if ((_a = citation.metadata) === null || _a === void 0 ? void 0 : _a.file_type) {
            var typeBadge = document.createElement('span');
            typeBadge.className = 'file-type-badge';
            typeBadge.textContent = this.getFileTypeDisplay(citation.metadata.file_type);
            fileInfo.appendChild(typeBadge);
        }
        // File name (truncated)
        var fileName = document.createElement('span');
        fileName.textContent = this.truncateFileName(citation.source_file_name, 30);
        fileInfo.appendChild(fileName);
        meta.appendChild(fileInfo);
        // Page number if available
        if (citation.page_number) {
            var pageInfo = document.createElement('div');
            pageInfo.className = 'citation__page';
            pageInfo.textContent = "Page ".concat(citation.page_number);
            meta.appendChild(pageInfo);
        }
        // External link icon
        var linkIcon = document.createElement('div');
        linkIcon.className = 'external-link-icon';
        linkIcon.innerHTML = '↗';
        meta.appendChild(linkIcon);
        element.appendChild(header);
        element.appendChild(snippet);
        element.appendChild(meta);
        // Add click tracking
        element.addEventListener('click', function () {
            _this.trackCitationClick(citation, index);
        });
        return element;
    };
    RAGCitationPanel.prototype.getFileTypeDisplay = function (fileType) {
        var typeMap = {
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
    };
    RAGCitationPanel.prototype.truncateFileName = function (fileName, maxLength) {
        if (fileName.length <= maxLength)
            return fileName;
        var extension = fileName.split('.').pop();
        var nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        var truncated = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
        return "".concat(truncated, ".").concat(extension);
    };
    RAGCitationPanel.prototype.trackCitationClick = function (citation, index) {
        // Emit event for analytics/tracking
        var event = new CustomEvent('rag-citation-clicked', {
            detail: { citation: citation, index: index },
            bubbles: true
        });
        this.dispatchEvent(event);
    };
    RAGCitationPanel.prototype.updateHeader = function () {
        var countElement = this._shadowRoot.querySelector('.citation-count');
        if (countElement) {
            countElement.textContent = this.citations.length.toString();
        }
    };
    // Public API
    RAGCitationPanel.prototype.setCitations = function (citations) {
        this.citations = citations;
        this.updateHeader();
        var listContainer = this._shadowRoot.querySelector('.citation-list');
        if (listContainer) {
            this.renderCitations(listContainer);
        }
    };
    RAGCitationPanel.prototype.addCitation = function (citation) {
        this.citations.push(citation);
        this.setCitations(this.citations);
    };
    RAGCitationPanel.prototype.clearCitations = function () {
        this.citations = [];
        this.setCitations(this.citations);
    };
    RAGCitationPanel.prototype.show = function () {
        this.isVisible = true;
        this.style.display = 'block';
        // Emit show event
        var event = new CustomEvent('rag-citation-panel-show', {
            bubbles: true
        });
        this.dispatchEvent(event);
    };
    RAGCitationPanel.prototype.hide = function () {
        this.isVisible = false;
        this.style.display = 'none';
        // Emit hide event
        var event = new CustomEvent('rag-citation-panel-hide', {
            bubbles: true
        });
        this.dispatchEvent(event);
    };
    RAGCitationPanel.prototype.toggle = function () {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    };
    RAGCitationPanel.prototype.getCitations = function () {
        return __spreadArray([], this.citations, true);
    };
    RAGCitationPanel.prototype.isShowing = function () {
        return this.isVisible;
    };
    return RAGCitationPanel;
}(HTMLElement));
exports.RAGCitationPanel = RAGCitationPanel;
// Register the custom element
customElements.define('rag-citation-panel', RAGCitationPanel);
