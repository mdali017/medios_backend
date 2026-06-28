"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabaseAnon = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
exports.supabaseAnon = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
exports.supabaseAdmin = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
//# sourceMappingURL=supabase.js.map