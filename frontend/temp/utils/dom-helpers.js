"use strict";
/**
 * DOM utility functions for Web Components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createElement = createElement;
exports.createElementFromHTML = createElementFromHTML;
exports.generateId = generateId;
exports.debounce = debounce;
exports.throttle = throttle;
exports.escapeHtml = escapeHtml;
exports.formatTimestamp = formatTimestamp;
function createElement(tagName, attributes) {
    if (attributes === void 0) { attributes = {}; }
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    var element = document.createElement(tagName);
    Object.entries(attributes).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        if (key === 'className') {
            element.className = value;
        }
        else {
            element.setAttribute(key, value);
        }
    });
    children.forEach(function (child) {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        }
        else {
            element.appendChild(child);
        }
    });
    return element;
}
function createElementFromHTML(html) {
    var template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
}
function generateId(prefix) {
    if (prefix === void 0) { prefix = 'id'; }
    return "".concat(prefix, "-").concat(Math.random().toString(36).substr(2, 9));
}
function debounce(func, wait) {
    var timeout;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        clearTimeout(timeout);
        timeout = setTimeout(function () { return func.apply(null, args); }, wait);
    };
}
function throttle(func, limit) {
    var inThrottle;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!inThrottle) {
            func.apply(null, args);
            inThrottle = true;
            setTimeout(function () { return inThrottle = false; }, limit);
        }
    };
}
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function formatTimestamp(date) {
    var now = new Date();
    var diff = now.getTime() - date.getTime();
    var seconds = Math.floor(diff / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    if (days > 0) {
        return date.toLocaleDateString();
    }
    else if (hours > 0) {
        return "".concat(hours, "h ago");
    }
    else if (minutes > 0) {
        return "".concat(minutes, "m ago");
    }
    else {
        return 'Just now';
    }
}
