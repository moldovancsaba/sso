import { KeyManager } from './keys';
export class TokenService {
    constructor() {
        this.keyManager = KeyManager.getInstance();
    }
    async createIdToken(user, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            // Required claims
            iss: process.env.OIDC_ISSUER || 'https://auth.yourdomain.com',
            sub: user.id,
            aud: options.audience,
            exp: now + 3600, // 1 hour
            iat: now,
            // Authentication claims
            auth_time: options.authTime,
            nonce: options.nonce,
            // Optional authentication context claims
            acr: options.acr,
            amr: options.amr,
            azp: options.azp,
            // User claims
            name: (_a = user.profile) === null || _a === void 0 ? void 0 : _a.name,
            given_name: (_b = user.profile) === null || _b === void 0 ? void 0 : _b.givenName,
            family_name: (_c = user.profile) === null || _c === void 0 ? void 0 : _c.familyName,
            middle_name: (_d = user.profile) === null || _d === void 0 ? void 0 : _d.middleName,
            nickname: (_e = user.profile) === null || _e === void 0 ? void 0 : _e.nickname,
            preferred_username: (_f = user.profile) === null || _f === void 0 ? void 0 : _f.preferredUsername,
            profile: (_g = user.profile) === null || _g === void 0 ? void 0 : _g.website,
            picture: (_h = user.profile) === null || _h === void 0 ? void 0 : _h.picture,
            website: (_j = user.profile) === null || _j === void 0 ? void 0 : _j.website,
            gender: (_k = user.profile) === null || _k === void 0 ? void 0 : _k.gender,
            birthdate: (_l = user.profile) === null || _l === void 0 ? void 0 : _l.birthdate,
            zoneinfo: (_m = user.profile) === null || _m === void 0 ? void 0 : _m.zoneinfo,
            locale: (_o = user.profile) === null || _o === void 0 ? void 0 : _o.locale,
            updated_at: Math.floor(new Date(user.updatedAt).getTime() / 1000),
            // Email claims
            email: user.email,
            email_verified: user.emailVerified,
            // Phone claims
            phone_number: (_p = user.profile) === null || _p === void 0 ? void 0 : _p.phoneNumber,
            phone_number_verified: (_q = user.profile) === null || _q === void 0 ? void 0 : _q.phoneNumberVerified,
            // Address claims
            address: ((_r = user.profile) === null || _r === void 0 ? void 0 : _r.address) ? {
                formatted: user.profile.address.formatted,
                street_address: user.profile.address.streetAddress,
                locality: user.profile.address.locality,
                region: user.profile.address.region,
                postal_code: user.profile.address.postalCode,
                country: user.profile.address.country,
            } : undefined,
        };
        return this.keyManager.sign(payload, { expiresIn: 3600 });
    }
    async verifyIdToken(token, options) {
        const payload = await this.keyManager.verify(token);
        // Verify required claims
        if (typeof payload !== 'object' ||
            !payload.iss ||
            !payload.sub ||
            !payload.aud ||
            !payload.exp ||
            !payload.iat) {
            throw new Error('Missing required claims');
        }
        // Verify issuer
        if (payload.iss !== (process.env.OIDC_ISSUER || 'https://auth.yourdomain.com')) {
            throw new Error('Invalid issuer');
        }
        // Verify audience
        if (typeof payload.aud === 'string'
            ? payload.aud !== options.audience
            : !payload.aud.includes(options.audience)) {
            throw new Error('Invalid audience');
        }
        // Verify nonce if provided
        if (options.nonce && payload.nonce !== options.nonce) {
            throw new Error('Invalid nonce');
        }
        return payload;
    }
}
//# sourceMappingURL=token.js.map