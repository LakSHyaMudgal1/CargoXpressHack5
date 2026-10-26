const crypto = require('crypto');

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Hashes a plaintext OTP code with a salt using SHA-256.
 */
function hashOtp(otpCode, salt) {
    return crypto.createHash('sha256').update(String(otpCode).trim() + salt).digest('hex');
}

/**
 * Generates a cryptographically random 6-digit numeric OTP and its salted hash.
 * The plaintext OTP is returned once for immediate transmission (e.g. SMS) and
 * must NOT be saved in the database.
 */
function generateOtp({ ttlMs = OTP_TTL_MS, maxAttempts = MAX_VERIFICATION_ATTEMPTS } = {}) {
    // Generate secure 6-digit number between 100000 and 999999
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedOtp = hashOtp(otp, salt);
    const expiresAt = new Date(Date.now() + ttlMs);

    return {
        otp, // Plaintext for dispatch only
        hashedOtp, // Store this in MongoDB
        salt, // Store this in MongoDB
        expiresAt,
        attemptCount: 0,
        maxAttempts,
        isVerified: false
    };
}

/**
 * Verifies a candidate OTP against a stored otpVerification state.
 * Mutates attemptCount and isVerified on the state object.
 */
function verifyOtp(candidateOtp, otpRecord) {
    if (!otpRecord || !otpRecord.hashedOtp || !otpRecord.salt) {
        return {
            success: false,
            reason: 'NO_OTP_CONFIGURED',
            message: 'No active OTP verification has been initiated for this delivery stop.'
        };
    }

    if (otpRecord.isVerified) {
        return {
            success: true,
            alreadyVerified: true,
            message: 'Recipient OTP has already been successfully verified.'
        };
    }

    const now = Date.now();
    const expiresAtMs = new Date(otpRecord.expiresAt).getTime();
    if (now > expiresAtMs) {
        return {
            success: false,
            reason: 'EXPIRED',
            message: 'The OTP code has expired. Please request a new verification code.'
        };
    }

    if (otpRecord.attemptCount >= otpRecord.maxAttempts) {
        return {
            success: false,
            reason: 'MAX_ATTEMPTS_EXCEEDED',
            message: `Maximum verification attempts (${otpRecord.maxAttempts}) exceeded. Verification is locked.`
        };
    }

    // Increment attempt count
    otpRecord.attemptCount = (otpRecord.attemptCount || 0) + 1;

    const candidateClean = String(candidateOtp || '').trim();
    if (!candidateClean || candidateClean.length < 4 || candidateClean.length > 8) {
        const remaining = otpRecord.maxAttempts - otpRecord.attemptCount;
        return {
            success: false,
            reason: 'INVALID_FORMAT',
            attemptsRemaining: remaining,
            message: `Invalid OTP format. ${remaining} attempt(s) remaining.`
        };
    }

    const candidateHash = hashOtp(candidateClean, otpRecord.salt);
    const expectedBuf = Buffer.from(otpRecord.hashedOtp, 'hex');
    const candidateBuf = Buffer.from(candidateHash, 'hex');

    const isMatch = expectedBuf.length === candidateBuf.length && crypto.timingSafeEqual(expectedBuf, candidateBuf);

    if (!isMatch) {
        const remaining = otpRecord.maxAttempts - otpRecord.attemptCount;
        return {
            success: false,
            reason: 'INVALID_CODE',
            attemptsRemaining: remaining,
            message: remaining > 0
                ? `Incorrect OTP code. ${remaining} attempt(s) remaining.`
                : `Incorrect OTP code. Maximum verification attempts (${otpRecord.maxAttempts}) exceeded. Verification locked.`
        };
    }

    // Mark as verified
    otpRecord.isVerified = true;
    otpRecord.verifiedAt = new Date();

    return {
        success: true,
        message: 'Recipient OTP verified successfully.'
    };
}

module.exports = {
    OTP_TTL_MS,
    MAX_VERIFICATION_ATTEMPTS,
    hashOtp,
    generateOtp,
    verifyOtp
};
