const fs = require('fs');
const path = require('path');
const { getMetadataByExif, getMetadataByFile } = require('../utils/metadata');

let fileList = [];
let fileCount = 0;

const replacements = {
    '<YYYY>': (date, file, serialNumber) => date.getFullYear(),
    '<MM>': (date, file, serialNumber) => String(date.getMonth() + 1).padStart(2, '0'),
    '<DD>': (date, file, serialNumber) => String(date.getDate()).padStart(2, '0'),
    '<CM>': (date, file, serialNumber) => file.cameraModel ? file.cameraModel.replace(/[^a-zA-Z0-9-_]/g, '') : 'Unknown',
    '<HH>': (date, file, serialNumber) => String(date.getHours()).padStart(2, '0'),
    '<II>': (date, file, serialNumber) => String(date.getMinutes()).padStart(2, '0'),
    '<SS>': (date, file, serialNumber) => String(date.getSeconds()).padStart(2, '0'),
    '<SN2>': (date, file, serialNumber) => String(serialNumber).padStart(2, '0'),
    '<SN3>': (date, file, serialNumber) => String(serialNumber).padStart(3, '0'),
};

const regexReplacements = Object.keys(replacements).map(key => new RegExp(key, 'g'));

/**
 * 出力パス生成
 * @param String pattern
 * @param Object file
 * @returns String
 */
function generateOutputPath(pattern, file) {
    const date = new Date(file.dateTaken);

    // 最初と最後のスラッシュを削除し、全てのスペースを削除
    pattern = pattern.replace(/^\/|\/$/g, '').replace(/\s/g, '');

    let outputPath = pattern;
    for (const regex of regexReplacements) {
        outputPath = outputPath.replace(regex, replacements[regex.source](date, file));
    }

    return outputPath;
}

/**
 * 出力ファイル名生成
 * @param String pattern
 * @param Object file
 * @param Number serialNumber
 * @returns String
 */
function generateOutputFileName(pattern, file, serialNumber = 1) {
    const date = new Date(file.dateTaken);
    const ext = file.ext;

    // 最初と最後のスラッシュを削除し、全てのスペースを削除
    pattern = pattern.replace(/^\/|\/$/g, '').replace(/\s/g, '');

    let outputFileName = pattern;
    for (const regex of regexReplacements) {
        outputFileName = outputFileName.replace(regex, replacements[regex.source](date, file, serialNumber));
    }

    // 拡張子を追加
    outputFileName = outputFileName + ext;

    return outputFileName;
}

/**
 * 入力、出力パスを生成
 * @param Object file
 * @param String destinationFolder
 * @param String outputFolderPattern
 * @param String fileNamePattern
 * @returns Object
 */
function generateFilePaths(file, destinationFolder, outputFolderPattern, fileNamePattern) {
    const outputPath = generateOutputPath(outputFolderPattern, file);
    let fileName = path.basename(file.path);
    let targetPath = path.join(destinationFolder, outputPath, fileName);

    // ファイル名パターンが指定されている場合
    if (fileNamePattern !== null) {
        fileName = generateOutputFileName(fileNamePattern, file);
        targetPath = path.join(destinationFolder, outputPath, fileName);
        if (fileNamePattern.includes('<SN2>') || fileNamePattern.includes('<SN3>')) {
            let cnt = 1;
            const maxSerialNumber = fileNamePattern.includes('<SN2>') ? 99 : 999;
            while (fileList.some(f => f.newPath === targetPath) && cnt <= maxSerialNumber) {
                cnt++;
                fileName = generateOutputFileName(fileNamePattern, file, cnt);
                targetPath = path.join(destinationFolder, outputPath, fileName);
            }
            if (cnt > maxSerialNumber) {
                throw new Error(`Exceeded maximum serial number limit for pattern ${fileNamePattern}`);
            }
        }
    }

    return { originalPath: file.path, newPath: targetPath };
}

/**
 * フォルダ内のファイルを再帰的に取得
 * @param String folderPath
 * @param String destinationFolder
 * @param Boolean exifToolUse
 * @param String fileExtension
 * @returns Generator
 * @yields Object
 * @async
 */
async function* getFiles(folderPath, destinationFolder, exifToolUse, fileExtension) {
    const dir = await fs.promises.opendir(folderPath);
    // 拡張子を配列に変換
    const extensions = fileExtension ? fileExtension.split(',').map(ext => `.${ext.trim().toLowerCase()}`) : null;
    // 非同期処理タスクを格納する配列
    const tasks = [];

    for await (const dirent of dir) {
        const filePath = path.join(folderPath, dirent.name);

        // 移動先のフォルダを除外
        if (filePath.startsWith(destinationFolder)) {
            continue;
        }

        // ドットから始まるファイルとThumbs.dbファイルを無視
        if (dirent.name.startsWith('.') || dirent.name === 'Thumbs.db') {
            continue;
        }

        if (dirent.isDirectory()) {
            tasks.push(yield* getFiles(filePath, destinationFolder, exifToolUse, fileExtension));
        } else if (dirent.isFile() && (!extensions || extensions.includes(path.extname(dirent.name).toLowerCase()))) {
            if (exifToolUse) {
                tasks.push(await getMetadataByExif(filePath));
            } else {
                tasks.push(await getMetadataByFile(filePath));
            }
        }
    }

    const results = await Promise.all(tasks);
    for (const result of results) {
        if (result) {
            yield result;
        }
    }
}

/**
 * ファイル名の重複を避けるためにファイル名を変更
 * @param String filePath
 * @returns String
 * @async
 */
async function getUniqueFilePath(filePath) {
    let uniquePath = filePath;
    let counter = 1;

    while (fs.existsSync(uniquePath)) {
        const parsedPath = path.parse(filePath);
        uniquePath = path.join(parsedPath.dir, `${parsedPath.name}(${counter})${parsedPath.ext}`);
        counter++;
    }

    return uniquePath;
}

/**
 * 空のフォルダを削除
 * @param String folderPath
 * @param String originalSourceFolder
 * @param String destinationFolder
 * @returns void
 * @async
 */
async function removeEmptyFolders(folderPath, originalSourceFolder, destinationFolder) {
    if (folderPath.startsWith(destinationFolder)) {
        return;
    }

    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });

    if (files.length === 0) {
        // 移動元フォルダと移動先フォルダは削除しない
        if (folderPath === originalSourceFolder || folderPath === destinationFolder) {
            return;
        }
        await fs.promises.rmdir(folderPath);
    } else {
        for (const file of files) {
            const filePath = path.join(folderPath, file.name);

            // .DS_Store, Thumbs.dbファイルを削除
            if (file.name === '.DS_Store' || file.name === 'Thumbs.db') {
                await fs.promises.unlink(filePath);
                continue;
            }

            if (file.isDirectory()) {
                await removeEmptyFolders(filePath, originalSourceFolder, destinationFolder);
            }
        }

        // 再度チェックしてフォルダが空なら削除
        const remainingFiles = await fs.promises.readdir(folderPath);
        if (remainingFiles.length === 0) {
            await fs.promises.rmdir(folderPath);
        }
    }
}

/**
 * ファイルリストを取得
 * @param Object req
 * @param Object res
 * @returns void
 * @async
 */
exports.fetchFiles = async (req, res) => {
    let {
        sourceFolder,
        destinationFolder,
        outputFolderPattern,
        renameUseCheckbox,
        fileNamePattern,
        exifToolUseCheckbox,
        fileExtension,
        maxFileCount,
        deleteEmptyFoldersCheckbox,
    } = req.body;

    try {
        fileList = [];
        fileCount = 0;
        if (!renameUseCheckbox) {
            fileNamePattern = null;
        }

        let exifToolUse = true;
        if (!exifToolUseCheckbox) {
            exifToolUse = false;
        }

        let deleteEmptyFolders = true;
        if (!deleteEmptyFoldersCheckbox) {
            deleteEmptyFolders = false;
        }

        fileExtension = fileExtension.replace(/[^a-zA-Z0-9,]/g, '').replace(/\s/g, '');
        maxFileCount = maxFileCount.replace(/[^0-9]/g, '').replace(/\s/g, '');
        maxFileCount = parseInt(maxFileCount);

        let files = [];
        // 対象のファイルリストを取得
        for await (const file of getFiles(sourceFolder, destinationFolder, exifToolUse, fileExtension)) {
            if (fileCount < maxFileCount) {
                files.push(file);
                fileCount++;
            } else {
                break;
            }
        }

        for (const file of files) {
            // 入力、出力パスを生成
            const filePaths = generateFilePaths(file, destinationFolder, outputFolderPattern, fileNamePattern);
            fileList.push(filePaths);
        }

        // newPathフィールドでソート
        fileList.sort((a, b) => a.newPath.localeCompare(b.newPath));
        // 対象ファイル数をログ出力
        console.log(`Number of files: ${fileList.length}`);
        // 実行時間秒数をログ出力
        console.log(`Execution time: ${(new Date() - req._startTime) / 1000} sec`); // デバッグメッセージ

        res.render('fileListView', { fileList, sourceFolder, destinationFolder, deleteEmptyFolders });
    } catch (err) {
        console.log(`fetchFiles err: ${err}`);
        console.log(err);
        res.render('error');
    }
};

/**
 * ファイル移動
 * @param Object req
 * @param Object res
 * @returns void
 * @async
 */
exports.moveFiles = async (req, res) => {
    const { sourceFolder, destinationFolder, excludedFiles, deleteEmptyFolders } = req.body;
    const excludedIndexes = JSON.parse(excludedFiles);

    try {
        const filesToMove = fileList.filter((_, index) => !excludedIndexes.includes(index.toString()));

        await Promise.all(filesToMove.map(async (file) => {
            const uniquePath = await getUniqueFilePath(file.newPath);
            await fs.promises.mkdir(path.dirname(uniquePath), { recursive: true });
            await fs.promises.rename(file.originalPath, uniquePath);
        }));

        // 移動元フォルダが空の場合に削除
        if (deleteEmptyFolders === 'true') {
            await removeEmptyFolders(sourceFolder, sourceFolder, destinationFolder);
        }

        res.render('moveComplete');
    } catch (err) {
        console.log(`moveFiles err: ${err}`);
        console.log(err);
        res.render('error');
    }
};