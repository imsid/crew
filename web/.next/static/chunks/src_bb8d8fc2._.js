(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/commands.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SLASH_COMMANDS",
    ()=>SLASH_COMMANDS,
    "executeInlineCommand",
    ()=>executeInlineCommand,
    "parseSlashCommand",
    ()=>parseSlashCommand
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
const SLASH_COMMANDS = [
    {
        surface: "metrics",
        operation: "list",
        label: "Metrics list",
        hint: "List available metric configs",
        template: "/metrics list"
    },
    {
        surface: "metrics",
        operation: "search",
        label: "Metrics search",
        hint: "Filter metrics by identifier",
        template: "/metrics search "
    },
    {
        surface: "metrics",
        operation: "show",
        label: "Metrics show",
        hint: "Inspect a metric and SQL preview",
        template: "/metrics show "
    },
    {
        surface: "experiments",
        operation: "list",
        label: "Experiments list",
        hint: "List experiment configs",
        template: "/experiments list"
    },
    {
        surface: "experiments",
        operation: "search",
        label: "Experiments search",
        hint: "Filter experiments by identifier",
        template: "/experiments search "
    },
    {
        surface: "experiments",
        operation: "show",
        label: "Experiments show",
        hint: "Inspect an experiment and its SQL plan",
        template: "/experiments show "
    },
    {
        surface: "artifacts",
        operation: "list",
        label: "Artifacts list",
        hint: "Browse team artifacts",
        template: "/artifacts list"
    },
    {
        surface: "artifacts",
        operation: "search",
        label: "Artifacts search",
        hint: "Search artifact titles and summaries",
        template: "/artifacts search "
    },
    {
        surface: "artifacts",
        operation: "show",
        label: "Artifacts show",
        hint: "Open a Markdown artifact",
        template: "/artifacts show "
    }
];
function parseSlashCommand(input) {
    var _parts_;
    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) return null;
    const parts = trimmed.split(/\s+/);
    const surface = (_parts_ = parts[0]) === null || _parts_ === void 0 ? void 0 : _parts_.slice(1);
    const operation = parts[1];
    const tail = parts.slice(2).join(" ").trim();
    if (surface !== "metrics" && surface !== "experiments" && surface !== "artifacts" || operation !== "list" && operation !== "search" && operation !== "show") {
        return null;
    }
    if (operation === "list") {
        return {
            surface,
            operation,
            raw: trimmed
        };
    }
    if (!tail) return null;
    if (operation === "search") {
        return {
            surface,
            operation,
            raw: trimmed,
            query: tail
        };
    }
    return {
        surface,
        operation,
        raw: trimmed,
        target: tail
    };
}
async function executeInlineCommand(token, command) {
    if (command.surface === "metrics") {
        var _detail_document;
        if (command.operation === "list") {
            return {
                surface: "metrics",
                operation: "list",
                data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listMetrics"])(token)
            };
        }
        if (command.operation === "search") {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listMetrics"])(token);
            var _command_query;
            const query = (_command_query = command.query) !== null && _command_query !== void 0 ? _command_query : "";
            return {
                surface: "metrics",
                operation: "search",
                query,
                data: {
                    ...data,
                    count: data.configs.filter((item)=>item.name.includes(query)).length,
                    configs: data.configs.filter((item)=>item.name.toLowerCase().includes(query.toLowerCase()))
                }
            };
        }
        const config = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listMetrics"])(token)).configs.find((item)=>{
            var _command_target;
            return item.name === ((_command_target = command.target) !== null && _command_target !== void 0 ? _command_target : "");
        });
        var _command_target;
        const detail = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMetric"])(token, (_command_target = command.target) !== null && _command_target !== void 0 ? _command_target : "", (config === null || config === void 0 ? void 0 : config.kind) === "source" ? "source" : "metric");
        var _detail_document_dimensions;
        const compile = detail.kind === "metric" ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["compileMetric"])(token, detail.name, (_detail_document_dimensions = (_detail_document = detail.document) === null || _detail_document === void 0 ? void 0 : _detail_document.dimensions) !== null && _detail_document_dimensions !== void 0 ? _detail_document_dimensions : []).catch(()=>null) : null;
        var _command_target1;
        return {
            surface: "metrics",
            operation: "show",
            target: (_command_target1 = command.target) !== null && _command_target1 !== void 0 ? _command_target1 : detail.name,
            data: {
                detail,
                compile
            }
        };
    }
    if (command.surface === "experiments") {
        if (command.operation === "list") {
            return {
                surface: "experiments",
                operation: "list",
                data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listExperiments"])(token)
            };
        }
        if (command.operation === "search") {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listExperiments"])(token);
            var _command_query1;
            const query = (_command_query1 = command.query) !== null && _command_query1 !== void 0 ? _command_query1 : "";
            return {
                surface: "experiments",
                operation: "search",
                query,
                data: {
                    ...data,
                    count: data.configs.filter((item)=>item.name.includes(query)).length,
                    configs: data.configs.filter((item)=>item.name.toLowerCase().includes(query.toLowerCase()))
                }
            };
        }
        var _command_target2;
        const detail = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getExperiment"])(token, (_command_target2 = command.target) !== null && _command_target2 !== void 0 ? _command_target2 : "");
        const plan = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getExperimentPlan"])(token, detail.name).catch(()=>null);
        var _command_target3;
        return {
            surface: "experiments",
            operation: "show",
            target: (_command_target3 = command.target) !== null && _command_target3 !== void 0 ? _command_target3 : detail.name,
            data: {
                detail,
                plan
            }
        };
    }
    if (command.operation === "list") {
        return {
            surface: "artifacts",
            operation: "list",
            data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listArtifacts"])(token)
        };
    }
    if (command.operation === "search") {
        var _command_query2, _command_query3;
        return {
            surface: "artifacts",
            operation: "search",
            query: (_command_query2 = command.query) !== null && _command_query2 !== void 0 ? _command_query2 : "",
            data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["searchArtifacts"])(token, (_command_query3 = command.query) !== null && _command_query3 !== void 0 ? _command_query3 : "")
        };
    }
    var _command_target4, _command_target5;
    return {
        surface: "artifacts",
        operation: "show",
        target: (_command_target4 = command.target) !== null && _command_target4 !== void 0 ? _command_target4 : "",
        data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getArtifact"])(token, (_command_target5 = command.target) !== null && _command_target5 !== void 0 ? _command_target5 : "")
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/chat-store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DRAFT_THREAD_KEY",
    ()=>DRAFT_THREAD_KEY,
    "getThreadState",
    ()=>getThreadState,
    "useChatStore",
    ()=>useChatStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
"use client";
;
const createThreadState = ()=>({
        messages: [],
        isRunning: false,
        hydrated: false,
        statusLabel: null,
        lastSubmitted: null,
        abortController: null
    });
const useChatStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        threads: {},
        ensureThread: (threadKey)=>set((state)=>{
                if (state.threads[threadKey]) return state;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: createThreadState()
                    }
                };
            }),
        hydrateThread: (threadKey, messages)=>set((state)=>{
                var _state_threads_threadKey;
                const existing = (_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState();
                if (existing.messages.length > 0) {
                    return {
                        threads: {
                            ...state.threads,
                            [threadKey]: {
                                ...existing,
                                hydrated: true
                            }
                        }
                    };
                }
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...existing,
                            messages: [
                                ...messages
                            ],
                            hydrated: true
                        }
                    }
                };
            }),
        replaceMessages: (threadKey, messages)=>set((state)=>{
                var _state_threads_threadKey;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...(_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState(),
                            messages: [
                                ...messages
                            ]
                        }
                    }
                };
            }),
        appendMessage: (threadKey, message)=>set((state)=>{
                var _state_threads_threadKey;
                var _state_threads_threadKey1, _state_threads_threadKey_messages;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...(_state_threads_threadKey1 = state.threads[threadKey]) !== null && _state_threads_threadKey1 !== void 0 ? _state_threads_threadKey1 : createThreadState(),
                            messages: [
                                ...(_state_threads_threadKey_messages = (_state_threads_threadKey = state.threads[threadKey]) === null || _state_threads_threadKey === void 0 ? void 0 : _state_threads_threadKey.messages) !== null && _state_threads_threadKey_messages !== void 0 ? _state_threads_threadKey_messages : [],
                                message
                            ]
                        }
                    }
                };
            }),
        updateMessage: (threadKey, messageId, updater)=>set((state)=>{
                var _state_threads_threadKey;
                const current = (_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState();
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...current,
                            messages: current.messages.map((message)=>message.id === messageId ? updater(message) : message)
                        }
                    }
                };
            }),
        setRunning: (threadKey, isRunning)=>set((state)=>{
                var _state_threads_threadKey;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...(_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState(),
                            isRunning
                        }
                    }
                };
            }),
        setStatusLabel: (threadKey, statusLabel)=>set((state)=>{
                var _state_threads_threadKey;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...(_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState(),
                            statusLabel
                        }
                    }
                };
            }),
        setAbortController: (threadKey, abortController)=>set((state)=>{
                var _state_threads_threadKey;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...(_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState(),
                            abortController
                        }
                    }
                };
            }),
        setLastSubmitted: (threadKey, value)=>set((state)=>{
                var _state_threads_threadKey;
                return {
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...(_state_threads_threadKey = state.threads[threadKey]) !== null && _state_threads_threadKey !== void 0 ? _state_threads_threadKey : createThreadState(),
                            lastSubmitted: value
                        }
                    }
                };
            }),
        moveThread: (fromKey, toKey)=>set((state)=>{
                const fromThread = state.threads[fromKey];
                if (!fromThread) return state;
                return {
                    threads: {
                        ...state.threads,
                        [toKey]: {
                            ...fromThread
                        },
                        [fromKey]: createThreadState()
                    }
                };
            }),
        resetThread: (threadKey)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: createThreadState()
                    }
                }))
    }));
function getThreadState(threadKey) {
    return getOrCreateThread(threadKey);
}
function getOrCreateThread(threadKey) {
    const store = useChatStore.getState();
    if (!store.threads[threadKey]) {
        store.ensureThread(threadKey);
    }
    var _useChatStore_getState_threads_threadKey;
    return (_useChatStore_getState_threads_threadKey = useChatStore.getState().threads[threadKey]) !== null && _useChatStore_getState_threads_threadKey !== void 0 ? _useChatStore_getState_threads_threadKey : createThreadState();
}
const DRAFT_THREAD_KEY = "draft";
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/message-composer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageComposer",
    ()=>MessageComposer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/AuiIf.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/composer.js [app-client] (ecmascript) <export * as ComposerPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAui.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAuiState.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-up.js [app-client] (ecmascript) <export default as ArrowUpIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeftIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/corner-down-left.js [app-client] (ecmascript) <export default as CornerDownLeftIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square.js [app-client] (ecmascript) <export default as SquareIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-client] (ecmascript)");
;
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const SlashCommandPalette = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/chat/slash-command-palette.tsx [app-client] (ecmascript, next/dynamic entry, async loader)").then((mod)=>mod.SlashCommandPalette), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/chat/slash-command-palette.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    }
});
_c = SlashCommandPalette;
function MessageComposer() {
    _s();
    const aui = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"])();
    const text = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"])({
        "MessageComposer.useAuiState[text]": (state)=>state.composer.text
    }["MessageComposer.useAuiState[text]"]);
    const [highlightedIndex, setHighlightedIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const visibleCommands = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "MessageComposer.useMemo[visibleCommands]": ()=>{
            const normalized = text.trim().toLowerCase().replace(/^\//, "");
            if (!text.startsWith("/")) return [];
            if (!normalized) return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SLASH_COMMANDS"];
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SLASH_COMMANDS"].filter({
                "MessageComposer.useMemo[visibleCommands]": (command)=>"".concat(command.surface, " ").concat(command.operation, " ").concat(command.label, " ").concat(command.hint).toLowerCase().includes(normalized)
            }["MessageComposer.useMemo[visibleCommands]"]);
        }
    }["MessageComposer.useMemo[visibleCommands]"], [
        text
    ]);
    const submitOrInsert = (template)=>{
        aui.composer().setText(template);
        setHighlightedIndex(0);
        if (!template.endsWith(" ")) {
            queueMicrotask(()=>{
                aui.composer().send();
            });
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SlashCommandPalette, {
                query: text,
                highlightedIndex: highlightedIndex,
                onSelect: ()=>setHighlightedIndex(0)
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-composer.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Root, {
                className: "rounded-[1.6rem] border border-border/80 bg-white/95 shadow-lg",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Input, {
                        rows: 1,
                        placeholder: "Ask Crew or type / for commands",
                        className: "min-h-[84px] w-full resize-none bg-transparent px-5 pb-3 pt-4 text-sm leading-6 placeholder:text-muted-foreground/80 focus:outline-none",
                        onKeyDown: (event)=>{
                            if (!text.startsWith("/") || visibleCommands.length === 0) return;
                            if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setHighlightedIndex((current)=>(current + 1) % visibleCommands.length);
                            }
                            if (event.key === "ArrowUp") {
                                event.preventDefault();
                                setHighlightedIndex((current)=>current === 0 ? visibleCommands.length - 1 : current - 1);
                            }
                            if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) {
                                const selected = visibleCommands[highlightedIndex];
                                if (!selected) return;
                                event.preventDefault();
                                submitOrInsert(selected.template);
                            }
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/message-composer.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hidden items-center gap-2 text-xs text-muted-foreground sm:flex",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeftIcon$3e$__["CornerDownLeftIcon"], {
                                        className: "size-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                        lineNumber: 77,
                                        columnNumber: 13
                                    }, this),
                                    "Enter sends. Shift + Enter keeps drafting."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ml-auto",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>!state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Send, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                className: "size-11",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpIcon$3e$__["ArrowUpIcon"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 84,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "sr-only",
                                                        children: "Send message"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 85,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                                lineNumber: 83,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-composer.tsx",
                                            lineNumber: 82,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                        lineNumber: 81,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Cancel, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                variant: "secondary",
                                                className: "size-11",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareIcon$3e$__["SquareIcon"], {
                                                        className: "size-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 92,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "sr-only",
                                                        children: "Cancel run"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 93,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                                lineNumber: 91,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-composer.tsx",
                                            lineNumber: 90,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                        lineNumber: 89,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                lineNumber: 80,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/chat/message-composer.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/chat/message-composer.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/message-composer.tsx",
        lineNumber: 41,
        columnNumber: 5
    }, this);
}
_s(MessageComposer, "zE1Fcu/l+io4uutjdYuzofALK9g=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"]
    ];
});
_c1 = MessageComposer;
var _c, _c1;
__turbopack_context__.k.register(_c, "SlashCommandPalette");
__turbopack_context__.k.register(_c1, "MessageComposer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "badgeVariants",
    ()=>badgeVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", {
    variants: {
        variant: {
            default: "border-transparent bg-primary/10 text-primary",
            secondary: "border-transparent bg-secondary text-secondary-foreground",
            outline: "border-border bg-white/70 text-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
function Badge(param) {
    let { className, variant, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(badgeVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/badge.tsx",
        lineNumber: 26,
        columnNumber: 10
    }, this);
}
_c = Badge;
;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/message-list.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageList",
    ()=>MessageList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/error.js [app-client] (ecmascript) <export * as ErrorPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/message.js [app-client] (ecmascript) <export * as MessagePrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/thread.js [app-client] (ecmascript) <export * as ThreadPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
;
;
"use client";
;
;
;
;
;
;
const MarkdownRenderer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/chat/markdown-renderer.tsx [app-client] (ecmascript, next/dynamic entry, async loader)").then((mod)=>mod.MarkdownRenderer), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/chat/markdown-renderer.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    loading: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm leading-6 text-foreground/90",
            children: "Loading response…"
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 17,
            columnNumber: 20
        }, ("TURBOPACK compile-time value", void 0))
});
_c = MarkdownRenderer;
const CommandResultCard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/chat/command-result-card.tsx [app-client] (ecmascript, next/dynamic entry, async loader)").then((mod)=>mod.CommandResultCard), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/chat/command-result-card.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    loading: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandLoadingCard, {
            label: "Loading command result"
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 24,
            columnNumber: 20
        }, ("TURBOPACK compile-time value", void 0))
});
_c1 = CommandResultCard;
function MessageList(param) {
    let { onRetry } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Messages, {
        components: {
            UserMessage,
            AssistantMessage: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AssistantMessage, {
                    onRetry: onRetry
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/message-list.tsx",
                    lineNumber: 37,
                    columnNumber: 33
                }, void 0),
            SystemMessage
        }
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_c2 = MessageList;
function UserMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "flex justify-end px-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[85%] rounded-[1.4rem] bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: (param)=>{
                    let { part } = param;
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "whitespace-pre-wrap leading-6",
                        children: part.text
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/message-list.tsx",
                        lineNumber: 51,
                        columnNumber: 20
                    }, this);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 48,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 47,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 46,
        columnNumber: 5
    }, this);
}
_c3 = UserMessage;
function AssistantMessage(param) {
    let { onRetry } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "px-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[92%] space-y-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 pl-1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                        variant: "secondary",
                        children: "Crew"
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/message-list.tsx",
                        lineNumber: 64,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/message-list.tsx",
                    lineNumber: 63,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-[1.4rem] border border-border/80 bg-white/95 px-4 py-4 shadow-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                            children: (param)=>{
                                let { part } = param;
                                if (part.type === "text") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MarkdownRenderer, {
                                        markdown: part.text
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 70,
                                        columnNumber: 24
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-loading") {
                                    const label = typeof part.data === "object" && part.data && "label" in part.data && typeof part.data.label === "string" ? part.data.label : "Running command";
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandLoadingCard, {
                                        label: label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 81,
                                        columnNumber: 24
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-result") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandResultCard, {
                                        result: part.data
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 85,
                                        columnNumber: 24
                                    }, this);
                                }
                                return null;
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/message-list.tsx",
                            lineNumber: 67,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Error, {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Root, {
                                className: "mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__["AlertTriangleIcon"], {
                                            className: "mt-0.5 size-4 text-destructive"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 94,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Message, {}, void 0, false, {
                                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                                    lineNumber: 96,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    variant: "outline",
                                                    size: "sm",
                                                    onClick: onRetry,
                                                    children: "Retry last turn"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                                    lineNumber: 97,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 95,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                    lineNumber: 93,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/message-list.tsx",
                                lineNumber: 92,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/message-list.tsx",
                            lineNumber: 91,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/message-list.tsx",
                    lineNumber: 66,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 62,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_c4 = AssistantMessage;
function SystemMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "px-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[92%] rounded-[1.4rem] border border-dashed border-border/80 bg-white/75 px-4 py-3 text-sm text-muted-foreground",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: (param)=>{
                    let { part } = param;
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "whitespace-pre-wrap leading-6",
                        children: part.text
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/message-list.tsx",
                        lineNumber: 117,
                        columnNumber: 20
                    }, this);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 114,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 113,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 112,
        columnNumber: 5
    }, this);
}
_c5 = SystemMessage;
function CommandLoadingCard(param) {
    let { label } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-[1.2rem] border border-dashed border-border/80 bg-white/80 px-4 py-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-medium",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-xs text-muted-foreground",
                children: "Running read-only command"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 127,
        columnNumber: 5
    }, this);
}
_c6 = CommandLoadingCard;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "MarkdownRenderer");
__turbopack_context__.k.register(_c1, "CommandResultCard");
__turbopack_context__.k.register(_c2, "MessageList");
__turbopack_context__.k.register(_c3, "UserMessage");
__turbopack_context__.k.register(_c4, "AssistantMessage");
__turbopack_context__.k.register(_c5, "SystemMessage");
__turbopack_context__.k.register(_c6, "CommandLoadingCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/streaming-status.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StreamingStatus",
    ()=>StreamingStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as LoaderCircleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const fallbackSteps = [
    "Checking metrics",
    "Reviewing experiments",
    "Searching artifacts",
    "Drafting answer"
];
function StreamingStatus(param) {
    let { isRunning, label, className } = param;
    _s();
    const [stepIndex, setStepIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StreamingStatus.useEffect": ()=>{
            if (!isRunning || label) return;
            const timer = window.setInterval({
                "StreamingStatus.useEffect.timer": ()=>{
                    setStepIndex({
                        "StreamingStatus.useEffect.timer": (current)=>(current + 1) % fallbackSteps.length
                    }["StreamingStatus.useEffect.timer"]);
                }
            }["StreamingStatus.useEffect.timer"], 2200);
            return ({
                "StreamingStatus.useEffect": ()=>window.clearInterval(timer)
            })["StreamingStatus.useEffect"];
        }
    }["StreamingStatus.useEffect"], [
        isRunning,
        label
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StreamingStatus.useEffect": ()=>{
            if (!isRunning) {
                setStepIndex(0);
            }
        }
    }["StreamingStatus.useEffect"], [
        isRunning
    ]);
    if (!isRunning) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2 rounded-full border border-border/80 bg-white/90 px-4 py-2 text-sm text-muted-foreground shadow-sm", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__["LoaderCircleIcon"], {
                className: "size-4 animate-spin"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/streaming-status.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label || fallbackSteps[stepIndex]
            }, void 0, false, {
                fileName: "[project]/src/components/chat/streaming-status.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                variant: "secondary",
                className: "ml-auto",
                children: "streaming"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/streaming-status.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/streaming-status.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_s(StreamingStatus, "LZhgkuUMfPr+Dv6XNzACufxipEU=");
_c = StreamingStatus;
var _c;
__turbopack_context__.k.register(_c, "StreamingStatus");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const Card = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-[1.25rem] border border-border/80 bg-card/95 text-card-foreground shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = Card;
Card.displayName = "Card";
const CardHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col gap-1.5 p-5", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 22,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c3 = CardHeader;
CardHeader.displayName = "CardHeader";
const CardTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-base font-semibold tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 30,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c5 = CardTitle;
CardTitle.displayName = "CardTitle";
const CardDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 38,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c7 = CardDescription;
CardDescription.displayName = "CardDescription";
const CardContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-5 pb-5", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 46,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c9 = CardContent;
CardContent.displayName = "CardContent";
const CardFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center p-5 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 54,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c11 = CardFooter;
CardFooter.displayName = "CardFooter";
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "Card$React.forwardRef");
__turbopack_context__.k.register(_c1, "Card");
__turbopack_context__.k.register(_c2, "CardHeader$React.forwardRef");
__turbopack_context__.k.register(_c3, "CardHeader");
__turbopack_context__.k.register(_c4, "CardTitle$React.forwardRef");
__turbopack_context__.k.register(_c5, "CardTitle");
__turbopack_context__.k.register(_c6, "CardDescription$React.forwardRef");
__turbopack_context__.k.register(_c7, "CardDescription");
__turbopack_context__.k.register(_c8, "CardContent$React.forwardRef");
__turbopack_context__.k.register(_c9, "CardContent");
__turbopack_context__.k.register(_c10, "CardFooter$React.forwardRef");
__turbopack_context__.k.register(_c11, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/chat-panel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatPanel",
    ()=>ChatPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$AssistantRuntimeProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/legacy-runtime/AssistantRuntimeProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/thread.js [app-client] (ecmascript) <export * as ThreadPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$core$2f$dist$2f$react$2f$runtimes$2f$useExternalStoreRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/core/dist/react/runtimes/useExternalStoreRuntime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/chat-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/auth-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-composer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-list.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$streaming$2d$status$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/streaming-status.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/card.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
function ChatPanel(param) {
    let { sessionId } = param;
    var _historyQuery_data, _sessionsQuery_data;
    _s();
    const threadKey = sessionId !== null && sessionId !== void 0 ? sessionId : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DRAFT_THREAD_KEY"];
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { auth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const thread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[thread]": (state)=>state.threads[threadKey]
    }["ChatPanel.useChatStore[thread]"]);
    const ensureThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[ensureThread]": (state)=>state.ensureThread
    }["ChatPanel.useChatStore[ensureThread]"]);
    const hydrateThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[hydrateThread]": (state)=>state.hydrateThread
    }["ChatPanel.useChatStore[hydrateThread]"]);
    const replaceMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[replaceMessages]": (state)=>state.replaceMessages
    }["ChatPanel.useChatStore[replaceMessages]"]);
    const appendMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[appendMessage]": (state)=>state.appendMessage
    }["ChatPanel.useChatStore[appendMessage]"]);
    const updateMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[updateMessage]": (state)=>state.updateMessage
    }["ChatPanel.useChatStore[updateMessage]"]);
    const setRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[setRunning]": (state)=>state.setRunning
    }["ChatPanel.useChatStore[setRunning]"]);
    const setStatusLabel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[setStatusLabel]": (state)=>state.setStatusLabel
    }["ChatPanel.useChatStore[setStatusLabel]"]);
    const setAbortController = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[setAbortController]": (state)=>state.setAbortController
    }["ChatPanel.useChatStore[setAbortController]"]);
    const moveThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[moveThread]": (state)=>state.moveThread
    }["ChatPanel.useChatStore[moveThread]"]);
    const setLastSubmitted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "ChatPanel.useChatStore[setLastSubmitted]": (state)=>state.setLastSubmitted
    }["ChatPanel.useChatStore[setLastSubmitted]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPanel.useEffect": ()=>{
            ensureThread(threadKey);
        }
    }["ChatPanel.useEffect"], [
        ensureThread,
        threadKey
    ]);
    const sessionsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "session-records",
            "list"
        ],
        queryFn: {
            "ChatPanel.useQuery[sessionsQuery]": ()=>auth ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listSessions"])(auth.token) : null
        }["ChatPanel.useQuery[sessionsQuery]"],
        enabled: Boolean(auth && sessionId)
    });
    const shouldLoadHistory = Boolean(auth && sessionId && !(thread === null || thread === void 0 ? void 0 : thread.hydrated));
    const historyQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "session-history",
            sessionId
        ],
        queryFn: {
            "ChatPanel.useQuery[historyQuery]": ()=>auth && sessionId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSessionHistory"])(auth.token, sessionId) : null
        }["ChatPanel.useQuery[historyQuery]"],
        enabled: shouldLoadHistory,
        staleTime: 300_000
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPanel.useEffect": ()=>{
            var _historyQuery_data;
            if (!((_historyQuery_data = historyQuery.data) === null || _historyQuery_data === void 0 ? void 0 : _historyQuery_data.turns)) return;
            hydrateThread(threadKey, buildHistoryMessages(historyQuery.data.turns));
        }
    }["ChatPanel.useEffect"], [
        (_historyQuery_data = historyQuery.data) === null || _historyQuery_data === void 0 ? void 0 : _historyQuery_data.turns,
        hydrateThread,
        threadKey
    ]);
    var _thread_messages;
    const messages = (_thread_messages = thread === null || thread === void 0 ? void 0 : thread.messages) !== null && _thread_messages !== void 0 ? _thread_messages : [];
    var _thread_isRunning;
    const isRunning = (_thread_isRunning = thread === null || thread === void 0 ? void 0 : thread.isRunning) !== null && _thread_isRunning !== void 0 ? _thread_isRunning : false;
    var _thread_statusLabel;
    const statusLabel = (_thread_statusLabel = thread === null || thread === void 0 ? void 0 : thread.statusLabel) !== null && _thread_statusLabel !== void 0 ? _thread_statusLabel : null;
    const handleNewMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPanel.useCallback[handleNewMessage]": async (message)=>{
            if (!auth) return;
            const text = extractText(message);
            if (!text) return;
            const slashCommand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseSlashCommand"])(text);
            if (slashCommand) {
                const userId = createUiId("user");
                const assistantId = createUiId("assistant");
                appendMessage(threadKey, createUserMessage(userId, text));
                appendMessage(threadKey, {
                    id: assistantId,
                    role: "assistant",
                    content: [
                        {
                            type: "data-command-loading",
                            data: {
                                label: "Running ".concat(slashCommand.surface)
                            }
                        }
                    ],
                    createdAt: new Date(),
                    status: {
                        type: "running"
                    }
                });
                setRunning(threadKey, true);
                setStatusLabel(threadKey, "Running ".concat(slashCommand.surface));
                setLastSubmitted(threadKey, {
                    kind: "command",
                    text
                });
                try {
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executeInlineCommand"])(auth.token, slashCommand);
                    updateMessage(threadKey, assistantId, {
                        "ChatPanel.useCallback[handleNewMessage]": (current)=>({
                                ...current,
                                content: [
                                    {
                                        type: "data-command-result",
                                        data: result
                                    }
                                ],
                                status: {
                                    type: "complete",
                                    reason: "stop"
                                }
                            })
                    }["ChatPanel.useCallback[handleNewMessage]"]);
                } catch (error) {
                    updateMessage(threadKey, assistantId, {
                        "ChatPanel.useCallback[handleNewMessage]": (current)=>({
                                ...current,
                                content: [
                                    {
                                        type: "text",
                                        text: error instanceof Error ? error.message : "Command failed"
                                    }
                                ],
                                status: {
                                    type: "incomplete",
                                    reason: "error",
                                    error: formatError(error)
                                }
                            })
                    }["ChatPanel.useCallback[handleNewMessage]"]);
                } finally{
                    setRunning(threadKey, false);
                    setStatusLabel(threadKey, null);
                }
                return;
            }
            const activeSessionId = sessionId !== null && sessionId !== void 0 ? sessionId : (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createSession"])(auth.token, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["truncate"])(text.replace(/\s+/g, " "), 48))).session_id;
            const activeThreadKey = activeSessionId;
            if (!sessionId) {
                moveThread(threadKey, activeThreadKey);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startTransition"])({
                    "ChatPanel.useCallback[handleNewMessage]": ()=>{
                        router.replace("/app/chat/".concat(activeSessionId));
                    }
                }["ChatPanel.useCallback[handleNewMessage]"]);
            }
            const userId = createUiId("user");
            const assistantId = createUiId("assistant");
            appendMessage(activeThreadKey, createUserMessage(userId, text));
            appendMessage(activeThreadKey, {
                id: assistantId,
                role: "assistant",
                content: [
                    {
                        type: "text",
                        text: ""
                    }
                ],
                createdAt: new Date(),
                status: {
                    type: "running"
                }
            });
            setRunning(activeThreadKey, true);
            setStatusLabel(activeThreadKey, "Checking metrics");
            setLastSubmitted(activeThreadKey, {
                kind: "agent",
                text
            });
            const controller = new AbortController();
            setAbortController(activeThreadKey, controller);
            try {
                const { request_id } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sendMessage"])(auth.token, activeSessionId, text);
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["streamSessionEvents"])(auth.token, activeSessionId, request_id, {
                    "ChatPanel.useCallback[handleNewMessage]": (event)=>{
                        var _event_data_response, _event_data_runtime_event, _event_data_runtime_event1;
                        const responseText = (_event_data_response = event.data.response) === null || _event_data_response === void 0 ? void 0 : _event_data_response.text;
                        const nextLabel = mapRuntimeLabel((_event_data_runtime_event = event.data.runtime_event) === null || _event_data_runtime_event === void 0 ? void 0 : _event_data_runtime_event.label, (_event_data_runtime_event1 = event.data.runtime_event) === null || _event_data_runtime_event1 === void 0 ? void 0 : _event_data_runtime_event1.event_type);
                        if (nextLabel) {
                            setStatusLabel(activeThreadKey, nextLabel);
                        }
                        if (typeof responseText === "string") {
                            updateMessage(activeThreadKey, assistantId, {
                                "ChatPanel.useCallback[handleNewMessage]": (current)=>({
                                        ...current,
                                        content: [
                                            {
                                                type: "text",
                                                text: mergeResponseText(current, responseText)
                                            }
                                        ]
                                    })
                            }["ChatPanel.useCallback[handleNewMessage]"]);
                        }
                        if (event.event === "request.completed") {
                            updateMessage(activeThreadKey, assistantId, {
                                "ChatPanel.useCallback[handleNewMessage]": (current)=>({
                                        ...current,
                                        status: {
                                            type: "complete",
                                            reason: "stop"
                                        }
                                    })
                            }["ChatPanel.useCallback[handleNewMessage]"]);
                        }
                        if (event.event === "request.error") {
                            updateMessage(activeThreadKey, assistantId, {
                                "ChatPanel.useCallback[handleNewMessage]": (current)=>{
                                    var _event_data_error;
                                    return {
                                        ...current,
                                        status: {
                                            type: "incomplete",
                                            reason: "error",
                                            error: (_event_data_error = event.data.error) !== null && _event_data_error !== void 0 ? _event_data_error : "Streaming failed"
                                        }
                                    };
                                }
                            }["ChatPanel.useCallback[handleNewMessage]"]);
                        }
                    }
                }["ChatPanel.useCallback[handleNewMessage]"], controller.signal);
            } catch (error) {
                const aborted = error instanceof DOMException && error.name === "AbortError";
                updateMessage(activeThreadKey, assistantId, {
                    "ChatPanel.useCallback[handleNewMessage]": (current)=>({
                            ...current,
                            status: aborted ? {
                                type: "incomplete",
                                reason: "cancelled"
                            } : {
                                type: "incomplete",
                                reason: "error",
                                error: formatError(error)
                            }
                        })
                }["ChatPanel.useCallback[handleNewMessage]"]);
            } finally{
                setRunning(activeThreadKey, false);
                setStatusLabel(activeThreadKey, null);
                setAbortController(activeThreadKey, null);
                queryClient.invalidateQueries({
                    queryKey: [
                        "sessions"
                    ]
                });
                queryClient.invalidateQueries({
                    queryKey: [
                        "session-records"
                    ]
                });
                queryClient.invalidateQueries({
                    queryKey: [
                        "session-history",
                        activeSessionId
                    ]
                });
            }
        }
    }["ChatPanel.useCallback[handleNewMessage]"], [
        appendMessage,
        auth,
        moveThread,
        queryClient,
        router,
        sessionId,
        setAbortController,
        setLastSubmitted,
        setRunning,
        setStatusLabel,
        threadKey,
        updateMessage
    ]);
    const retryLastTurn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPanel.useCallback[retryLastTurn]": async ()=>{
            var _useChatStore_getState_threads_threadKey;
            const lastSubmitted = (_useChatStore_getState_threads_threadKey = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"].getState().threads[threadKey]) === null || _useChatStore_getState_threads_threadKey === void 0 ? void 0 : _useChatStore_getState_threads_threadKey.lastSubmitted;
            if (!lastSubmitted || !auth) return;
            if (lastSubmitted.kind !== "agent") return;
            await handleNewMessage(createAppendMessage(lastSubmitted.text));
        }
    }["ChatPanel.useCallback[retryLastTurn]"], [
        auth,
        handleNewMessage,
        threadKey
    ]);
    const runtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$core$2f$dist$2f$react$2f$runtimes$2f$useExternalStoreRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useExternalStoreRuntime"])({
        messages,
        isRunning,
        convertMessage: {
            "ChatPanel.useExternalStoreRuntime[runtime]": (message)=>message
        }["ChatPanel.useExternalStoreRuntime[runtime]"],
        setMessages: {
            "ChatPanel.useExternalStoreRuntime[runtime]": (nextMessages)=>replaceMessages(threadKey, nextMessages)
        }["ChatPanel.useExternalStoreRuntime[runtime]"],
        onNew: handleNewMessage,
        onCancel: {
            "ChatPanel.useExternalStoreRuntime[runtime]": async ()=>{
                var _useChatStore_getState_threads_threadKey_abortController, _useChatStore_getState_threads_threadKey;
                (_useChatStore_getState_threads_threadKey = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"].getState().threads[threadKey]) === null || _useChatStore_getState_threads_threadKey === void 0 ? void 0 : (_useChatStore_getState_threads_threadKey_abortController = _useChatStore_getState_threads_threadKey.abortController) === null || _useChatStore_getState_threads_threadKey_abortController === void 0 ? void 0 : _useChatStore_getState_threads_threadKey_abortController.abort();
            }
        }["ChatPanel.useExternalStoreRuntime[runtime]"]
    });
    const matchingSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ChatPanel.useMemo[matchingSession]": ()=>{
            var _sessionsQuery_data;
            var _sessionsQuery_data_sessions, _find;
            return (_find = ((_sessionsQuery_data_sessions = (_sessionsQuery_data = sessionsQuery.data) === null || _sessionsQuery_data === void 0 ? void 0 : _sessionsQuery_data.sessions) !== null && _sessionsQuery_data_sessions !== void 0 ? _sessionsQuery_data_sessions : []).find({
                "ChatPanel.useMemo[matchingSession]": (session)=>session.session_id === sessionId
            }["ChatPanel.useMemo[matchingSession]"])) !== null && _find !== void 0 ? _find : null;
        }
    }["ChatPanel.useMemo[matchingSession]"], [
        sessionId,
        (_sessionsQuery_data = sessionsQuery.data) === null || _sessionsQuery_data === void 0 ? void 0 : _sessionsQuery_data.sessions
    ]);
    const threadTitle = (matchingSession === null || matchingSession === void 0 ? void 0 : matchingSession.label) || (sessionId ? "Analysis session" : "New analysis");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$AssistantRuntimeProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantRuntimeProvider"], {
        runtime: runtime,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "surface-panel flex h-full min-h-[calc(100vh-11rem)] flex-col overflow-hidden",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                    className: "border-b border-border/70 pb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                    children: threadTitle
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 268,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                    children: "Agent Mode"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 269,
                                    columnNumber: 13
                                }, this),
                                sessionId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                    variant: "outline",
                                    className: "font-mono",
                                    children: sessionId
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 271,
                                    columnNumber: 15
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 267,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                            children: [
                                "Use natural language for analysis. Type ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                    children: "/"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 277,
                                    columnNumber: 53
                                }, this),
                                " for read-only commands."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 276,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                    lineNumber: 266,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "flex min-h-0 flex-1 flex-col px-0 pb-0",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Root, {
                        className: "flex min-h-0 flex-1 flex-col",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Viewport, {
                            className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3 pt-4 sm:px-6",
                            children: [
                                messages.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ThreadWelcome, {}, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 284,
                                    columnNumber: 40
                                }, this) : null,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageList"], {
                                        onRetry: retryLastTurn
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                                        lineNumber: 286,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 285,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].ScrollToBottom, {
                                    className: "fixed bottom-28 right-6 z-20 hidden rounded-full border border-border/80 bg-white/90 px-3 py-2 text-xs shadow-sm md:block",
                                    children: "Jump to latest"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 288,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].ViewportFooter, {
                                    className: "sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background/95 to-background/0 pt-6",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mx-auto w-full max-w-4xl space-y-3 pb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$streaming$2d$status$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StreamingStatus"], {
                                                isRunning: isRunning,
                                                label: statusLabel
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                                lineNumber: 293,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageComposer"], {}, void 0, false, {
                                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                                lineNumber: 294,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                                        lineNumber: 292,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 291,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 283,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                        lineNumber: 282,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                    lineNumber: 281,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/chat-panel.tsx",
            lineNumber: 265,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/chat-panel.tsx",
        lineNumber: 264,
        columnNumber: 5
    }, this);
}
_s(ChatPanel, "hhcjOgzHMzs3g6YNezq+PfsRCNI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$core$2f$dist$2f$react$2f$runtimes$2f$useExternalStoreRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useExternalStoreRuntime"]
    ];
});
_c = ChatPanel;
function ThreadWelcome() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-12 pt-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                variant: "secondary",
                children: "Crew Beta"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 308,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-4 text-3xl font-semibold sm:text-4xl",
                children: "Ask a grounded business question."
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 309,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base",
                children: [
                    "Crew combines conversational analysis with deterministic command surfaces for metrics, experiments, and team artifacts. Start with a question or type ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/"
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                        lineNumber: 314,
                        columnNumber: 81
                    }, this),
                    " ",
                    "for inline exploration."
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 312,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-8 grid w-full gap-3 text-left sm:grid-cols-2",
                children: [
                    "What changed in activation over the last 4 weeks?",
                    "Show me the latest signup checkout experiment takeaways.",
                    "Turn this analysis into a short launch readout.",
                    "/artifacts search launch readiness"
                ].map((prompt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-[1.25rem] border border-border/80 bg-white/70 px-4 py-4 text-sm leading-6 text-foreground/85",
                        children: prompt
                    }, prompt, false, {
                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                        lineNumber: 324,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 317,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/chat-panel.tsx",
        lineNumber: 307,
        columnNumber: 5
    }, this);
}
_c1 = ThreadWelcome;
function createUiId(prefix) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return "".concat(prefix, "_").concat(crypto.randomUUID().replace(/-/g, ""));
    }
    return "".concat(prefix, "_").concat(Math.random().toString(16).slice(2));
}
function createUserMessage(id, text) {
    return {
        id,
        role: "user",
        content: [
            {
                type: "text",
                text
            }
        ],
        createdAt: new Date()
    };
}
function buildHistoryMessages(turns) {
    return turns.flatMap((turn)=>[
            {
                id: "".concat(turn.turn_id, "_user"),
                role: "user",
                content: [
                    {
                        type: "text",
                        text: turn.user_message
                    }
                ],
                createdAt: turn.created_at ? new Date(turn.created_at) : new Date()
            },
            {
                id: "".concat(turn.turn_id, "_assistant"),
                role: "assistant",
                content: [
                    {
                        type: "text",
                        text: turn.agent_response
                    }
                ],
                createdAt: turn.created_at ? new Date(turn.created_at) : new Date(),
                status: {
                    type: "complete",
                    reason: "unknown"
                },
                metadata: {
                    usage: turn.usage
                }
            }
        ]);
}
function extractText(message) {
    for (const part of message.content){
        if (part.type === "text") return part.text.trim();
    }
    return "";
}
function createAppendMessage(text) {
    return {
        role: "user",
        content: [
            {
                type: "text",
                text
            }
        ],
        createdAt: new Date()
    };
}
function formatError(error) {
    if (error instanceof Error) return error.message;
    return typeof error === "string" ? error : "Request failed";
}
function mergeResponseText(message, incoming) {
    var _message_content_;
    const current = Array.isArray(message.content) && ((_message_content_ = message.content[0]) === null || _message_content_ === void 0 ? void 0 : _message_content_.type) === "text" ? message.content[0].text : "";
    if (!current) return incoming;
    if (incoming.startsWith(current)) return incoming;
    if (current.startsWith(incoming)) return current;
    return "".concat(current).concat(incoming);
}
function mapRuntimeLabel(label, eventType) {
    const source = "".concat(label !== null && label !== void 0 ? label : "", " ").concat(eventType !== null && eventType !== void 0 ? eventType : "").toLowerCase();
    if (source.includes("metric")) return "Checking metrics";
    if (source.includes("experiment")) return "Reviewing experiments";
    if (source.includes("artifact")) return "Searching artifacts";
    if (source.includes("draft") || source.includes("response")) return "Drafting answer";
    return label !== null && label !== void 0 ? label : null;
}
var _c, _c1;
__turbopack_context__.k.register(_c, "ChatPanel");
__turbopack_context__.k.register(_c1, "ThreadWelcome");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_bb8d8fc2._.js.map