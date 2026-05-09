module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
const API_BASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:8000")?.replace(/\/$/, "");
class CrewApiError extends Error {
    status;
    code;
    constructor(message, status, code){
        super(message), this.status = status, this.code = code;
    }
}
function absoluteUrl(path) {
    if (!API_BASE_URL) {
        throw new CrewApiError("Missing NEXT_PUBLIC_CREW_API_BASE_URL. Set it to your Crew Beta backend origin, for example http://127.0.0.1:8000.");
    }
    return `${API_BASE_URL}${path}`;
}
async function apiRequest(path, options = {}) {
    const response = await fetch(absoluteUrl(path), {
        method: options.method ?? "GET",
        headers: {
            ...options.body ? {
                "Content-Type": "application/json"
            } : {},
            ...options.token ? {
                Authorization: `Bearer ${options.token}`
            } : {}
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new CrewApiError(payload.error?.message || "Request failed", response.status, payload.error?.code);
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
        throw new CrewApiError(payload.error?.message || "Login failed", response.status, payload.error?.code);
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
    return apiRequest(`/sessions/search?q=${encodeURIComponent(query)}`, {
        token
    });
}
async function getSession(token, sessionId) {
    return apiRequest(`/sessions/${sessionId}`, {
        token
    });
}
async function getSessionHistory(token, sessionId) {
    return apiRequest(`/sessions/${sessionId}/history`, {
        token
    });
}
async function sendMessage(token, sessionId, message) {
    return apiRequest(`/sessions/${sessionId}/messages`, {
        method: "POST",
        token,
        body: {
            message
        }
    });
}
async function streamSessionEvents(token, sessionId, requestId, onEvent, signal) {
    const response = await fetch(absoluteUrl(`/sessions/${sessionId}/requests/${requestId}/events`), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
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
        buffer = chunks.pop() ?? "";
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
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    const commandPayload = await response.json();
    if (!response.ok) {
        throw new CrewApiError(commandPayload.error?.message || "Command failed", response.status, commandPayload.error?.code);
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
async function getMetric(token, name, kind = "metric") {
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
async function compileMetric(token, metricName, dimensions = []) {
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
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/providers/auth-provider.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "RequireAuth",
    ()=>RequireAuth,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const STORAGE_KEY = "crew-beta-auth";
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider({ children }) {
    const [auth, setAuth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isReady, setIsReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const restoreStartedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (restoreStartedRef.current) return;
        restoreStartedRef.current = true;
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            setIsReady(true);
            return;
        }
        const parsed = JSON.parse(raw);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMe"])(parsed.token).then(({ user })=>{
            setAuth({
                ...parsed,
                user
            });
        }).catch(()=>{
            window.localStorage.removeItem(STORAGE_KEY);
            setAuth(null);
        }).finally(()=>setIsReady(true));
    }, []);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            auth,
            isReady,
            login: async (handle)=>{
                const nextAuth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loginWithHandle"])(handle);
                setAuth(nextAuth);
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
                return nextAuth;
            },
            logout: ()=>{
                setAuth(null);
                window.localStorage.removeItem(STORAGE_KEY);
            },
            refresh: async ()=>{
                if (!auth) return;
                const { user } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMe"])(auth.token);
                const nextAuth = {
                    ...auth,
                    user
                };
                setAuth(nextAuth);
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
            }
        }), [
        auth,
        isReady
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/providers/auth-provider.tsx",
        lineNumber: 79,
        columnNumber: 10
    }, this);
}
function useAuth() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
function RequireAuth({ children }) {
    const { auth, isReady } = useAuth();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isReady) return;
        if (!auth && pathname !== "/login") {
            router.replace("/login");
        }
    }, [
        auth,
        isReady,
        pathname,
        router
    ]);
    if (!isReady || !auth && pathname !== "/login") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-screen items-center justify-center px-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "surface-panel flex w-full max-w-md flex-col gap-3 p-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-medium text-muted-foreground",
                        children: "Crew Beta"
                    }, void 0, false, {
                        fileName: "[project]/src/providers/auth-provider.tsx",
                        lineNumber: 106,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-semibold",
                        children: "Loading workspace"
                    }, void 0, false, {
                        fileName: "[project]/src/providers/auth-provider.tsx",
                        lineNumber: 107,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
}),
"[project]/src/providers/query-provider.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryProvider",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
;
function QueryProvider({ children }) {
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClient"]({
            defaultOptions: {
                queries: {
                    staleTime: 30_000,
                    refetchOnWindowFocus: false
                }
            }
        }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/providers/query-provider.tsx",
        lineNumber: 21,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/providers/app-providers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppProviders",
    ()=>AppProviders
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/auth-provider.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$query$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/providers/query-provider.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
function AppProviders({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$query$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$providers$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthProvider"], {
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
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/dynamic-access-async-storage.external.js [external] (next/dist/server/app-render/dynamic-access-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/dynamic-access-async-storage.external.js", () => require("next/dist/server/app-render/dynamic-access-async-storage.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__379ad5f7._.js.map