const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_STORAGE_PATH = path.join(__dirname, '../../storage/evidence');
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf']
};

/**
 * Ensures the target evidence storage directory exists.
 */
async function ensureStorageDir(dirPath = DEFAULT_STORAGE_PATH) {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return dirPath;
}

/**
 * Validates metadata and raw buffer against size and MIME constraints.
 */
function validateEvidenceFile({ buffer, mimeType, fileName }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Invalid evidence data: buffer is required');
    }

    if (buffer.length === 0) {
        throw new Error('Evidence file cannot be empty (0 bytes)');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 5 MB`);
    }

    const normalizedMime = (mimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES[normalizedMime]) {
        throw new Error(`Unsupported MIME type "${mimeType}". Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`);
    }

    // Magic number verification for image headers
    if (normalizedMime === 'image/jpeg') {
        if (buffer.length < 3 || buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
            throw new Error('File contents do not match JPEG format header');
        }
    } else if (normalizedMime === 'image/png') {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < pngHeader.length; i++) {
            if (buffer[i] !== pngHeader[i]) {
                throw new Error('File contents do not match PNG format header');
            }
        }
    } else if (normalizedMime === 'application/pdf') {
        const header = buffer.slice(0, 5).toString('ascii');
        if (!header.startsWith('%PDF-')) {
            throw new Error('File contents do not match PDF format header');
        }
    }

    return {
        normalizedMime,
        sizeBytes: buffer.length
    };
}

/**
 * Stores an evidence buffer to the local secure storage directory and returns metadata.
 */
async function saveEvidence({ buffer, mimeType, originalFileName, storageDir = DEFAULT_STORAGE_PATH }) {
    const { normalizedMime, sizeBytes } = validateEvidenceFile({ buffer, mimeType, fileName: originalFileName });
    await ensureStorageDir(storageDir);

    const evidenceId = `EVD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const primaryExt = ALLOWED_MIME_TYPES[normalizedMime][0];
    const safeDiskFileName = `${evidenceId}${primaryExt}`;
    const absoluteFilePath = path.join(storageDir, safeDiskFileName);

    await fs.promises.writeFile(absoluteFilePath, buffer, { flag: 'wx' });

    return {
        evidenceId,
        fileName: originalFileName || safeDiskFileName,
        diskFileName: safeDiskFileName,
        filePath: absoluteFilePath,
        mimeType: normalizedMime,
        sizeBytes,
        verificationStatus: 'driver_reported'
    };
}

/**
 * Checks whether an evidence file exists on disk.
 */
async function evidenceExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Creates a readable stream for authorized file delivery.
 */
function createEvidenceReadStream(filePath) {
    return fs.createReadStream(filePath);
}

/**
 * Removes an evidence file from disk.
 */
async function removeEvidenceFile(filePath) {
    try {
        await fs.promises.unlink(filePath);
    } catch (_) {
        // Ignored if file does not exist
    }
}

module.exports = {
    DEFAULT_STORAGE_PATH,
    MAX_FILE_SIZE_BYTES,
    ALLOWED_MIME_TYPES,
    validateEvidenceFile,
    saveEvidence,
    evidenceExists,
    createEvidenceReadStream,
    removeEvidenceFile
};
