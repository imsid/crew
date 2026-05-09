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
        className: "space-y-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SlashCommandPalette, {
                query: text,
                highlightedIndex: highlightedIndex,
                onSelect: ()=>setHighlightedIndex(0)
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-composer.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Root, {
                className: "rounded-[1.6rem] border border-border/80 bg-white/95 shadow-lg",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Input, {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hidden items-center gap-2 text-xs text-muted-foreground sm:flex",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$corner$2d$down$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CornerDownLeftIcon$3e$__["CornerDownLeftIcon"], {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ml-auto",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>!state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Send, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                className: "size-11",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpIcon$3e$__["ArrowUpIcon"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 84,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$store$2f$dist$2f$AuiIf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuiIf"], {
                                        condition: (state)=>state.thread.isRunning,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$composer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ComposerPrimitive$3e$__["ComposerPrimitive"].Cancel, {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon",
                                                variant: "secondary",
                                                className: "size-11",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareIcon$3e$__["SquareIcon"], {
                                                        className: "size-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/chat/message-composer.tsx",
                                                        lineNumber: 92,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
"[project]/src/components/chat/message-list.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MessageList",
    ()=>MessageList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/error.js [app-ssr] (ecmascript) <export * as ErrorPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/message.js [app-ssr] (ecmascript) <export * as MessagePrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__ = __turbopack_context__.i("[project]/node_modules/@assistant-ui/react/dist/primitives/thread.js [app-ssr] (ecmascript) <export * as ThreadPrimitive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-ssr] (ecmascript) <export default as AlertTriangleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)");
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
            lineNumber: 17,
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
            lineNumber: 24,
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
function UserMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "flex justify-end px-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[85%] rounded-[1.4rem] bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: ({ part })=>{
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function AssistantMessage({ onRetry }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "px-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[92%] space-y-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 pl-1",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-[1.4rem] border border-border/80 bg-white/95 px-4 py-4 shadow-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                            children: ({ part })=>{
                                if (part.type === "text") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MarkdownRenderer, {
                                        markdown: part.text
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 70,
                                        columnNumber: 24
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-loading") {
                                    const label = typeof part.data === "object" && part.data && "label" in part.data && typeof part.data.label === "string" ? part.data.label : "Running command";
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandLoadingCard, {
                                        label: label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/chat/message-list.tsx",
                                        lineNumber: 81,
                                        columnNumber: 24
                                    }, this);
                                }
                                if (part.type === "data" && part.name === "command-result") {
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CommandResultCard, {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Error, {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Root, {
                                className: "mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangleIcon$3e$__["AlertTriangleIcon"], {
                                            className: "mt-0.5 size-4 text-destructive"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/message-list.tsx",
                                            lineNumber: 94,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$error$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ErrorPrimitive$3e$__["ErrorPrimitive"].Message, {}, void 0, false, {
                                                    fileName: "[project]/src/components/chat/message-list.tsx",
                                                    lineNumber: 96,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
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
function SystemMessage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Root, {
        className: "px-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-[92%] rounded-[1.4rem] border border-dashed border-border/80 bg-white/75 px-4 py-3 text-sm text-muted-foreground",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$message$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__MessagePrimitive$3e$__["MessagePrimitive"].Parts, {
                children: ({ part })=>{
                    if (part.type !== "text") return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function CommandLoadingCard({ label }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-[1.2rem] border border-dashed border-border/80 bg-white/80 px-4 py-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-medium",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/chat/message-list.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
}),
"[project]/src/components/chat/streaming-status.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StreamingStatus",
    ()=>StreamingStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as LoaderCircleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
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
function StreamingStatus({ isRunning, label, className }) {
    const [stepIndex, setStepIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isRunning || label) return;
        const timer = window.setInterval(()=>{
            setStepIndex((current)=>(current + 1) % fallbackSteps.length);
        }, 2200);
        return ()=>window.clearInterval(timer);
    }, [
        isRunning,
        label
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isRunning) {
            setStepIndex(0);
        }
    }, [
        isRunning
    ]);
    if (!isRunning) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2 rounded-full border border-border/80 bg-white/90 px-4 py-2 text-sm text-muted-foreground shadow-sm", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LoaderCircleIcon$3e$__["LoaderCircleIcon"], {
                className: "size-4 animate-spin"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/streaming-status.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label || fallbackSteps[stepIndex]
            }, void 0, false, {
                fileName: "[project]/src/components/chat/streaming-status.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
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
}),
"[project]/src/components/ui/card.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
;
const Card = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-[1.25rem] border border-border/80 bg-card/95 text-card-foreground shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
Card.displayName = "Card";
const CardHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex flex-col gap-1.5 p-5", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 22,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardHeader.displayName = "CardHeader";
const CardTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-base font-semibold tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 30,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardTitle.displayName = "CardTitle";
const CardDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 38,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardDescription.displayName = "CardDescription";
const CardContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("px-5 pb-5", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 46,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardContent.displayName = "CardContent";
const CardFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex items-center p-5 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/card.tsx",
        lineNumber: 54,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
CardFooter.displayName = "CardFooter";
;
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$commands$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/commands.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$chat$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/chat-store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/auth-provider.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-composer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/message-list.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$streaming$2d$status$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/streaming-status.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/card.tsx [app-ssr] (ecmascript)");
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
    const statusLabel = thread?.statusLabel ?? null;
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
            const { request_id } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sendMessage"])(auth.token, activeSessionId, text);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["streamSessionEvents"])(auth.token, activeSessionId, request_id, (event)=>{
                const responseText = event.data.response?.text;
                const nextLabel = mapRuntimeLabel(event.data.runtime_event?.label, event.data.runtime_event?.event_type);
                if (nextLabel) {
                    setStatusLabel(activeThreadKey, nextLabel);
                }
                if (typeof responseText === "string") {
                    updateMessage(activeThreadKey, assistantId, (current)=>({
                            ...current,
                            content: [
                                {
                                    type: "text",
                                    text: mergeResponseText(current, responseText)
                                }
                            ]
                        }));
                }
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
    const threadTitle = matchingSession?.label || (sessionId ? "Analysis session" : "New analysis");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$legacy$2d$runtime$2f$AssistantRuntimeProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AssistantRuntimeProvider"], {
        runtime: runtime,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "surface-panel flex h-full min-h-[calc(100vh-11rem)] flex-col overflow-hidden",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardHeader"], {
                    className: "border-b border-border/70 pb-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardTitle"], {
                                    children: threadTitle
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 268,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                    children: "Agent Mode"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 269,
                                    columnNumber: 13
                                }, this),
                                sessionId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardDescription"], {
                            children: [
                                "Use natural language for analysis. Type ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "flex min-h-0 flex-1 flex-col px-0 pb-0",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Root, {
                        className: "flex min-h-0 flex-1 flex-col",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].Viewport, {
                            className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3 pt-4 sm:px-6",
                            children: [
                                messages.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThreadWelcome, {}, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 284,
                                    columnNumber: 40
                                }, this) : null,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MessageList"], {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].ScrollToBottom, {
                                    className: "fixed bottom-28 right-6 z-20 hidden rounded-full border border-border/80 bg-white/90 px-3 py-2 text-xs shadow-sm md:block",
                                    children: "Jump to latest"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/chat-panel.tsx",
                                    lineNumber: 288,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$assistant$2d$ui$2f$react$2f$dist$2f$primitives$2f$thread$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ThreadPrimitive$3e$__["ThreadPrimitive"].ViewportFooter, {
                                    className: "sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background/95 to-background/0 pt-6",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mx-auto w-full max-w-4xl space-y-3 pb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$streaming$2d$status$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StreamingStatus"], {
                                                isRunning: isRunning,
                                                label: statusLabel
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/chat/chat-panel.tsx",
                                                lineNumber: 293,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$message$2d$composer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MessageComposer"], {}, void 0, false, {
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
function ThreadWelcome() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-12 pt-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                variant: "secondary",
                children: "Crew Beta"
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 308,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-4 text-3xl font-semibold sm:text-4xl",
                children: "Ask a grounded business question."
            }, void 0, false, {
                fileName: "[project]/src/components/chat/chat-panel.tsx",
                lineNumber: 309,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base",
                children: [
                    "Crew combines conversational analysis with deterministic command surfaces for metrics, experiments, and team artifacts. Start with a question or type ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-8 grid w-full gap-3 text-left sm:grid-cols-2",
                children: [
                    "What changed in activation over the last 4 weeks?",
                    "Show me the latest signup checkout experiment takeaways.",
                    "Turn this analysis into a short launch readout.",
                    "/artifacts search launch readiness"
                ].map((prompt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
function mergeResponseText(message, incoming) {
    const current = Array.isArray(message.content) && message.content[0]?.type === "text" ? message.content[0].text : "";
    if (!current) return incoming;
    if (incoming.startsWith(current)) return incoming;
    if (current.startsWith(incoming)) return current;
    return `${current}${incoming}`;
}
function mapRuntimeLabel(label, eventType) {
    const source = `${label ?? ""} ${eventType ?? ""}`.toLowerCase();
    if (source.includes("metric")) return "Checking metrics";
    if (source.includes("experiment")) return "Reviewing experiments";
    if (source.includes("artifact")) return "Searching artifacts";
    if (source.includes("draft") || source.includes("response")) return "Drafting answer";
    return label ?? null;
}
}),
];

//# sourceMappingURL=src_98f4a735._.js.map