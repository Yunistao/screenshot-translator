"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unregisterAllShortcuts = exports.unregisterGlobalShortcut = exports.registerGlobalShortcut = void 0;
const electron_1 = require("electron");
const registerGlobalShortcut = (key, callback) => {
    return electron_1.globalShortcut.register(key, callback);
};
exports.registerGlobalShortcut = registerGlobalShortcut;
const unregisterGlobalShortcut = (key) => {
    electron_1.globalShortcut.unregister(key);
};
exports.unregisterGlobalShortcut = unregisterGlobalShortcut;
const unregisterAllShortcuts = () => {
    electron_1.globalShortcut.unregisterAll();
};
exports.unregisterAllShortcuts = unregisterAllShortcuts;
//# sourceMappingURL=keyListener.js.map