(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/chat/slash-command-palette.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SlashCommandPalette",
    ()=>SlashCommandPalette
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAui.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function SlashCommandPalette(param) {
    let { query, highlightedIndex, onSelect, className } = param;
    _s();
    const aui = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"])();
    const visibleItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SlashCommandPalette.useMemo[visibleItems]": ()=>{
            const normalized = query.trim().toLowerCase().replace(/^\//, "");
            if (!normalized) return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SLASH_COMMANDS"];
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SLASH_COMMANDS"].filter({
                "SlashCommandPalette.useMemo[visibleItems]": (command)=>"".concat(command.surface, " ").concat(command.operation, " ").concat(command.label, " ").concat(command.hint).toLowerCase().includes(normalized)
            }["SlashCommandPalette.useMemo[visibleItems]"]);
        }
    }["SlashCommandPalette.useMemo[visibleItems]"], [
        query
    ]);
    const groupedItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SlashCommandPalette.useMemo[groupedItems]": ()=>{
            return visibleItems.reduce({
                "SlashCommandPalette.useMemo[groupedItems]": (groups, item)=>{
                    const key = item.surface;
                    var _groups_key;
                    groups[key] = [
                        ...(_groups_key = groups[key]) !== null && _groups_key !== void 0 ? _groups_key : [],
                        item
                    ];
                    return groups;
                }
            }["SlashCommandPalette.useMemo[groupedItems]"], {});
        }
    }["SlashCommandPalette.useMemo[groupedItems]"], [
        visibleItems
    ]);
    const submitOrInsert = (item)=>{
        aui.composer().setText(item.template);
        onSelect === null || onSelect === void 0 ? void 0 : onSelect(item);
        if (!item.template.endsWith(" ")) {
            queueMicrotask(()=>{
                aui.composer().send();
            });
        }
    };
    if (!query.startsWith("/") || visibleItems.length === 0) return null;
    let flatIndex = -1;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("max-h-[min(24rem,calc(100vh-16rem))] overflow-y-auto overscroll-contain rounded-[1.2rem] border border-border/80 bg-white p-2 shadow-[0_22px_60px_rgba(36,29,20,0.16)] backdrop-blur-sm", className),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-3",
            children: Object.entries(groupedItems).map((param)=>{
                let [group, items] = param;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-3 py-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                variant: "secondary",
                                className: "uppercase tracking-[0.12em]",
                                children: group
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                                lineNumber: 66,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this),
                        items.map((item)=>{
                            flatIndex += 1;
                            const isHighlighted = flatIndex === highlightedIndex;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>submitOrInsert(item),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex w-full items-start justify-between gap-3 rounded-[1rem] px-3 py-3 text-left transition-colors", isHighlighted ? "bg-secondary/90" : "hover:bg-secondary/65"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-medium",
                                                children: item.label
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                                                lineNumber: 84,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-muted-foreground",
                                                children: item.hint
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                                                lineNumber: 85,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                                        lineNumber: 83,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                        className: "rounded-full bg-background px-2 py-1 text-[11px] text-muted-foreground",
                                        children: item.template.trim()
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                                        lineNumber: 87,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, item.template, true, {
                                fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                                lineNumber: 74,
                                columnNumber: 15
                            }, this);
                        })
                    ]
                }, group, true, {
                    fileName: "[project]/src/components/chat/slash-command-palette.tsx",
                    lineNumber: 64,
                    columnNumber: 11
                }, this);
            })
        }, void 0, false, {
            fileName: "[project]/src/components/chat/slash-command-palette.tsx",
            lineNumber: 62,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/slash-command-palette.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_s(SlashCommandPalette, "QpeWmjVCvrs6febDEDLGgs/N7rU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"]
    ];
});
_c = SlashCommandPalette;
var _c;
__turbopack_context__.k.register(_c, "SlashCommandPalette");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/slash-command-palette.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/chat/slash-command-palette.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_components_chat_slash-command-palette_tsx_76adfa16._.js.map