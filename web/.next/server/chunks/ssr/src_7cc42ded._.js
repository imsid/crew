module.exports = [
"[project]/src/lib/commands.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SLASH_COMMANDS",
    ()=>SLASH_COMMANDS,
    "executeInlineCommand",
    ()=>executeInlineCommand,
    "parseSlashCommand",
    ()=>parseSlashCommand
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
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
    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) return null;
    const parts = trimmed.split(/\s+/);
    const surface = parts[0]?.slice(1);
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
        if (command.operation === "list") {
            return {
                surface: "metrics",
                operation: "list",
                data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listMetrics"])(token)
            };
        }
        if (command.operation === "search") {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listMetrics"])(token);
            const query = command.query ?? "";
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
        const config = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listMetrics"])(token)).configs.find((item)=>item.name === (command.target ?? ""));
        const detail = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMetric"])(token, command.target ?? "", config?.kind === "source" ? "source" : "metric");
        const compile = detail.kind === "metric" ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compileMetric"])(token, detail.name, detail.document?.dimensions ?? []).catch(()=>null) : null;
        return {
            surface: "metrics",
            operation: "show",
            target: command.target ?? detail.name,
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
                data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listExperiments"])(token)
            };
        }
        if (command.operation === "search") {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listExperiments"])(token);
            const query = command.query ?? "";
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
        const detail = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getExperiment"])(token, command.target ?? "");
        const plan = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getExperimentPlan"])(token, detail.name).catch(()=>null);
        return {
            surface: "experiments",
            operation: "show",
            target: command.target ?? detail.name,
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
            data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listArtifacts"])(token)
        };
    }
    if (command.operation === "search") {
        return {
            surface: "artifacts",
            operation: "search",
            query: command.query ?? "",
            data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["searchArtifacts"])(token, command.query ?? "")
        };
    }
    return {
        surface: "artifacts",
        operation: "show",
        target: command.target ?? "",
        data: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getArtifact"])(token, command.target ?? "")
    };
}
}),
"[project]/src/lib/chat-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DRAFT_THREAD_KEY",
    ()=>DRAFT_THREAD_KEY,
    "getThreadState",
    ()=>getThreadState,
    "useChatStore",
    ()=>useChatStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
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
const useChatStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
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
                const existing = state.threads[threadKey] ?? createThreadState();
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
        replaceMessages: (threadKey, messages)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...state.threads[threadKey] ?? createThreadState(),
                            messages: [
                                ...messages
                            ]
                        }
                    }
                })),
        appendMessage: (threadKey, message)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...state.threads[threadKey] ?? createThreadState(),
                            messages: [
                                ...state.threads[threadKey]?.messages ?? [],
                                message
                            ]
                        }
                    }
                })),
        updateMessage: (threadKey, messageId, updater)=>set((state)=>{
                const current = state.threads[threadKey] ?? createThreadState();
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
        setRunning: (threadKey, isRunning)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...state.threads[threadKey] ?? createThreadState(),
                            isRunning
                        }
                    }
                })),
        setStatusLabel: (threadKey, statusLabel)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...state.threads[threadKey] ?? createThreadState(),
                            statusLabel
                        }
                    }
                })),
        setAbortController: (threadKey, abortController)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...state.threads[threadKey] ?? createThreadState(),
                            abortController
                        }
                    }
                })),
        setLastSubmitted: (threadKey, value)=>set((state)=>({
                    threads: {
                        ...state.threads,
                        [threadKey]: {
                            ...state.threads[threadKey] ?? createThreadState(),
                            lastSubmitted: value
                        }
                    }
                })),
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
    return useChatStore.getState().threads[threadKey] ?? createThreadState();
}
const DRAFT_THREAD_KEY = "draft";
}),
"[project]/src/components/chat/message-composer.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageComposer",
    ()=>MessageComposer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/AuiIf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/composer.js [app-ssr] (ecmascript) <export * as ComposerPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAui.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAuiState.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-up.js [app-ssr] (ecmascript) <export default as ArrowUpIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeftIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/corner-down-left.js [app-ssr] (ecmascript) <export default as CornerDownLeftIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square.js [app-ssr] (ecmascript) <export default as SquareIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-ssr] (ecmascript)");
;
"use client";
;
;
;
;
;
;
;
const SlashCommandPalette = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/chat/slash-command-palette.tsx [app-ssr] (ecmascript, next/dynamic entry, async loader)").then((mod)=>mod.SlashCommandPalette), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/chat/slash-command-palette.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    }
});
function MessageComposer() {
    const aui = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAui$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAui"])();
    const text = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuiState"])((state)=>state.composer.text);
    const isRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuiState"])((state)=>state.thread.isRunning);
    const [highlightedIndex, setHighlightedIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const visibleCommands = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const normalized = text.trim().toLowerCase().replace(/^\//, "");
        if (!text.startsWith("/")) return [];
        if (!normalized) return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SLASH_COMMANDS"];
        return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SLASH_COMMANDS"].filter((command)=>`${command.surface} ${command.operation} ${command.label} ${command.hint}`.toLowerCase().includes(normalized));
    }, [
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative isolate",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SlashCommandPalette, {
                query: text,
                highlightedIndex: highlightedIndex,
                onSelect: ()=>setHighlightedIndex(0),
                className: "absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-50"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-composer.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Root, {
                className: "rounded-[1.35rem] border border-border/80 bg-white/98 shadow-[0_10px_28px_rgba(36,29,20,0.06)] backdrop-blur-sm transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Input, {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between gap-3 border-t border-border/70 px-3.5 py-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hidden items-center gap-2 text-[12px] text-muted-foreground sm:flex",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeftIcon$3e$__["CornerDownLeftIcon"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ml-auto",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>!state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Send, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                className: "size-9 shadow-sm",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpIcon$3e$__["ArrowUpIcon"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 88,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Cancel, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                variant: "secondary",
                                                className: "size-9 border border-border/70",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareIcon$3e$__["SquareIcon"], {
                                                        className: "size-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 96,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
}),
"[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "badgeVariants",
    ()=>badgeVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
;
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", {
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
function Badge({ className, variant, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(badgeVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/badge.tsx",
        lineNumber: 26,
        columnNumber: 10
    }, this);
}
;
}),
"[project]/src/components/ui/collapsible.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Collapsible",
    ()=>Collapsible,
    "CollapsibleContent",
    ()=>CollapsibleContent,
    "CollapsibleTrigger",
    ()=>CollapsibleTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-collapsible/dist/index.mjs [app-ssr] (ecmascript)");
"use client";
;
const Collapsible = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Root"];
const CollapsibleTrigger = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Trigger"];
const CollapsibleContent = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$collapsible$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Content"];
;
}),
"[project]/src/components/chat/execution-trace.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExecutionTrace",
    ()=>ExecutionTrace
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as CheckIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDownIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDownIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as LoaderCircleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as TriangleAlertIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/collapsible.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
function ExecutionTrace({ trace, isRunning, className }) {
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(isRunning);
    const [hasInteracted, setHasInteracted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const wasRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(isRunning);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isRunning && !wasRunning.current && !hasInteracted) {
            setOpen(true);
        }
        if (!isRunning && wasRunning.current && !hasInteracted) {
            setOpen(false);
        }
        wasRunning.current = isRunning;
    }, [
        hasInteracted,
        isRunning
    ]);
    const stepCount = trace.steps.length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Collapsible"], {
        open: open,
        onOpenChange: (nextOpen)=>{
            setHasInteracted(true);
            setOpen(nextOpen);
        },
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-[1.15rem] border border-border/70 bg-secondary/45 shadow-sm", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CollapsibleTrigger"], {
                className: "flex w-full items-center gap-3 px-4 py-3 text-left",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-w-0 flex-1 items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex size-8 shrink-0 items-center justify-center rounded-full border", trace.status === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/15 bg-white/80 text-primary"),
                                children: isRunning ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__["LoaderCircleIcon"], {
                                    className: "size-4 animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                    lineNumber: 67,
                                    columnNumber: 15
                                }, this) : trace.status === "error" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__["TriangleAlertIcon"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                    lineNumber: 69,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__["CheckIcon"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-semibold",
                                                children: trace.title
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 76,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDownIcon$3e$__["ChevronDownIcon"], {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-4 shrink-0 transition-transform", open && "rotate-180")
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$collapsible$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CollapsibleContent"], {
                className: "border-t border-border/70 px-4 py-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        trace.steps.map((step)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-medium",
                                                children: step.title
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 101,
                                                columnNumber: 17
                                            }, this),
                                            step.tool_calls.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-mono text-[13px] text-primary/90",
                                                children: step.tool_calls.map((toolCall)=>toolCall.name || "tool").join(", ")
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 103,
                                                columnNumber: 19
                                            }, this) : null,
                                            step.token_usage ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-sky-700/80",
                                                children: formatUsage(step.token_usage)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                lineNumber: 110,
                                                columnNumber: 19
                                            }, this) : null,
                                            typeof step.duration_ms === "number" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                    step.assistant_text ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "pl-6 text-sm leading-6 text-muted-foreground",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                    step.tool_calls.map((toolCall)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "pl-6 font-mono text-[13px] leading-6 text-fuchsia-500",
                                            children: formatToolCall(toolCall)
                                        }, `${step.step_key || step.step_index}:${toolCall.id || toolCall.name}`, false, {
                                            fileName: "[project]/src/components/chat/execution-trace.tsx",
                                            lineNumber: 131,
                                            columnNumber: 17
                                        }, this)),
                                    step.results.map((result, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("pl-6 text-sm leading-6", result.is_error ? "text-destructive" : "text-muted-foreground"),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "mr-2 font-mono",
                                                    children: result.is_error ? "!" : "✓"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                    lineNumber: 147,
                                                    columnNumber: 19
                                                }, this),
                                                "Executed",
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-medium text-foreground/85",
                                                    children: result.tool_name || "tool"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/chat/execution-trace.tsx",
                                                    lineNumber: 151,
                                                    columnNumber: 19
                                                }, this),
                                                typeof result.duration_ms === "number" ? ` in ${result.duration_ms}ms` : "",
                                                formatResultMetadata(result.metadata)
                                            ]
                                        }, `${step.step_key || step.step_index}:result:${result.tool_call_id || index}`, true, {
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
                        trace.error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function formatUsage(usage) {
    return `(${usage.input_tokens}+${usage.output_tokens} tokens)`;
}
function formatToolCall(toolCall) {
    const name = toolCall.name || "tool";
    const args = Object.entries(toolCall.arguments || {});
    if (args.length === 0) return `${name}()`;
    const preview = args.slice(0, 3).map(([key, value])=>`${key}=${formatArgument(value)}`).join(", ");
    return `${name}(${preview}${args.length > 3 ? ", …" : ""})`;
}
function formatArgument(value) {
    if (typeof value === "string") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncate"])(value, 36);
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item)=>formatArgument(item)).join(", ")}]`;
    }
    if (value && typeof value === "object") {
        return "{…}";
    }
    return "null";
}
function formatResultMetadata(metadata) {
    const extras = Object.entries(metadata).slice(0, 2).map(([key, value])=>{
        const label = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["titleizeIdentifier"])(key).toLowerCase();
        if (typeof value === "number" || typeof value === "boolean") {
            return `${label}: ${value}`;
        }
        if (typeof value === "string" && value.trim()) {
            return `${label}: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncate"])(value, 32)}`;
        }
        return null;
    }).filter((value)=>Boolean(value));
    return extras.length > 0 ? ` (${extras.join(", ")})` : "";
}
}),
"[project]/src/components/chat/message-list.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageList",
    ()=>MessageList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/actionBar.js [app-ssr] (ecmascript) <export * as ActionBarPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/error.js [app-ssr] (ecmascript) <export * as ErrorPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/message.js [app-ssr] (ecmascript) <export * as MessagePrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/thread.js [app-ssr] (ecmascript) <export * as ThreadPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/store/dist/useAuiState.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-ssr] (ecmascript) <export default as CopyIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCwIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-ssr] (ecmascript) <export default as RefreshCwIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$execution$2d$trace$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/execution-trace.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-ssr] (ecmascript)");
;
;
"use client";
;
;
;
;
;
;
const MarkdownRenderer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/chat/markdown-renderer.tsx [app-ssr] (ecmascript, next/dynamic entry, async loader)").then((mod)=>mod.MarkdownRenderer), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/chat/markdown-renderer.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    loading: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm leading-6 text-foreground/90",
            children: "Loading response…"
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 19,
            columnNumber: 20
        }, ("TURBOPACK compile-time value", void 0))
});
const CommandResultCard = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/chat/command-result-card.tsx [app-ssr] (ecmascript, next/dynamic entry, async loader)").then((mod)=>mod.CommandResultCard), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/chat/command-result-card.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    loading: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandLoadingCard, {
            label: "Loading command result"
        }, void 0, false, {
            fileName: "[project]/src/components/chat/message-list.tsx",
            lineNumber: 26,
            columnNumber: 20
        }, ("TURBOPACK compile-time value", void 0))
});
function MessageList({ onRetry }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Messages, {
        components: {
            UserMessage,
            AssistantMessage: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AssistantMessage, {
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
function UserMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "mx-auto grid w-full max-w-4xl grid-cols-[minmax(0,1fr)_auto] px-2",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "col-start-2 max-w-[94%] rounded-[1.55rem] bg-primary px-5 py-3.5 text-sm text-primary-foreground shadow-sm sm:max-w-[88%]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: ({ part })=>{
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function AssistantMessage({ onRetry }) {
    const isThreadRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$useAuiState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuiState"])((state)=>state.thread.isRunning);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "mx-auto w-full max-w-4xl px-2",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                            children: ({ part })=>{
                                if (part.type === "text") {
                                    if (!part.text && !isThreadRunning) return null;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MarkdownRenderer, {
                                        markdown: part.text || "_Working on it…_",
                                        className: "thread-prose"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 78,
                                        columnNumber: 19
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "trace") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$execution$2d$trace$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ExecutionTrace"], {
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
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandLoadingCard, {
                                        label: label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 102,
                                        columnNumber: 24
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-result") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandResultCard, {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Error, {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Root, {
                                className: "rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__["AlertTriangleIcon"], {
                                            className: "mt-0.5 size-4 text-destructive"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 116,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Message, {}, void 0, false, {
                                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                                    lineNumber: 118,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__["ActionBarPrimitive"].Root, {
                        hideWhenRunning: true,
                        autohide: "never",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__["ActionBarPrimitive"].Copy, {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "ghost",
                                    size: "sm",
                                    className: "min-h-9 rounded-full px-3 text-xs",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CopyIcon$3e$__["CopyIcon"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$actionBar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ActionBarPrimitive$3e$__["ActionBarPrimitive"].Reload, {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    variant: "ghost",
                                    size: "sm",
                                    className: "min-h-9 rounded-full px-3 text-xs",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCwIcon$3e$__["RefreshCwIcon"], {
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
function SystemMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "mx-auto w-full max-w-4xl px-2",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "rounded-[1.2rem] border border-dashed border-border/80 bg-white/70 px-4 py-3 text-sm text-muted-foreground",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: ({ part })=>{
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function CommandLoadingCard({ label }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-[1.15rem] border border-dashed border-border/80 bg-white/78 px-4 py-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-medium",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
}),
"[project]/src/components/chat/chat-panel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatPanel",
    ()=>ChatPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$AssistantRuntimeProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/legacy-runtime/AssistantRuntimeProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/thread.js [app-ssr] (ecmascript) <export * as ThreadPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$core$2f$dist$2f$react$2f$runtimes$2f$useExternalStoreRuntime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/core/dist/react/runtimes/useExternalStoreRuntime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-down.js [app-ssr] (ecmascript) <export default as ArrowDownIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/chat-store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/auth-provider.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-composer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-list.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$mobile$2d$nav$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/mobile-nav.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-ssr] (ecmascript)");
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
;
function ChatPanel({ sessionId }) {
    const threadKey = sessionId ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DRAFT_THREAD_KEY"];
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { auth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const thread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.threads[threadKey]);
    const ensureThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.ensureThread);
    const hydrateThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.hydrateThread);
    const replaceMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.replaceMessages);
    const appendMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.appendMessage);
    const updateMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.updateMessage);
    const setRunning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.setRunning);
    const setStatusLabel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.setStatusLabel);
    const setAbortController = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.setAbortController);
    const moveThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.moveThread);
    const setLastSubmitted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"])((state)=>state.setLastSubmitted);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        ensureThread(threadKey);
    }, [
        ensureThread,
        threadKey
    ]);
    const sessionsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "session-records",
            "list"
        ],
        queryFn: ()=>auth ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listSessions"])(auth.token) : null,
        enabled: Boolean(auth && sessionId)
    });
    const sessionDetailQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "session-detail",
            sessionId
        ],
        queryFn: ()=>auth && sessionId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSession"])(auth.token, sessionId) : null,
        enabled: Boolean(auth && sessionId),
        staleTime: 300_000
    });
    const shouldLoadHistory = Boolean(auth && sessionId && !thread?.hydrated);
    const historyQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            "session-history",
            sessionId
        ],
        queryFn: ()=>auth && sessionId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSessionHistory"])(auth.token, sessionId) : null,
        enabled: shouldLoadHistory,
        staleTime: 300_000
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!historyQuery.data?.turns) return;
        hydrateThread(threadKey, buildHistoryMessages(historyQuery.data.turns));
    }, [
        historyQuery.data?.turns,
        hydrateThread,
        threadKey
    ]);
    const messages = thread?.messages ?? [];
    const isRunning = thread?.isRunning ?? false;
    const handleNewMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (message)=>{
        if (!auth) return;
        const text = extractText(message);
        if (!text) return;
        const slashCommand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseSlashCommand"])(text);
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
                            label: `Running ${slashCommand.surface}`
                        }
                    }
                ],
                createdAt: new Date(),
                status: {
                    type: "running"
                }
            });
            setRunning(threadKey, true);
            setStatusLabel(threadKey, `Running ${slashCommand.surface}`);
            setLastSubmitted(threadKey, {
                kind: "command",
                text
            });
            try {
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["executeInlineCommand"])(auth.token, slashCommand);
                updateMessage(threadKey, assistantId, (current)=>({
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
                    }));
            } catch (error) {
                updateMessage(threadKey, assistantId, (current)=>({
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
                    }));
            } finally{
                setRunning(threadKey, false);
                setStatusLabel(threadKey, null);
            }
            return;
        }
        const activeSessionId = sessionId ?? (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSession"])(auth.token, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncate"])(text.replace(/\s+/g, " "), 48))).session_id;
        const activeThreadKey = activeSessionId;
        if (!sessionId) {
            moveThread(threadKey, activeThreadKey);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["startTransition"])(()=>{
                router.replace(`/app/chat/${activeSessionId}`);
            });
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
            const { request_id } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendMessage"])(auth.token, activeSessionId, text);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["streamSessionEvents"])(auth.token, activeSessionId, request_id, (event)=>{
                const responseText = event.data.response?.text;
                const nextLabel = mapRuntimeLabel(event.data.runtime_event?.label, event.data.runtime_event?.event_type);
                if (nextLabel) {
                    setStatusLabel(activeThreadKey, nextLabel);
                }
                updateMessage(activeThreadKey, assistantId, (current)=>applyStreamEventToMessage(current, event));
                if (event.event === "request.completed") {
                    updateMessage(activeThreadKey, assistantId, (current)=>({
                            ...current,
                            status: {
                                type: "complete",
                                reason: "stop"
                            }
                        }));
                }
                if (event.event === "request.error") {
                    updateMessage(activeThreadKey, assistantId, (current)=>({
                            ...current,
                            status: {
                                type: "incomplete",
                                reason: "error",
                                error: event.data.error ?? "Streaming failed"
                            }
                        }));
                }
            }, controller.signal);
        } catch (error) {
            const aborted = error instanceof DOMException && error.name === "AbortError";
            updateMessage(activeThreadKey, assistantId, (current)=>({
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
                }));
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
    }, [
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
    const retryLastTurn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const lastSubmitted = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"].getState().threads[threadKey]?.lastSubmitted;
        if (!lastSubmitted || !auth) return;
        if (lastSubmitted.kind !== "agent") return;
        await handleNewMessage(createAppendMessage(lastSubmitted.text));
    }, [
        auth,
        handleNewMessage,
        threadKey
    ]);
    const runtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$core$2f$dist$2f$react$2f$runtimes$2f$useExternalStoreRuntime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExternalStoreRuntime"])({
        messages,
        isRunning,
        convertMessage: (message)=>message,
        setMessages: (nextMessages)=>replaceMessages(threadKey, nextMessages),
        onNew: handleNewMessage,
        onCancel: async ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatStore"].getState().threads[threadKey]?.abortController?.abort();
        }
    });
    const matchingSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(sessionsQuery.data?.sessions ?? []).find((session)=>session.session_id === sessionId) ?? null, [
        sessionId,
        sessionsQuery.data?.sessions
    ]);
    const lastAssistantUsageTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        for(let index = messages.length - 1; index >= 0; index -= 1){
            const message = messages[index];
            if (message.role !== "assistant") continue;
            const usage = extractUsageFromMetadata(message.metadata);
            if (typeof usage?.total_tokens === "number" && usage.total_tokens > 0) {
                return usage.total_tokens;
            }
        }
        return 0;
    }, [
        messages
    ]);
    const threadTitle = sessionDetailQuery.data?.session.label || matchingSession?.label || "Analysis session";
    const sessionRuntime = sessionDetailQuery.data?.runtime ?? null;
    const sessionTokenCount = Math.max(sessionRuntime?.session_total_tokens ?? 0, lastAssistantUsageTotal);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$AssistantRuntimeProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AssistantRuntimeProvider"], {
        runtime: runtime,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-full min-h-0 flex-col overflow-hidden rounded-[1.1rem] bg-transparent",
            children: [
                sessionId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "border-b border-border/60 px-2 pb-3 pt-2 sm:px-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3 md:hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$mobile$2d$nav$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MobileNav"], {}, void 0, false, {
                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                lineNumber: 295,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/chat-panel.tsx",
                            lineNumber: 294,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
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
                        sessionRuntime ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "rounded-full border border-border/70 bg-background/88 px-2.5 py-1",
                                    children: sessionRuntime.model
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 307,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                sessionRuntime.subagent_ids.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-2 pb-2 pt-2 sm:px-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3 md:hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$mobile$2d$nav$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MobileNav"], {}, void 0, false, {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Root, {
                    className: "relative flex min-h-0 flex-1 flex-col",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Viewport, {
                            className: `flex min-h-0 flex-1 flex-col overflow-y-auto px-2 ${sessionId ? "pt-5" : "pt-2"} sm:px-4`,
                            children: [
                                messages.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThreadWelcome, {
                                    onPrompt: handleNewMessage
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 339,
                                    columnNumber: 38
                                }, this) : null,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col gap-y-8 pb-8 empty:hidden",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MessageList"], {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative z-20 overflow-visible border-t border-border/60 bg-background/92 px-2 pb-2 pt-2 backdrop-blur-sm sm:px-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].ScrollToBottom, {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: "outline",
                                        size: "sm",
                                        className: "absolute bottom-full right-2 z-10 mb-2 hidden rounded-full bg-white/96 px-3 shadow-sm disabled:invisible md:inline-flex sm:right-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownIcon$3e$__["ArrowDownIcon"], {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mx-auto w-full max-w-4xl",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MessageComposer"], {}, void 0, false, {
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
function ThreadWelcome({ onPrompt }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto flex w-full max-w-[58rem] flex-1 flex-col px-4 pb-14 pt-10 sm:pt-14",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "max-w-3xl text-[2rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.9rem] sm:leading-[1.02]",
                children: "What should we analyze today?"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 372,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-4 max-w-2xl text-[0.98rem] leading-7 text-muted-foreground sm:text-[1.05rem] sm:leading-8",
                children: "Answer business questions grounded on metrics, experiments, artifacts, and skills."
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 375,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-10 grid w-full gap-3.5 text-left sm:grid-cols-2",
                children: [
                    "What changed in activation over the last 4 weeks?",
                    "Show me the latest signup checkout experiment takeaways.",
                    "Turn this analysis into a short launch readout.",
                    "/artifacts search launch readiness"
                ].map((prompt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
function createUiId(prefix) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
    }
    return `${prefix}_${Math.random().toString(16).slice(2)}`;
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
                id: `${turn.turn_id}_user`,
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
                id: `${turn.turn_id}_assistant`,
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
    const source = `${label ?? ""} ${eventType ?? ""}`.toLowerCase();
    if (source.includes("metric")) return "Checking metrics";
    if (source.includes("experiment")) return "Reviewing experiments";
    if (source.includes("artifact")) return "Searching artifacts";
    if (source.includes("draft") || source.includes("response")) return "Drafting answer";
    return label ?? null;
}
function formatCompactNumber(value) {
    return new Intl.NumberFormat("en-US", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: 1
    }).format(value);
}
function applyStreamEventToMessage(message, event) {
    let content = Array.isArray(message.content) ? [
        ...message.content
    ] : [];
    const usage = extractUsageFromEvent(event);
    if (event.data.trace) {
        content = mergeTraceEventIntoContent(content, event.data.trace);
    }
    const responseText = event.data.response?.text;
    if (typeof responseText === "string") {
        content = mergeTextPartIntoContent(content, responseText, "snapshot");
    } else if (typeof event.data.response?.delta === "string") {
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
    if (event.data.usage) {
        return event.data.usage;
    }
    return coerceUsageRecord(event.data.response_metadata?.token_usage);
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
    const nextContent = Array.isArray(content) ? [
        ...content
    ] : [];
    const existingIndex = nextContent.findIndex((part)=>typeof part === "object" && part && part.type === "text");
    const current = existingIndex >= 0 && nextContent[existingIndex]?.type === "text" ? nextContent[existingIndex].text : "";
    const nextText = mode === "delta" ? `${current}${incoming}` : current ? incoming.startsWith(current) ? incoming : current.startsWith(incoming) ? current : `${current}${incoming}` : incoming;
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
    const nextContent = Array.isArray(content) ? [
        ...content
    ] : [];
    const existingIndex = nextContent.findIndex((part)=>typeof part === "object" && part && part.type === "data-trace");
    const currentTrace = existingIndex >= 0 && nextContent[existingIndex]?.type === "data-trace" ? nextContent[existingIndex].data : createExecutionTraceState();
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
        return {
            ...state,
            status: event.status === "started" ? "started" : event.status === "completed" ? "completed" : "error",
            title: event.title,
            trace_id: event.trace_id ?? state.trace_id ?? null,
            error: event.error ?? state.error ?? null
        };
    }
    if (event.kind === "step") {
        const step = ensureTraceStep(state.steps, event.step_index, event.step_key);
        const nextStep = {
            ...step,
            step_index: event.step_index ?? step.step_index,
            step_key: event.step_key ?? step.step_key ?? null,
            action_type: event.action_type,
            title: event.title,
            assistant_text: event.assistant_text ?? step.assistant_text ?? null,
            tool_calls: [
                ...event.tool_calls
            ],
            token_usage: event.token_usage ?? step.token_usage ?? null,
            duration_ms: event.duration_ms ?? step.duration_ms ?? null
        };
        return {
            ...state,
            trace_id: event.trace_id ?? state.trace_id ?? null,
            steps: upsertTraceStep(state.steps, nextStep)
        };
    }
    const step = ensureTraceStep(state.steps, event.step_index, event.step_key);
    const nextResult = {
        tool_call_id: event.tool_call_id ?? null,
        tool_name: event.tool_name ?? null,
        duration_ms: event.duration_ms ?? null,
        is_error: event.is_error,
        metadata: {
            ...event.metadata
        }
    };
    const nextStep = {
        ...step,
        step_index: event.step_index ?? step.step_index,
        step_key: event.step_key ?? step.step_key ?? null,
        results: upsertTraceResult(step.results, nextResult)
    };
    return {
        ...state,
        trace_id: event.trace_id ?? state.trace_id ?? null,
        steps: upsertTraceStep(state.steps, nextStep)
    };
}
function ensureTraceStep(steps, stepIndex, stepKey) {
    return steps.find((step)=>stepKey && step.step_key === stepKey || typeof stepIndex === "number" && step.step_index === stepIndex) ?? {
        step_index: typeof stepIndex === "number" && stepIndex > 0 ? stepIndex : steps.length + 1,
        step_key: stepKey ?? null,
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
}),
];

//# sourceMappingURL=src_7cc42ded._.js.map