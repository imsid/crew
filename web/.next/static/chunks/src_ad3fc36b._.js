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
    const isRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"])({
        "MessageComposer.useAuiState[isRunning]": (state)=>state.thread.isRunning
    }["MessageComposer.useAuiState[isRunning]"]);
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
        className: "relative isolate",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SlashCommandPalette, {
                query: text,
                highlightedIndex: highlightedIndex,
                onSelect: ()=>setHighlightedIndex(0),
                className: "absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-50"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-composer.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Root, {
                className: "rounded-[1.35rem] border border-border/80 bg-white/98 shadow-[0_10px_28px_rgba(36,29,20,0.06)] backdrop-blur-sm transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Input, {
                        rows: 1,
                        placeholder: "Ask Crew or type / for commands",
                        className: "min-h-[52px] w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[15px] leading-6 placeholder:text-muted-foreground/75 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
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
                        lineNumber: 50,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between gap-3 border-t border-border/70 px-3.5 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hidden items-center gap-2 text-[12px] text-muted-foreground sm:flex",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeftIcon$3e$__["CornerDownLeftIcon"], {
                                        className: "size-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                        lineNumber: 79,
                                        columnNumber: 13
                                    }, this),
                                    isRunning ? "Streaming execution trace and final answer." : "Enter sends. Shift + Enter keeps drafting."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                lineNumber: 78,
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
                                                className: "size-9 shadow-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpIcon$3e$__["ArrowUpIcon"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 88,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "sr-only",
                                                        children: "Send message"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 89,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                                lineNumber: 87,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-composer.tsx",
                                            lineNumber: 86,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                        lineNumber: 85,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Cancel, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                variant: "secondary",
                                                className: "size-9 border border-border/70",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareIcon$3e$__["SquareIcon"], {
                                                        className: "size-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 96,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "sr-only",
                                                        children: "Cancel run"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 97,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                                lineNumber: 95,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-composer.tsx",
                                            lineNumber: 94,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                        lineNumber: 93,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/chat/message-composer.tsx",
                                lineNumber: 84,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/chat/message-composer.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/chat/message-composer.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/message-composer.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_s(MessageComposer, "dKhEnuHQKMoyCbZJOs1DpDbuats=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAui"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"],
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
"[project]/src/components/ui/collapsible.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Collapsible",
    ()=>Collapsible,
    "CollapsibleContent",
    ()=>CollapsibleContent,
    "CollapsibleTrigger",
    ()=>CollapsibleTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-collapsible/dist/index.mjs [app-client] (ecmascript)");
"use client";
;
const Collapsible = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"];
const CollapsibleTrigger = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trigger"];
const CollapsibleContent = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"];
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/execution-trace.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExecutionTrace",
    ()=>ExecutionTrace
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as CheckIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDownIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDownIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as LoaderCircleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as TriangleAlertIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/collapsible.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function ExecutionTrace(param) {
    let { trace, isRunning, className } = param;
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(isRunning);
    const [hasInteracted, setHasInteracted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const wasRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(isRunning);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ExecutionTrace.useEffect": ()=>{
            if (isRunning && !wasRunning.current && !hasInteracted) {
                setOpen(true);
            }
            if (!isRunning && wasRunning.current && !hasInteracted) {
                setOpen(false);
            }
            wasRunning.current = isRunning;
        }
    }["ExecutionTrace.useEffect"], [
        hasInteracted,
        isRunning
    ]);
    const stepCount = trace.steps.length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Collapsible"], {
        open: open,
        onOpenChange: (nextOpen)=>{
            setHasInteracted(true);
            setOpen(nextOpen);
        },
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-[1.15rem] border border-border/70 bg-secondary/45 shadow-sm", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CollapsibleTrigger"], {
                className: "flex w-full items-center gap-3 px-4 py-3 text-left",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-w-0 flex-1 items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex size-8 shrink-0 items-center justify-center rounded-full border", trace.status === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/15 bg-white/80 text-primary"),
                                children: isRunning ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__["LoaderCircleIcon"], {
                                    className: "size-4 animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                    lineNumber: 67,
                                    columnNumber: 15
                                }, this) : trace.status === "error" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__["TriangleAlertIcon"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                    lineNumber: 69,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__["CheckIcon"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                    lineNumber: 71,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                lineNumber: 58,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-semibold",
                                                children: trace.title
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 76,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                                variant: "outline",
                                                children: [
                                                    stepCount,
                                                    " ",
                                                    stepCount === 1 ? "step" : "steps"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 77,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/chat/execution-trace.tsx",
                                        lineNumber: 75,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-0.5 text-xs text-muted-foreground",
                                        children: isRunning ? "Live execution trace" : trace.status === "error" ? "Run ended with an error" : "Execution details"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/execution-trace.tsx",
                                        lineNumber: 81,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/chat/execution-trace.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDownIcon$3e$__["ChevronDownIcon"], {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("size-4 shrink-0 transition-transform", open && "rotate-180")
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/execution-trace.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/chat/execution-trace.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CollapsibleContent"], {
                className: "border-t border-border/70 px-4 py-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        trace.steps.map((step)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-medium text-primary",
                                                children: [
                                                    "→ Step ",
                                                    step.step_index,
                                                    ":"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 100,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-medium",
                                                children: step.title
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 101,
                                                columnNumber: 17
                                            }, this),
                                            step.tool_calls.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-mono text-[13px] text-primary/90",
                                                children: step.tool_calls.map((toolCall)=>toolCall.name || "tool").join(", ")
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 103,
                                                columnNumber: 19
                                            }, this) : null,
                                            step.token_usage ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-sky-700/80",
                                                children: formatUsage(step.token_usage)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 110,
                                                columnNumber: 19
                                            }, this) : null,
                                            typeof step.duration_ms === "number" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-muted-foreground",
                                                children: [
                                                    step.duration_ms,
                                                    "ms"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 115,
                                                columnNumber: 19
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/chat/execution-trace.tsx",
                                        lineNumber: 99,
                                        columnNumber: 15
                                    }, this),
                                    step.assistant_text ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "pl-6 text-sm leading-6 text-muted-foreground",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-mono text-[13px] text-muted-foreground/85",
                                                children: "assistant:"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 123,
                                                columnNumber: 19
                                            }, this),
                                            " ",
                                            step.assistant_text
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/chat/execution-trace.tsx",
                                        lineNumber: 122,
                                        columnNumber: 17
                                    }, this) : null,
                                    step.tool_calls.map((toolCall)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "pl-6 font-mono text-[13px] leading-6 text-fuchsia-500",
                                            children: formatToolCall(toolCall)
                                        }, "".concat(step.step_key || step.step_index, ":").concat(toolCall.id || toolCall.name), false, {
                                            fileName: "[project]/src/components/chat/execution-trace.tsx",
                                            lineNumber: 131,
                                            columnNumber: 17
                                        }, this)),
                                    step.results.map((result, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("pl-6 text-sm leading-6", result.is_error ? "text-destructive" : "text-muted-foreground"),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "mr-2 font-mono",
                                                    children: result.is_error ? "!" : "✓"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                    lineNumber: 147,
                                                    columnNumber: 19
                                                }, this),
                                                "Executed",
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-medium text-foreground/85",
                                                    children: result.tool_name || "tool"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                    lineNumber: 151,
                                                    columnNumber: 19
                                                }, this),
                                                typeof result.duration_ms === "number" ? " in ".concat(result.duration_ms, "ms") : "",
                                                formatResultMetadata(result.metadata)
                                            ]
                                        }, "".concat(step.step_key || step.step_index, ":result:").concat(result.tool_call_id || index), true, {
                                            fileName: "[project]/src/components/chat/execution-trace.tsx",
                                            lineNumber: 140,
                                            columnNumber: 17
                                        }, this))
                                ]
                            }, step.step_key || step.step_index, true, {
                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                lineNumber: 98,
                                columnNumber: 13
                            }, this)),
                        trace.error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive",
                            children: trace.error
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/execution-trace.tsx",
                            lineNumber: 162,
                            columnNumber: 13
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                    lineNumber: 96,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/chat/execution-trace.tsx",
                lineNumber: 95,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/execution-trace.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
_s(ExecutionTrace, "5lK9RD2k8yblNdHlWdWv/Dmqt8A=");
_c = ExecutionTrace;
function formatUsage(usage) {
    return "(".concat(usage.input_tokens, "+").concat(usage.output_tokens, " tokens)");
}
function formatToolCall(toolCall) {
    const name = toolCall.name || "tool";
    const args = Object.entries(toolCall.arguments || {});
    if (args.length === 0) return "".concat(name, "()");
    const preview = args.slice(0, 3).map((param)=>{
        let [key, value] = param;
        return "".concat(key, "=").concat(formatArgument(value));
    }).join(", ");
    return "".concat(name, "(").concat(preview).concat(args.length > 3 ? ", …" : "", ")");
}
function formatArgument(value) {
    if (typeof value === "string") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["truncate"])(value, 36);
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value)) {
        return "[".concat(value.map((item)=>formatArgument(item)).join(", "), "]");
    }
    if (value && typeof value === "object") {
        return "{…}";
    }
    return "null";
}
function formatResultMetadata(metadata) {
    const extras = Object.entries(metadata).slice(0, 2).map((param)=>{
        let [key, value] = param;
        const label = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["titleizeIdentifier"])(key).toLowerCase();
        if (typeof value === "number" || typeof value === "boolean") {
            return "".concat(label, ": ").concat(value);
        }
        if (typeof value === "string" && value.trim()) {
            return "".concat(label, ": ").concat((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["truncate"])(value, 32));
        }
        return null;
    }).filter((value)=>Boolean(value));
    return extras.length > 0 ? " (".concat(extras.join(", "), ")") : "";
}
var _c;
__turbopack_context__.k.register(_c, "ExecutionTrace");
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/actionBar.js [app-client] (ecmascript) <export * as ActionBarPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/error.js [app-client] (ecmascript) <export * as ErrorPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/message.js [app-client] (ecmascript) <export * as MessagePrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/thread.js [app-client] (ecmascript) <export * as ThreadPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAuiState.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-client] (ecmascript) <export default as CopyIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCwIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCwIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$execution$2d$trace$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/execution-trace.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
;
;
;
var _s = __turbopack_context__.k.signature();
"use client";
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
            lineNumber: 19,
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
            lineNumber: 26,
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
                    lineNumber: 39,
                    columnNumber: 33
                }, void 0),
            SystemMessage
        }
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_c2 = MessageList;
function UserMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "mx-auto grid w-full max-w-4xl grid-cols-[minmax(0,1fr)_auto] px-2",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "col-start-2 max-w-[94%] rounded-[1.55rem] bg-primary px-5 py-3.5 text-sm text-primary-foreground shadow-sm sm:max-w-[88%]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: (param)=>{
                    let { part } = param;
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "whitespace-pre-wrap leading-6",
                        children: part.text
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/message-list.tsx",
                        lineNumber: 53,
                        columnNumber: 20
                    }, this);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 50,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 49,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_c3 = UserMessage;
function AssistantMessage(param) {
    let { onRetry } = param;
    _s();
    const isThreadRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"])({
        "AssistantMessage.useAuiState[isThreadRunning]": (state)=>state.thread.isRunning
    }["AssistantMessage.useAuiState[isThreadRunning]"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "mx-auto w-full max-w-4xl px-2",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "inline-flex size-2 rounded-full bg-primary/55"
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/message-list.tsx",
                            lineNumber: 68,
                            columnNumber: 11
                        }, this),
                        "Crew"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/message-list.tsx",
                    lineNumber: 67,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                            children: (param)=>{
                                let { part } = param;
                                if (part.type === "text") {
                                    if (!part.text && !isThreadRunning) return null;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MarkdownRenderer, {
                                        markdown: part.text || "_Working on it…_",
                                        className: "thread-prose"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 78,
                                        columnNumber: 19
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "trace") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$execution$2d$trace$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ExecutionTrace"], {
                                        trace: part.data,
                                        isRunning: isThreadRunning
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 87,
                                        columnNumber: 19
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-loading") {
                                    const label = typeof part.data === "object" && part.data && "label" in part.data && typeof part.data.label === "string" ? part.data.label : "Running command";
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandLoadingCard, {
                                        label: label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 102,
                                        columnNumber: 24
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-result") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandResultCard, {
                                        result: part.data
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 106,
                                        columnNumber: 24
                                    }, this);
                                }
                                return null;
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/message-list.tsx",
                            lineNumber: 73,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Error, {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Root, {
                                className: "rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__["AlertTriangleIcon"], {
                                            className: "mt-0.5 size-4 text-destructive"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 116,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Message, {}, void 0, false, {
                                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                                    lineNumber: 118,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    variant: "outline",
                                                    size: "sm",
                                                    onClick: onRetry,
                                                    children: "Retry last turn"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                                    lineNumber: 119,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 117,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                    lineNumber: 115,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/message-list.tsx",
                                lineNumber: 114,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/message-list.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/message-list.tsx",
                    lineNumber: 72,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__["ActionBarPrimitive"].Root, {
                        hideWhenRunning: true,
                        autohide: "never",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__["ActionBarPrimitive"].Copy, {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "ghost",
                                    size: "sm",
                                    className: "min-h-9 rounded-full px-3 text-xs",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyIcon$3e$__["CopyIcon"], {
                                            className: "size-3.5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 132,
                                            columnNumber: 17
                                        }, this),
                                        "Copy"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                    lineNumber: 131,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/message-list.tsx",
                                lineNumber: 130,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__["ActionBarPrimitive"].Reload, {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "ghost",
                                    size: "sm",
                                    className: "min-h-9 rounded-full px-3 text-xs",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCwIcon$3e$__["RefreshCwIcon"], {
                                            className: "size-3.5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 138,
                                            columnNumber: 17
                                        }, this),
                                        "Retry"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                    lineNumber: 137,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/message-list.tsx",
                                lineNumber: 136,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/chat/message-list.tsx",
                        lineNumber: 129,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/message-list.tsx",
                    lineNumber: 128,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 66,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 65,
        columnNumber: 5
    }, this);
}
_s(AssistantMessage, "R/9AiTJa5Dt6yOPpbCqR5mSJbCk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuiState"]
    ];
});
_c4 = AssistantMessage;
function SystemMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "mx-auto w-full max-w-4xl px-2",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-[1.2rem] border border-dashed border-border/80 bg-white/70 px-4 py-3 text-sm text-muted-foreground",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: (param)=>{
                    let { part } = param;
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "whitespace-pre-wrap leading-6",
                        children: part.text
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/message-list.tsx",
                        lineNumber: 156,
                        columnNumber: 20
                    }, this);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 153,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 152,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 151,
        columnNumber: 5
    }, this);
}
_c5 = SystemMessage;
function CommandLoadingCard(param) {
    let { label } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-[1.15rem] border border-dashed border-border/80 bg-white/78 px-4 py-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-medium",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-xs text-muted-foreground",
                children: "Running read-only command"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/message-list.tsx",
        lineNumber: 166,
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-down.js [app-client] (ecmascript) <export default as ArrowDownIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/chat-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/auth-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-composer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-list.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$mobile$2d$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/mobile-nav.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
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
    var _historyQuery_data, _sessionsQuery_data, _sessionDetailQuery_data, _sessionDetailQuery_data1;
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
    const sessionDetailQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "session-detail",
            sessionId
        ],
        queryFn: {
            "ChatPanel.useQuery[sessionDetailQuery]": ()=>auth && sessionId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])(auth.token, sessionId) : null
        }["ChatPanel.useQuery[sessionDetailQuery]"],
        enabled: Boolean(auth && sessionId),
        staleTime: 300_000
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
            appendMessage(activeThreadKey, createStreamingAssistantMessage(assistantId));
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
                        updateMessage(activeThreadKey, assistantId, {
                            "ChatPanel.useCallback[handleNewMessage]": (current)=>applyStreamEventToMessage(current, event)
                        }["ChatPanel.useCallback[handleNewMessage]"]);
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
                            content: mergeTraceStatusIntoContent(current.content, aborted ? "Execution canceled" : "Execution failed", aborted ? "error" : "error", aborted ? "Request was canceled." : formatError(error)),
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
                        "session-detail",
                        activeSessionId
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
    const lastAssistantUsageTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ChatPanel.useMemo[lastAssistantUsageTotal]": ()=>{
            for(let index = messages.length - 1; index >= 0; index -= 1){
                const message = messages[index];
                if (message.role !== "assistant") continue;
                const usage = extractUsageFromMetadata(message.metadata);
                if (typeof (usage === null || usage === void 0 ? void 0 : usage.total_tokens) === "number" && usage.total_tokens > 0) {
                    return usage.total_tokens;
                }
            }
            return 0;
        }
    }["ChatPanel.useMemo[lastAssistantUsageTotal]"], [
        messages
    ]);
    const threadTitle = ((_sessionDetailQuery_data = sessionDetailQuery.data) === null || _sessionDetailQuery_data === void 0 ? void 0 : _sessionDetailQuery_data.session.label) || (matchingSession === null || matchingSession === void 0 ? void 0 : matchingSession.label) || "Analysis session";
    var _sessionDetailQuery_data_runtime;
    const sessionRuntime = (_sessionDetailQuery_data_runtime = (_sessionDetailQuery_data1 = sessionDetailQuery.data) === null || _sessionDetailQuery_data1 === void 0 ? void 0 : _sessionDetailQuery_data1.runtime) !== null && _sessionDetailQuery_data_runtime !== void 0 ? _sessionDetailQuery_data_runtime : null;
    var _sessionRuntime_session_total_tokens;
    const sessionTokenCount = Math.max((_sessionRuntime_session_total_tokens = sessionRuntime === null || sessionRuntime === void 0 ? void 0 : sessionRuntime.session_total_tokens) !== null && _sessionRuntime_session_total_tokens !== void 0 ? _sessionRuntime_session_total_tokens : 0, lastAssistantUsageTotal);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$AssistantRuntimeProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AssistantRuntimeProvider"], {
        runtime: runtime,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-full min-h-0 flex-col overflow-hidden rounded-[1.1rem] bg-transparent",
            children: [
                sessionId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "border-b border-border/60 px-2 pb-3 pt-2 sm:px-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3 md:hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$mobile$2d$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileNav"], {}, void 0, false, {
                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                lineNumber: 295,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 294,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-[1.9rem] font-semibold tracking-tight sm:text-[2.1rem]",
                                children: threadTitle
                            }, void 0, false, {
                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                lineNumber: 298,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 297,
                            columnNumber: 13
                        }, this),
                        sessionRuntime ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-border/70 bg-background/88 px-2.5 py-1",
                                    children: [
                                        "Agent ",
                                        sessionRuntime.agent_id
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 304,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-border/70 bg-background/88 px-2.5 py-1",
                                    children: sessionRuntime.model
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 307,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-border/70 bg-background/88 px-2.5 py-1",
                                    children: [
                                        formatCompactNumber(sessionTokenCount),
                                        " tokens"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 310,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-border/70 bg-background/88 px-2.5 py-1",
                                    children: [
                                        "Max steps ",
                                        sessionRuntime.max_steps
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 313,
                                    columnNumber: 17
                                }, this),
                                sessionRuntime.subagent_ids.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-border/70 bg-background/88 px-2.5 py-1",
                                    children: [
                                        sessionRuntime.subagent_ids.length,
                                        " subagent",
                                        sessionRuntime.subagent_ids.length === 1 ? "" : "s"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 317,
                                    columnNumber: 19
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 303,
                            columnNumber: 15
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                    lineNumber: 293,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-2 pb-2 pt-2 sm:px-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3 md:hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$mobile$2d$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileNav"], {}, void 0, false, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 328,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                        lineNumber: 327,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                    lineNumber: 326,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Root, {
                    className: "relative flex min-h-0 flex-1 flex-col",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Viewport, {
                            className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-2 ".concat(sessionId ? "pt-5" : "pt-2", " sm:px-4"),
                            children: [
                                messages.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ThreadWelcome, {
                                    onPrompt: handleNewMessage
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 339,
                                    columnNumber: 38
                                }, this) : null,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col gap-y-8 pb-8 empty:hidden",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageList"], {
                                        onRetry: retryLastTurn
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                                        lineNumber: 341,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 340,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 334,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative z-20 overflow-visible border-t border-border/60 bg-background/92 px-2 pb-2 pt-2 backdrop-blur-sm sm:px-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].ScrollToBottom, {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: "outline",
                                        size: "sm",
                                        className: "absolute bottom-full right-2 z-10 mb-2 hidden rounded-full bg-white/96 px-3 shadow-sm disabled:invisible md:inline-flex sm:right-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownIcon$3e$__["ArrowDownIcon"], {
                                                className: "size-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                                lineNumber: 351,
                                                columnNumber: 17
                                            }, this),
                                            "Jump to latest"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                                        lineNumber: 346,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 345,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mx-auto w-full max-w-4xl",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MessageComposer"], {}, void 0, false, {
                                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                                        lineNumber: 356,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 355,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 344,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                    lineNumber: 333,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/chat-panel.tsx",
            lineNumber: 291,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/chat-panel.tsx",
        lineNumber: 290,
        columnNumber: 5
    }, this);
}
_s(ChatPanel, "Z5hJHCZg7BN//FoXeg4FKmDRsBM=", false, function() {
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
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$core$2f$dist$2f$react$2f$runtimes$2f$useExternalStoreRuntime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useExternalStoreRuntime"]
    ];
});
_c = ChatPanel;
function ThreadWelcome(param) {
    let { onPrompt } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto flex w-full max-w-[58rem] flex-1 flex-col px-4 pb-14 pt-10 sm:pt-14",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "max-w-3xl text-[2rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.9rem] sm:leading-[1.02]",
                children: "What should we analyze today?"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 372,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-4 max-w-2xl text-[0.98rem] leading-7 text-muted-foreground sm:text-[1.05rem] sm:leading-8",
                children: "Answer business questions grounded on metrics, experiments, artifacts, and skills."
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 375,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-10 grid w-full gap-3.5 text-left sm:grid-cols-2",
                children: [
                    "What changed in activation over the last 4 weeks?",
                    "Show me the latest signup checkout experiment takeaways.",
                    "Turn this analysis into a short launch readout.",
                    "/artifacts search launch readiness"
                ].map((prompt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>{
                            void onPrompt(createAppendMessage(prompt));
                        },
                        className: "rounded-[1.2rem] border border-border/70 bg-white/72 px-5 py-4 text-left text-[0.97rem] leading-6 text-foreground/88 shadow-[0_8px_24px_rgba(36,29,20,0.05)] transition-[background-color,border-color,transform] hover:border-border hover:bg-white hover:-translate-y-px",
                        children: prompt
                    }, prompt, false, {
                        fileName: "[project]/src/components/chat/chat-panel.tsx",
                        lineNumber: 385,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 378,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/chat-panel.tsx",
        lineNumber: 371,
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
function createStreamingAssistantMessage(id) {
    return {
        id,
        role: "assistant",
        content: [
            {
                type: "data-trace",
                data: createExecutionTraceState()
            },
            {
                type: "text",
                text: ""
            }
        ],
        createdAt: new Date(),
        status: {
            type: "running"
        }
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
function mapRuntimeLabel(label, eventType) {
    const source = "".concat(label !== null && label !== void 0 ? label : "", " ").concat(eventType !== null && eventType !== void 0 ? eventType : "").toLowerCase();
    if (source.includes("metric")) return "Checking metrics";
    if (source.includes("experiment")) return "Reviewing experiments";
    if (source.includes("artifact")) return "Searching artifacts";
    if (source.includes("draft") || source.includes("response")) return "Drafting answer";
    return label !== null && label !== void 0 ? label : null;
}
function formatCompactNumber(value) {
    return new Intl.NumberFormat("en-US", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: 1
    }).format(value);
}
function applyStreamEventToMessage(message, event) {
    var _event_data_response, _event_data_response1;
    let content = Array.isArray(message.content) ? [
        ...message.content
    ] : [];
    const usage = extractUsageFromEvent(event);
    if (event.data.trace) {
        content = mergeTraceEventIntoContent(content, event.data.trace);
    }
    const responseText = (_event_data_response = event.data.response) === null || _event_data_response === void 0 ? void 0 : _event_data_response.text;
    if (typeof responseText === "string") {
        content = mergeTextPartIntoContent(content, responseText, "snapshot");
    } else if (typeof ((_event_data_response1 = event.data.response) === null || _event_data_response1 === void 0 ? void 0 : _event_data_response1.delta) === "string") {
        content = mergeTextPartIntoContent(content, event.data.response.delta, "delta");
    }
    return {
        ...message,
        content,
        metadata: usage ? {
            ...typeof message.metadata === "object" && message.metadata ? message.metadata : {},
            usage
        } : message.metadata
    };
}
function extractUsageFromEvent(event) {
    var _event_data_response_metadata;
    if (event.data.usage) {
        return event.data.usage;
    }
    return coerceUsageRecord((_event_data_response_metadata = event.data.response_metadata) === null || _event_data_response_metadata === void 0 ? void 0 : _event_data_response_metadata.token_usage);
}
function extractUsageFromMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return null;
    const usage = metadata.usage;
    return coerceUsageRecord(usage);
}
function coerceUsageRecord(value) {
    if (!value || typeof value !== "object") return null;
    const candidate = value;
    if (typeof candidate.input_tokens !== "number" || typeof candidate.output_tokens !== "number") {
        return null;
    }
    return {
        input_tokens: candidate.input_tokens,
        output_tokens: candidate.output_tokens,
        total_tokens: typeof candidate.total_tokens === "number" ? candidate.total_tokens : candidate.input_tokens + candidate.output_tokens
    };
}
function mergeTextPartIntoContent(content, incoming, mode) {
    var _nextContent_existingIndex;
    const nextContent = Array.isArray(content) ? [
        ...content
    ] : [];
    const existingIndex = nextContent.findIndex((part)=>typeof part === "object" && part && part.type === "text");
    const current = existingIndex >= 0 && ((_nextContent_existingIndex = nextContent[existingIndex]) === null || _nextContent_existingIndex === void 0 ? void 0 : _nextContent_existingIndex.type) === "text" ? nextContent[existingIndex].text : "";
    const nextText = mode === "delta" ? "".concat(current).concat(incoming) : current ? incoming.startsWith(current) ? incoming : current.startsWith(incoming) ? current : "".concat(current).concat(incoming) : incoming;
    const textPart = {
        type: "text",
        text: nextText
    };
    if (existingIndex >= 0) {
        nextContent[existingIndex] = textPart;
    } else {
        nextContent.push(textPart);
    }
    return nextContent;
}
function mergeTraceEventIntoContent(content, traceEvent) {
    var _nextContent_existingIndex;
    const nextContent = Array.isArray(content) ? [
        ...content
    ] : [];
    const existingIndex = nextContent.findIndex((part)=>typeof part === "object" && part && part.type === "data-trace");
    const currentTrace = existingIndex >= 0 && ((_nextContent_existingIndex = nextContent[existingIndex]) === null || _nextContent_existingIndex === void 0 ? void 0 : _nextContent_existingIndex.type) === "data-trace" ? nextContent[existingIndex].data : createExecutionTraceState();
    const nextTrace = applyTraceEvent(currentTrace, traceEvent);
    const tracePart = {
        type: "data-trace",
        data: nextTrace
    };
    if (existingIndex >= 0) {
        nextContent[existingIndex] = tracePart;
    } else {
        nextContent.unshift(tracePart);
    }
    return nextContent;
}
function mergeTraceStatusIntoContent(content, title, status, error) {
    return mergeTraceEventIntoContent(content, {
        kind: "status",
        status: status === "started" ? "started" : status === "completed" ? "completed" : "error",
        title,
        error
    });
}
function createExecutionTraceState() {
    return {
        status: "started",
        title: "Agent execution started",
        trace_id: null,
        error: null,
        steps: []
    };
}
function applyTraceEvent(state, event) {
    if (event.kind === "status") {
        var _event_trace_id, _ref, _event_error, _ref1;
        return {
            ...state,
            status: event.status === "started" ? "started" : event.status === "completed" ? "completed" : "error",
            title: event.title,
            trace_id: (_ref = (_event_trace_id = event.trace_id) !== null && _event_trace_id !== void 0 ? _event_trace_id : state.trace_id) !== null && _ref !== void 0 ? _ref : null,
            error: (_ref1 = (_event_error = event.error) !== null && _event_error !== void 0 ? _event_error : state.error) !== null && _ref1 !== void 0 ? _ref1 : null
        };
    }
    if (event.kind === "step") {
        const step = ensureTraceStep(state.steps, event.step_index, event.step_key);
        var _event_step_index, _event_step_key, _ref2, _event_assistant_text, _ref3, _event_token_usage, _ref4, _event_duration_ms, _ref5;
        const nextStep = {
            ...step,
            step_index: (_event_step_index = event.step_index) !== null && _event_step_index !== void 0 ? _event_step_index : step.step_index,
            step_key: (_ref2 = (_event_step_key = event.step_key) !== null && _event_step_key !== void 0 ? _event_step_key : step.step_key) !== null && _ref2 !== void 0 ? _ref2 : null,
            action_type: event.action_type,
            title: event.title,
            assistant_text: (_ref3 = (_event_assistant_text = event.assistant_text) !== null && _event_assistant_text !== void 0 ? _event_assistant_text : step.assistant_text) !== null && _ref3 !== void 0 ? _ref3 : null,
            tool_calls: [
                ...event.tool_calls
            ],
            token_usage: (_ref4 = (_event_token_usage = event.token_usage) !== null && _event_token_usage !== void 0 ? _event_token_usage : step.token_usage) !== null && _ref4 !== void 0 ? _ref4 : null,
            duration_ms: (_ref5 = (_event_duration_ms = event.duration_ms) !== null && _event_duration_ms !== void 0 ? _event_duration_ms : step.duration_ms) !== null && _ref5 !== void 0 ? _ref5 : null
        };
        var _event_trace_id1, _ref6;
        return {
            ...state,
            trace_id: (_ref6 = (_event_trace_id1 = event.trace_id) !== null && _event_trace_id1 !== void 0 ? _event_trace_id1 : state.trace_id) !== null && _ref6 !== void 0 ? _ref6 : null,
            steps: upsertTraceStep(state.steps, nextStep)
        };
    }
    const step = ensureTraceStep(state.steps, event.step_index, event.step_key);
    var _event_tool_call_id, _event_tool_name, _event_duration_ms1;
    const nextResult = {
        tool_call_id: (_event_tool_call_id = event.tool_call_id) !== null && _event_tool_call_id !== void 0 ? _event_tool_call_id : null,
        tool_name: (_event_tool_name = event.tool_name) !== null && _event_tool_name !== void 0 ? _event_tool_name : null,
        duration_ms: (_event_duration_ms1 = event.duration_ms) !== null && _event_duration_ms1 !== void 0 ? _event_duration_ms1 : null,
        is_error: event.is_error,
        metadata: {
            ...event.metadata
        }
    };
    var _event_step_index1, _event_step_key1, _ref7;
    const nextStep = {
        ...step,
        step_index: (_event_step_index1 = event.step_index) !== null && _event_step_index1 !== void 0 ? _event_step_index1 : step.step_index,
        step_key: (_ref7 = (_event_step_key1 = event.step_key) !== null && _event_step_key1 !== void 0 ? _event_step_key1 : step.step_key) !== null && _ref7 !== void 0 ? _ref7 : null,
        results: upsertTraceResult(step.results, nextResult)
    };
    var _event_trace_id2, _ref8;
    return {
        ...state,
        trace_id: (_ref8 = (_event_trace_id2 = event.trace_id) !== null && _event_trace_id2 !== void 0 ? _event_trace_id2 : state.trace_id) !== null && _ref8 !== void 0 ? _ref8 : null,
        steps: upsertTraceStep(state.steps, nextStep)
    };
}
function ensureTraceStep(steps, stepIndex, stepKey) {
    var _steps_find;
    return (_steps_find = steps.find((step)=>stepKey && step.step_key === stepKey || typeof stepIndex === "number" && step.step_index === stepIndex)) !== null && _steps_find !== void 0 ? _steps_find : {
        step_index: typeof stepIndex === "number" && stepIndex > 0 ? stepIndex : steps.length + 1,
        step_key: stepKey !== null && stepKey !== void 0 ? stepKey : null,
        action_type: "tool_call",
        title: "Calling tools",
        assistant_text: null,
        tool_calls: [],
        token_usage: null,
        duration_ms: null,
        results: []
    };
}
function upsertTraceStep(steps, nextStep) {
    const nextSteps = steps.map((step)=>({
            ...step,
            results: [
                ...step.results
            ]
        }));
    const index = nextSteps.findIndex((step)=>nextStep.step_key && step.step_key === nextStep.step_key || step.step_index === nextStep.step_index);
    if (index >= 0) {
        nextSteps[index] = nextStep;
    } else {
        nextSteps.push(nextStep);
    }
    return nextSteps.sort((left, right)=>left.step_index - right.step_index);
}
function upsertTraceResult(results, nextResult) {
    const nextResults = [
        ...results
    ];
    const index = nextResults.findIndex((result)=>nextResult.tool_call_id && result.tool_call_id === nextResult.tool_call_id || !nextResult.tool_call_id && result.tool_name === nextResult.tool_name && result.duration_ms === nextResult.duration_ms);
    if (index >= 0) {
        nextResults[index] = nextResult;
    } else {
        nextResults.push(nextResult);
    }
    return nextResults;
}
var _c, _c1;
__turbopack_context__.k.register(_c, "ChatPanel");
__turbopack_context__.k.register(_c1, "ThreadWelcome");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_ad3fc36b._.js.map