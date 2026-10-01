import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { storeAuthSession, getAccessToken, clearRejectedAuth } from "./auth.js";
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }; };
const token = (label, expires = Date.now() / 1000 + 3600) => `${label}.${btoa(JSON.stringify({ exp: expires }))}.signature`;
beforeEach(() => { globalThis.window = { sessionStorage: storage(), localStorage: storage(), dispatchEvent() {} }; });
test("ambiguous server 401 preserves a valid session", () => {
 const jwt = token("current"); storeAuthSession({ accessToken: jwt, id: 1 }, false);
 assert.equal(clearRejectedAuth(jwt, undefined), false); assert.equal(getAccessToken(), jwt);
});
test("explicit JWT rejection clears the matching session", () => {
 const jwt = token("current"); storeAuthSession({ accessToken: jwt, id: 1 }, true);
 assert.equal(clearRejectedAuth(jwt, "AUTHENTICATION_REQUIRED"), true); assert.equal(getAccessToken(), null);
});
test("late rejection cannot clear a newly logged-in session", () => {
 const old = token("old"), current = token("new"); storeAuthSession({ accessToken: current, id: 2 }, false);
 assert.equal(clearRejectedAuth(old, "AUTHENTICATION_REQUIRED"), false); assert.equal(getAccessToken(), current);
});
test("expired matching session is cleared even for a bodyless 401", () => {
 const jwt = token("expired", Date.now() / 1000 - 60); storeAuthSession({ accessToken: jwt, id: 1 }, false);
 assert.equal(clearRejectedAuth(jwt, undefined), true); assert.equal(getAccessToken(), null);
});
