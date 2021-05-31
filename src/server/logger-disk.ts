// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'mkdirp'.
const mkdirp = require('mkdirp');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'path'.
const path = require('path');
class LoggerDisk {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
    constructor(config = {}, tightcnc) {
        (this as any).logDir = tightcnc.getFilename(null, 'log', true, true, true);
        (this as any).maxFileSize = (config as any).maxFileSize || 1000000;
        (this as any).keepFiles = (config as any).keepFiles || 2;
    }
    async init() {
        // Create directory if doesn't exist
        await new Promise<void>((resolve, reject) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            mkdirp((this as any).logDir, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        // Get list of all log files currently in directory
        let files = await new Promise<string[]>((resolve, reject) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            fs.readdir((this as any).logDir, (err, files) => {
                if (err)
                    reject(err);
                else
                    resolve(files);
            });
        });
        (this as any).curFiles = [];
        for (let f of files) {
            let matches = /^cnc-([0-9]+)\.log$/.exec(f);
            if (matches) {
                let num = parseInt(matches[1], 10);
                let stats = await new Promise((resolve, reject) => {
                    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                    fs.stat(path.join((this as any).logDir, f), (err, stats) => {
                        if (err)
                            reject(err);
                        else
                            resolve(stats);
                    });
                });
                (this as any).curFiles.push({ filename: f, num: num, size: (stats as any).size });
            }
        }
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
        (this as any).curFiles.sort((a, b) => a.num - b.num);
        // Create new file if none exist
        if (!(this as any).curFiles.length)
            (this as any).curFiles.push({ filename: 'cnc-0001.log', num: 1, size: 0 });
        // Open most recent file
        let fullFn = path.join((this as any).logDir, (this as any).curFiles[(this as any).curFiles.length - 1].filename);
        (this as any).curStream = fs.createWriteStream(fullFn, { flags: 'a' });
    }
    /**
     * Log a message to disk.
     *
     * @method log
     * @param {String} type - 'send', 'receive', or 'other'
     * @param {Mixed} msg
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'type' implicitly has an 'any' type.
    log(type, msg) {
        if (typeof msg !== 'string')
            msg = JSON.stringify(msg);
        if (type === 'send')
            msg = '> ' + msg;
        else if (type === 'receive')
            msg = '< ' + msg;
        else
            msg = '@ ' + msg;
        msg = msg.trim();
        msg += '\n';
        (this as any).curStream.write(msg);
        (this as any).curFiles[(this as any).curFiles.length - 1].size += msg.length;
        if ((this as any).curFiles[(this as any).curFiles.length - 1].size >= (this as any).maxFileSize) {
            (this as any).curStream.end();
            let newNum = (this as any).curFiles[(this as any).curFiles.length - 1].num + 1;
            let newNumStr = '' + newNum;
            while (newNumStr.length < 4)
                newNumStr = '0' + newNumStr;
            let newFilename = 'cnc-' + newNumStr + '.log';
            (this as any).curFiles.push({ filename: newFilename, num: newNum, size: 0 });
            (this as any).curStream = fs.createWriteStream(path.join((this as any).logDir, newFilename), { flags: 'w' });
            while ((this as any).curFiles.length > (this as any).keepFiles) {
                let fileToDelete = (this as any).curFiles.shift();
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                fs.unlink(path.join((this as any).logDir, fileToDelete.filename), (err) => {
                    if (err)
                        console.error('LoggerDisk error removing file', err);
                });
            }
        }
    }
}
module.exports = LoggerDisk;
