// utils/totp.js
// Minimal RFC 4226 (HOTP) / RFC 6238 (TOTP) implementation using only Node's
// built-in `crypto` module — no external dependency needed (npm install was
// not possible in this environment, and this keeps the app dependency-free).

const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30; // standard TOTP time-step
const CODE_DIGITS = 6;

// Generates a random Base32 secret (used when a user enables 2FA)
function generateSecret(byteLength = 20) {
    const buffer = crypto.randomBytes(byteLength);
    return base32Encode(buffer);
}

function base32Encode(buffer) {
    let bits = '';
    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, '0');
    }
    let output = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        output += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
    return output;
}

function base32Decode(base32) {
    const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of clean) {
        const val = BASE32_ALPHABET.indexOf(char);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

// Generates a 6-digit HOTP code for a given counter value
function hotp(secretBase32, counter) {
    const key = base32Decode(secretBase32);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binCode =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const code = (binCode % 10 ** CODE_DIGITS).toString().padStart(CODE_DIGITS, '0');
    return code;
}

function totp(secretBase32, forTime = Date.now()) {
    const counter = Math.floor(forTime / 1000 / STEP_SECONDS);
    return hotp(secretBase32, counter);
}

// Verifies a user-entered code, allowing a small window (+/- 1 step, i.e. ~30s
// of clock drift) so the code doesn't feel flaky for the user.
function verifyToken(secretBase32, token, window = 1) {
    if (!token || !/^\d{6}$/.test(token.trim())) return false;
    const clean = token.trim();
    const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);

    for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
        if (hotp(secretBase32, counter + errorWindow) === clean) {
            return true;
        }
    }
    return false;
}

// Builds an otpauth:// URI that authenticator apps (Google Authenticator,
// Authy, etc.) understand, and a QR-code image URL rendering it.
function buildOtpAuthUrl(secretBase32, accountLabel, issuer) {
    const encodedLabel = encodeURIComponent(`${issuer}:${accountLabel}`);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedLabel}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${CODE_DIGITS}&period=${STEP_SECONDS}`;
}

function buildQrCodeUrl(otpAuthUrl) {
    // Uses a public QR rendering endpoint so we don't need an extra npm package.
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUrl)}`;
}

module.exports = {
    generateSecret,
    totp,
    verifyToken,
    buildOtpAuthUrl,
    buildQrCodeUrl
};
