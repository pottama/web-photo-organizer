const fs = require('fs');
const path = require("path");
const { exiftool } = require("exiftool-vendored");

/**
 * 日付フォーマット変換
 * @param String dateString
 * @returns String
 */
function formatDate(dateString) {
    const [datePart, timePart] = dateString.split(' ');
    const formattedDatePart = datePart.replace(/:/g, '-');
    return `${formattedDatePart} ${timePart}`;
}

/**
 * フォルダ名の無効な文字を除外
 * @param String name
 * @returns String
 */
function sanitizeFolderName(name) {
    // フォルダ名に使用できない文字を除外する
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
}

/**
 * ファイルからメタデータ取得
 * @param String filePath
 * @returns Object
 */
async function getMetadataByFile(filePath) {
    try {
        const stats = await fs.promises.stat(filePath);
        const creationDate = stats.birthtime;
        const japanTime = new Date(creationDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

        console.log(`filePath: ${filePath}`);

        return {
            cameraModel: 'Unknown',
            dateTaken: japanTime,
            path: filePath,
            ext: path.extname(filePath),
        };
    } catch (err) {
        throw err;
    }
}

/**
 * ExifToolからメタデータ取得
 * @param String filePath
 * @returns Object
 */
async function getMetadataByExif(filePath) {
    try {
        const metadata = await exiftool.read(filePath);

        if (metadata && metadata.DateTimeOriginal != undefined) {
            const dateTaken = formatDate(metadata.DateTimeOriginal.toDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
            const chkDate = new Date(dateTaken);

            if (isNaN(chkDate.getDate())) {
                console.error('Error reading dateTaken isNaN');
                return {
                    path: filePath,
                    error: "Error reading dateTaken isNaN"
                };
            }

            console.log(`filePath: ${filePath}`);

            return {
                dateTaken: dateTaken,
                cameraModel: sanitizeFolderName(metadata.Model),
                path: metadata.SourceFile,
                ext: path.extname(metadata.SourceFile)
            };
        } else {
            return getMetadataByFile(filePath);
        }
    } catch (error) {
        console.error(`Error reading metadata for file ${filePath}:`, error);
        return {
            path: filePath,
            error: "Failed to read metadata"
        };
    }
}

module.exports = { getMetadataByFile, getMetadataByExif };