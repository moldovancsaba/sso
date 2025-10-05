"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  getSsoLoginUrl: () => getSsoLoginUrl,
  getSsoLogoutUrl: () => getSsoLogoutUrl,
  validateSsoSession: () => validateSsoSession
});
module.exports = __toCommonJS(index_exports);
async function validateSsoSession(req, options = {}) {
  try {
    const ssoServerUrl = options.ssoServerUrl || process.env.SSO_SERVER_URL;
    if (!ssoServerUrl) {
      console.error("[sso-client] SSO_SERVER_URL not configured");
      return { isValid: false, message: "SSO_SERVER_URL not configured" };
    }
    const cookieHeader = options.cookieHeader || req?.headers?.cookie || "";
    const publicUrl = `${ssoServerUrl}/api/public/validate`;
    let resp;
    try {
      resp = await fetch(publicUrl, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
          "user-agent": options.userAgent || req?.headers?.["user-agent"] || "sso-client"
        },
        // @ts-ignore - cache option is valid but TS doesn't recognize it in all environments
        cache: "no-store"
      });
    } catch (fetchErr) {
      console.error("[sso-client] Failed to fetch from SSO:", fetchErr.message);
      return { isValid: false, message: "Failed to connect to SSO service" };
    }
    let data;
    try {
      data = await resp.json();
    } catch (jsonErr) {
      console.error("[sso-client] Failed to parse SSO response:", jsonErr.message);
      return { isValid: false, message: "Invalid SSO response" };
    }
    if (!data?.isValid) {
      const adminUrl = `${ssoServerUrl}/api/sso/validate`;
      try {
        resp = await fetch(adminUrl, {
          method: "GET",
          headers: {
            cookie: cookieHeader,
            accept: "application/json",
            "user-agent": options.userAgent || req?.headers?.["user-agent"] || "sso-client"
          },
          // @ts-ignore - cache option is valid but TS doesn't recognize it in all environments
          cache: "no-store"
        });
        data = await resp.json();
      } catch (adminErr) {
        console.error("[sso-client] Failed to fetch from admin SSO:", adminErr.message);
        return { isValid: false, message: "Failed to validate admin session" };
      }
    }
    if (data?.isValid && data?.user?.id) {
      return {
        isValid: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role || "user",
          status: data.user.status || "active"
        }
      };
    }
    return {
      isValid: false,
      message: data?.message || "Invalid or expired session"
    };
  } catch (err) {
    console.error("[sso-client] SSO validation error:", err.message);
    return {
      isValid: false,
      message: "Unexpected error during validation"
    };
  }
}
function getSsoLoginUrl(returnUrl, ssoServerUrl) {
  const ssoUrl = ssoServerUrl || process.env.SSO_SERVER_URL || "https://sso.doneisbetter.com";
  return `${ssoUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
}
function getSsoLogoutUrl(ssoServerUrl) {
  const ssoUrl = ssoServerUrl || process.env.SSO_SERVER_URL || "https://sso.doneisbetter.com";
  return `${ssoUrl}/api/public/logout`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSsoLoginUrl,
  getSsoLogoutUrl,
  validateSsoSession
});
