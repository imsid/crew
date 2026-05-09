(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compileMetric",
    ()=>compileMetric,
    "createSession",
    ()=>createSession,
    "getArtifact",
    ()=>getArtifact,
    "getExperiment",
    ()=>getExperiment,
    "getExperimentPlan",
    ()=>getExperimentPlan,
    "getMe",
    ()=>getMe,
    "getMetric",
    ()=>getMetric,
    "getSession",
    ()=>getSession,
    "getSessionHistory",
    ()=>getSessionHistory,
    "getSkill",
    ()=>getSkill,
    "listArtifacts",
    ()=>listArtifacts,
    "listExperiments",
    ()=>listExperiments,
    "listMetrics",
    ()=>listMetrics,
    "listSessions",
    ()=>listSessions,
    "listSkills",
    ()=>listSkills,
    "loginWithHandle",
    ()=>loginWithHandle,
    "runCommand",
    ()=>runCommand,
    "searchArtifacts",
    ()=>searchArtifacts,
    "searchSessions",
    ()=>searchSessions,
    "searchSkills",
    ()=>searchSkills,
    "sendMessage",
    ()=>sendMessage,
    "streamSessionEvents",
    ()=>streamSessionEvents
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@swc/helpers/esm/_define_property.js [app-client] (ecmascript)");
;
var _process_env_NEXT_PUBLIC_CREW_API_BASE_URL;
const API_BASE_URL = (_process_env_NEXT_PUBLIC_CREW_API_BASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:8000")) === null || _process_env_NEXT_PUBLIC_CREW_API_BASE_URL === void 0 ? void 0 : _process_env_NEXT_PUBLIC_CREW_API_BASE_URL.replace(/\/$/, "");
class CrewApiError extends Error {
    constructor(message, status, code){
        super(message), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "status", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "code", void 0), this.status = status, this.code = code;
    }
}
function absoluteUrl(path) {
    if (!API_BASE_URL) {
        throw new CrewApiError("Missing NEXT_PUBLIC_CREW_API_BASE_URL. Set it to your Crew Beta backend origin, for example http://127.0.0.1:8000.");
    }
    return "".concat(API_BASE_URL).concat(path);
}
async function apiRequest(path) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var _options_method;
    const response = await fetch(absoluteUrl(path), {
        method: (_options_method = options.method) !== null && _options_method !== void 0 ? _options_method : "GET",
        headers: {
            ...options.body ? {
                "Content-Type": "application/json"
            } : {},
            ...options.token ? {
                Authorization: "Bearer ".concat(options.token)
            } : {}
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal
    });
    const payload = await response.json();
    if (!response.ok) {
        var _payload_error, _payload_error1;
        throw new CrewApiError(((_payload_error = payload.error) === null || _payload_error === void 0 ? void 0 : _payload_error.message) || "Request failed", response.status, (_payload_error1 = payload.error) === null || _payload_error1 === void 0 ? void 0 : _payload_error1.code);
    }
    return payload.data;
}
async function loginWithHandle(handle) {
    const response = await fetch(absoluteUrl("/login/handle"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: handle
        })
    });
    const payload = await response.json();
    if (!response.ok) {
        var _payload_error, _payload_error1;
        throw new CrewApiError(((_payload_error = payload.error) === null || _payload_error === void 0 ? void 0 : _payload_error.message) || "Login failed", response.status, (_payload_error1 = payload.error) === null || _payload_error1 === void 0 ? void 0 : _payload_error1.code);
    }
    return payload.data;
}
async function getMe(token) {
    return apiRequest("/me", {
        token
    });
}
async function listSessions(token) {
    return apiRequest("/sessions", {
        token
    });
}
async function createSession(token, label) {
    return apiRequest("/sessions", {
        method: "POST",
        token,
        body: {
            label: label || null
        }
    });
}
async function searchSessions(token, query) {
    return apiRequest("/sessions/search?q=".concat(encodeURIComponent(query)), {
        token
    });
}
async function getSession(token, sessionId) {
    return apiRequest("/sessions/".concat(sessionId), {
        token
    });
}
async function getSessionHistory(token, sessionId) {
    return apiRequest("/sessions/".concat(sessionId, "/history"), {
        token
    });
}
async function sendMessage(token, sessionId, message) {
    return apiRequest("/sessions/".concat(sessionId, "/messages"), {
        method: "POST",
        token,
        body: {
            message
        }
    });
}
async function streamSessionEvents(token, sessionId, requestId, onEvent, signal) {
    const response = await fetch(absoluteUrl("/sessions/".concat(sessionId, "/requests/").concat(requestId, "/events")), {
        method: "GET",
        headers: {
            Authorization: "Bearer ".concat(token)
        },
        signal
    });
    if (!response.ok || !response.body) {
        throw new CrewApiError("Failed to open event stream", response.status);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while(true){
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
            stream: true
        });
        const chunks = buffer.split("\n\n");
        var _chunks_pop;
        buffer = (_chunks_pop = chunks.pop()) !== null && _chunks_pop !== void 0 ? _chunks_pop : "";
        for (const chunk of chunks){
            const lines = chunk.split("\n");
            let eventName = "message";
            const dataLines = [];
            for (const line of lines){
                if (line.startsWith("event:")) {
                    eventName = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                    dataLines.push(line.slice(5).trim());
                }
            }
            if (!dataLines.length) continue;
            onEvent({
                event: eventName,
                data: JSON.parse(dataLines.join("\n"))
            });
        }
    }
}
async function runCommand(token, payload) {
    const response = await fetch(absoluteUrl("/command"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer ".concat(token)
        },
        body: JSON.stringify(payload)
    });
    const commandPayload = await response.json();
    if (!response.ok) {
        var _commandPayload_error, _commandPayload_error1;
        throw new CrewApiError(((_commandPayload_error = commandPayload.error) === null || _commandPayload_error === void 0 ? void 0 : _commandPayload_error.message) || "Command failed", response.status, (_commandPayload_error1 = commandPayload.error) === null || _commandPayload_error1 === void 0 ? void 0 : _commandPayload_error1.code);
    }
    return commandPayload;
}
async function listMetrics(token) {
    const response = await runCommand(token, {
        surface: "metrics",
        operation: "list",
        args: {}
    });
    return response.data;
}
async function getMetric(token, name) {
    let kind = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "metric";
    const response = await runCommand(token, {
        surface: "metrics",
        operation: "show",
        args: {
            kind,
            name
        }
    });
    return response.data;
}
async function compileMetric(token, metricName) {
    let dimensions = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : [];
    const response = await runCommand(token, {
        surface: "metrics",
        operation: "compile",
        args: {
            metric_names: [
                metricName
            ],
            dimensions
        }
    });
    return response.data;
}
async function listExperiments(token) {
    const response = await runCommand(token, {
        surface: "experiments",
        operation: "list",
        args: {}
    });
    return response.data;
}
async function getExperiment(token, name) {
    const response = await runCommand(token, {
        surface: "experiments",
        operation: "show",
        args: {
            name
        }
    });
    return response.data;
}
async function getExperimentPlan(token, name) {
    const response = await runCommand(token, {
        surface: "experiments",
        operation: "plan",
        args: {
            name
        }
    });
    return response.data;
}
async function listArtifacts(token) {
    const response = await runCommand(token, {
        surface: "artifacts",
        operation: "list",
        args: {}
    });
    return response.data;
}
async function searchArtifacts(token, query) {
    const response = await runCommand(token, {
        surface: "artifacts",
        operation: "search",
        args: {
            query,
            limit: 10
        }
    });
    return response.data;
}
async function getArtifact(token, artifactId) {
    const response = await runCommand(token, {
        surface: "artifacts",
        operation: "show",
        args: {
            artifact_id: artifactId
        }
    });
    return response.data;
}
async function listSkills(token) {
    const response = await runCommand(token, {
        surface: "skills",
        operation: "list",
        args: {}
    });
    return response.data;
}
async function searchSkills(token, query) {
    const response = await runCommand(token, {
        surface: "skills",
        operation: "search",
        args: {
            query,
            limit: 10
        }
    });
    return response.data;
}
async function getSkill(token, skillId) {
    const response = await runCommand(token, {
        surface: "skills",
        operation: "show",
        args: {
            skill_id: skillId
        }
    });
    return response.data;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/providers/auth-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "RequireAuth",
    ()=>RequireAuth,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
"use client";
;
;
;
const STORAGE_KEY = "crew-beta-auth";
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider(param) {
    let { children } = param;
    _s();
    const [auth, setAuth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isReady, setIsReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const restoreStartedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            if (restoreStartedRef.current) return;
            restoreStartedRef.current = true;
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setIsReady(true);
                return;
            }
            const parsed = JSON.parse(raw);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMe"])(parsed.token).then({
                "AuthProvider.useEffect": (param)=>{
                    let { user } = param;
                    setAuth({
                        ...parsed,
                        user
                    });
                }
            }["AuthProvider.useEffect"]).catch({
                "AuthProvider.useEffect": ()=>{
                    window.localStorage.removeItem(STORAGE_KEY);
                    setAuth(null);
                }
            }["AuthProvider.useEffect"]).finally({
                "AuthProvider.useEffect": ()=>setIsReady(true)
            }["AuthProvider.useEffect"]);
        }
    }["AuthProvider.useEffect"], []);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "AuthProvider.useMemo[value]": ()=>({
                auth,
                isReady,
                login: ({
                    "AuthProvider.useMemo[value]": async (handle)=>{
                        const nextAuth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loginWithHandle"])(handle);
                        setAuth(nextAuth);
                        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
                        return nextAuth;
                    }
                })["AuthProvider.useMemo[value]"],
                logout: ({
                    "AuthProvider.useMemo[value]": ()=>{
                        setAuth(null);
                        window.localStorage.removeItem(STORAGE_KEY);
                    }
                })["AuthProvider.useMemo[value]"],
                refresh: ({
                    "AuthProvider.useMemo[value]": async ()=>{
                        if (!auth) return;
                        const { user } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMe"])(auth.token);
                        const nextAuth = {
                            ...auth,
                            user
                        };
                        setAuth(nextAuth);
                        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
                    }
                })["AuthProvider.useMemo[value]"]
            })
    }["AuthProvider.useMemo[value]"], [
        auth,
        isReady
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/providers/auth-provider.tsx",
        lineNumber: 79,
        columnNumber: 10
    }, this);
}
_s(AuthProvider, "m9HwOfgWf5Jyd9AfdSA6wszBfUQ=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
function RequireAuth(param) {
    let { children } = param;
    _s2();
    const { auth, isReady } = useAuth();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RequireAuth.useEffect": ()=>{
            if (!isReady) return;
            if (!auth && pathname !== "/login") {
                router.replace("/login");
            }
        }
    }["RequireAuth.useEffect"], [
        auth,
        isReady,
        pathname,
        router
    ]);
    if (!isReady || !auth && pathname !== "/login") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-screen items-center justify-center px-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "surface-panel flex w-full max-w-md flex-col gap-3 p-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-medium text-muted-foreground",
                        children: "Crew Beta"
                    }, void 0, false, {
                        fileName: "[project]/src/providers/auth-provider.tsx",
                        lineNumber: 106,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-semibold",
                        children: "Loading workspace"
                    }, void 0, false, {
                        fileName: "[project]/src/providers/auth-provider.tsx",
                        lineNumber: 107,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Restoring your session and connecting the beta workspace."
                    }, void 0, false, {
                        fileName: "[project]/src/providers/auth-provider.tsx",
                        lineNumber: 108,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/providers/auth-provider.tsx",
                lineNumber: 105,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/providers/auth-provider.tsx",
            lineNumber: 104,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
_s2(RequireAuth, "J/P3DYqhkB4maBVse53miXRMufA=", false, function() {
    return [
        useAuth,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c1 = RequireAuth;
var _c, _c1;
__turbopack_context__.k.register(_c, "AuthProvider");
__turbopack_context__.k.register(_c1, "RequireAuth");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/providers/query-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryProvider",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function QueryProvider(param) {
    let { children } = param;
    _s();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        refetchOnWindowFocus: false
                    }
                }
            })
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/providers/query-provider.tsx",
        lineNumber: 21,
        columnNumber: 10
    }, this);
}
_s(QueryProvider, "wrn8BaqO52CTs6o1yy9eCch1arQ=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/providers/app-providers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppProviders",
    ()=>AppProviders
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/auth-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$query$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/query-provider.tsx [app-client] (ecmascript)");
"use client";
;
;
;
function AppProviders(param) {
    let { children } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$query$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthProvider"], {
            children: children
        }, void 0, false, {
            fileName: "[project]/src/providers/app-providers.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/providers/app-providers.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = AppProviders;
var _c;
__turbopack_context__.k.register(_c, "AppProviders");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_520b10e7._.js.map