// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'XError'.
const XError = require('xerror');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'GcodeLine'... Remove this comment to see the full error message
const GcodeLine = require('../../lib/gcode-line');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pasync'.
const pasync = require('pasync');
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'path'.
const path = require('path');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'zstreams'.
const zstreams = require('zstreams');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'objtools'.
const objtools = require('objtools');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'createSche... Remove this comment to see the full error message
const { createSchema } = require('common-schema');
class Macros {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
    constructor(tightcnc) {
        (this as any).tightcnc = tightcnc;
        (this as any).macroCache = {};
    }
    async initMacros() {
        // Load macro cache and start cache refresh loop
        await this._loadMacroCache();
        setInterval(() => {
            this._updateMacroCache()
                .catch((err) => {
                console.error('Error updating macro cache', err);
            });
        }, 10000);
    }
    async listAllMacros() {
        let ret = [];
        for (let key in (this as any).macroCache) {
            ret.push({
                name: key,
                params: (this as any).macroCache[key].metadata && (this as any).macroCache[key].metadata.params
            });
        }
        return ret;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    getMacroParams(name) {
        if (!(this as any).macroCache[name])
            throw new XError(XError.NOT_FOUND, 'Macro ' + name + ' not found');
        let metadata = (this as any).macroCache[name].metadata;
        if (!metadata)
            return null;
        if (!metadata.params && !metadata.mergeParams)
            return null;
        let params = objtools.deepCopy(metadata.params || {});
        if (metadata.mergeParams) {
            let otherMacros = metadata.mergeParams;
            if (!Array.isArray(otherMacros))
                otherMacros = [otherMacros];
            this._mergeParams(params, ...otherMacros);
        }
        return params;
    }
    async _loadMacroCache() {
        let newMacroCache = {};
        let fileObjs = await this._listMacroFiles();
        for (let fo of fileObjs) {
            try {
                (fo as any).metadata = await this._loadMacroMetadata(await this._readFile(fo.absPath));
            }
            catch (err) {
                console.error('Error loading macro metadata', fo.name, err);
            }
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            newMacroCache[fo.name] = fo;
        }
        (this as any).macroCache = newMacroCache;
    }
    async _updateMacroCache() {
        let fileObjs = await this._listMacroFiles();
        let fileObjMap = {};
        for (let fo of fileObjs)
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            fileObjMap[fo.name] = fo;
        // Delete anything from the cache that doesn't exist in the new listing
        for (let key in (this as any).macroCache) {
            if (!(key in fileObjMap))
                delete (this as any).macroCache[key];
        }
        // For each macro file, if it has been updated (or is new) since the cache load, reload it
        for (let key in fileObjMap) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            if (!(key in (this as any).macroCache) || fileObjMap[key].stat.mtime.getTime() > (this as any).macroCache[key].stat.mtime.getTime()) {
                try {
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    fileObjMap[key].metadata = await this._loadMacroMetadata(await this._readFile(fileObjMap[key].absPath));
                }
                catch (err) {
                    console.error('Error loading macro metadata', key, err);
                }
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                (this as any).macroCache[key] = fileObjMap[key];
            }
        }
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async _updateMacroCacheOne(macroName) {
        if (!(macroName in (this as any).macroCache)) {
            await this._updateMacroCache();
            return;
        }
        let fo = (this as any).macroCache[macroName];
        let stat = await new Promise((resolve, reject) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            fs.stat(fo.absPath, (err, stat) => {
                if (err)
                    reject(err);
                else
                    resolve(stat);
            });
        });
        if (( stat as any ).mtime.getTime() > fo.stat.mtime.getTime()) {
            try {
                fo.stat = stat;
                fo.metadata = await this._loadMacroMetadata(await this._readFile(fo.absPath));
            }
            catch (err) {
                console.error('Error loading macro metadata', macroName, err);
            }
        }
    }
    async _listMacroFiles() {
        // later directories in this list take precedence in case of duplicate names
        let dirs = [path.join(__dirname, 'macro'), (this as any).tightcnc.getFilename(null, 'macro', false, true, true)];
        let ret = [];
        for (let dir of dirs) {
            try {
                let files = await new Promise<string[]>((resolve, reject) => {
                    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                    fs.readdir(dir, (err, files) => {
                        if (err)
                            reject(err);
                        else
                            resolve(files);
                    });
                });
                for (let file of files) {
                    if (/\.js$/.test(file)) {
                        try {
                            let absPath = path.resolve(dir, file);
                            let stat = await new Promise((resolve, reject) => {
                                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                                fs.stat(absPath, (err, stat) => {
                                    if (err)
                                        reject(err);
                                    else
                                        resolve(stat);
                                });
                            });
                            ret.push({
                                name: file.slice(0, -3),
                                absPath: absPath,
                                stat: stat
                            });
                        }
                        catch (err) {
                            // @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'absPath'.
                            console.error('Error stat-ing macro file ' + absPath, err);
                        }
                    }
                }
            }
            catch (err) { }
        }
        return ret;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'code' implicitly has an 'any' type.
    async _loadMacroMetadata(code) {
        /* Macro metadata (parameters) is specified inside the macro file itself.  It looks like this:
         * macroMeta({ value: 'number', pos: [ 'number' ] })
         * The parameter to macroMeta is a commonSchema-style object specifying the macro parameters.
         * When running the macro, this function is a no-op and does nothing.  When extracting the
         * metadata, the macro is run, and the function throws an exception (which is then caught here).
         * When retrieving metadata, no other macro environment functions are available.  The macroMeta
         * function should be the first code executed.
         */
        // Detect if there's a call to macroMeta
        let hasMacroMeta = false;
        for (let line of code.split(/\r?\n/g)) {
            if (/^\s*macroMeta\s*\(/.test(line)) {
                hasMacroMeta = true;
                break;
            }
        }
        if (!hasMacroMeta)
            return null;
        // Construct the function to call and the macroMeta function
        let fn = new AsyncFunction('tightcnc', 'macroMeta', code);
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'metadata' implicitly has an 'any' type.
        const macroMeta = (metadata) => {
            throw { metadata, isMacroMetadata: true };
        };
        // Run the macro and trap the exception containing metadata
        let gotMacroMetadata = null;
        try {
            await fn((this as any).tightcnc, macroMeta);
            throw new XError(XError.INTERNAL_ERROR, 'Expected call to macroMeta() in macro');
        }
        catch (err) {
            if (err && err.isMacroMetadata) {
                gotMacroMetadata = err;
                // @ts-expect-error ts-migrate(2693) FIXME: 'any' only refers to a type, but is being used as ... Remove this comment to see the full error message
                any.metadata;
            }
            else {
                throw new XError(XError.INTERNAL_ERROR, 'Error getting macro metadata', err);
            }
        }
        if (!gotMacroMetadata)
            return null;
        // Return the metadata
        let metadata = gotMacroMetadata;
        if (metadata.params) {
            metadata.params = createSchema(metadata.params).getData();
        }
        return metadata;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    _prepMacroParam(value, key, env) {
        let axisLabels = (this as any).tightcnc.controller.axisLabels;
        // allow things that look like coordinate arrays to be accessed by their axis letters
        if (Array.isArray(value) && (value.length <= axisLabels.length || value.length < 6)) {
            let axisLabels = (this as any).tightcnc.controller.axisLabels;
            for (let axisNum = 0; axisNum < value.length && axisNum < axisLabels.length; axisNum++) {
                let axis = axisLabels[axisNum].toLowerCase();
                value[axis] = value[axisNum];
                value[axis.toUpperCase()] = value[axisNum];
                if (key === 'pos' && env && !(axis in env) && !(axis.toUpperCase() in env)) {
                    env[axis] = value[axisNum];
                    env[axis.toUpperCase()] = value[axisNum];
                }
            }
        }
        return value;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'ourParams' implicitly has an 'any' type... Remove this comment to see the full error message
    _mergeParams(ourParams, ...otherMacroNames) {
        for (let name of otherMacroNames) {
            let otherParams = this.getMacroParams(name);
            if (otherParams) {
                for (let key in otherParams) {
                    if (!(key in ourParams)) {
                        ourParams[key] = objtools.deepCopy(otherParams[key]);
                    }
                }
            }
        }
        return ourParams;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'code' implicitly has an 'any' type.
    async _makeMacroEnv(code, params, options) {
        // @ts-expect-error ts-migrate(7034) FIXME: Variable 'env' implicitly has type 'any' in some l... Remove this comment to see the full error message
        let env;
        env = {
            // push gcode function available inside macro.  In gcode processor, pushes onto the gcode processor stream.
            // Otherwise, sends to controller.  Tracks if the most recent sent line is executed for syncing.
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
            push: (gline) => {
                if (typeof gline === 'string' || Array.isArray(gline))
                    gline = new GcodeLine(gline);
                if (options.push) {
                    options.push(gline);
                }
                else if (options.gcodeProcessor) {
                    options.gcodeProcessor.pushGcode(gline);
                }
                else {
                    (this as any).tightcnc.controller.sendGcode(gline);
                }
            },
            // Waits until all sent gcode has been executed and machine is stopped
            sync: async () => {
                if (options.sync)
                    return await options.sync();
                if (options.gcodeProcessor) {
                    await options.gcodeProcessor.flushDownstreamProcessorChain();
                }
                await (this as any).tightcnc.controller.waitSync();
            },
            // Runs a named operation
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
            op: async (name, params) => {
                return await (this as any).tightcnc.runOperation(name, params);
            },
            // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
            runMacro: async (macro, params = {}) => {
                await this.runMacro(macro, params, options);
            },
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'prompt' implicitly has an 'any' type.
            input: async (prompt, schema) => {
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'env' implicitly has an 'any' type.
                await env.sync();
                return await (this as any).tightcnc.requestInput(prompt, schema);
            },
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
            message: (msg) => {
                (this as any).tightcnc.message(msg);
            },
            tightcnc: (this as any).tightcnc,
            gcodeProcessor: options.gcodeProcessor,
            controller: (this as any).tightcnc.controller,
            axisLabels: (this as any).tightcnc.controller.axisLabels,
            XError: XError,
            GcodeLine: GcodeLine,
            macroMeta: () => { } // this function is a no-op in normal operation
        };
        let meta = await this._loadMacroMetadata(code);
        let schema = meta && meta.params;
        let pkeys;
        if (schema && schema.type === 'object' && schema.properties) {
            pkeys = Object.keys(schema.properties);
        }
        else {
            pkeys = Object.keys(params);
        }
        for (let key of pkeys) {
            if (!(key in env)) {
                let value = this._prepMacroParam(params[key], key, env);
                params[key] = value;
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                env[key] = value;
            }
        }
        (env as any).allparams = params;
        return env;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'code' implicitly has an 'any' type.
    async runJS(code, params = {}, options = {}) {
        if ((options as any).waitSync)
            code += '\n;await sync();';
        let env = await this._makeMacroEnv(code, params, options);
        let envKeys = Object.keys(env);
        let fnCtorArgs = envKeys.concat([code]);
        let fn = new AsyncFunction(...fnCtorArgs);
        let fnArgs = [];
        for (let key of envKeys) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            fnArgs.push(env[key]);
        }
        return await fn(...fnArgs);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'filename' implicitly has an 'any' type.
    _readFile(filename) {
        return new Promise((resolve, reject) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            fs.readFile(filename, { encoding: 'utf8' }, (err, data) => {
                if (err) {
                    if (err && err.code === 'ENOENT') {
                        reject(new XError(XError.NOT_FOUND, 'File not found'));
                    }
                    else {
                        reject(err);
                    }
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    /**
     * Run a macro in any of the macro formats.
     *
     * Macros are just javascript code that is executed in an environment with a few easy-to-access
     * functions and variables.  They run in a trusted context and only trusted macros should be run.
     *
     * The macro can be one of:
     * - A string, which maps to a file in the macro directory.  '.js' is automatically appended to the name.
     * - A string containing a semicolon, which is treated directly as javascript code.
     * - An array of string gcode lines.  These string gcode lines can contain substitutions as in JS backtick ``
     *   substitution.
     *
     * Macros run in a context with the following functions/variables available:
     * - tightcnc - The tightcnc instance
     * - controller - Alias for tightcnc.controller
     * - gcodeProcessor - The GcodeProcessor, if running within a GcodeProcessor context
     * - axisLabels - An array of axis labels corresponding to position arrays
     * - push(gline) - Send out a gcode line, either as a GcodeLine instance or a string (which is parsed).  If running
     *   in a GcodeProcessor context, this pushes onto the output stream.  Otherwise, the line is sent directly to
     *   the controller.
     * - sync() - Wait for all sent gcode lines to be executed.  Returns a Promise.  Use it as 'await sync();' - macros
     *   can use 'await'.
     * - op(name, params) - Runs a named tightcnc operation.  Returns a promise.
     *
     * All axis-array positions passed as parameters are detected (as numeric arrays of short length) as coordinates
     * and are assigned properties corresponding to the axis labels (ie, pos.x, pos.y, etc).  Additionally, if there is
     * a parameter named simply 'pos', the axis letters are exposed directly as variables in the macro context.
     *
     * @method runMacro
     * @param {String|String[]} macro
     * @param {Object} params - Any parameters to pass as variables to the macro.
     * @param {Object} options - Options for macro execution.
     *   @param {GcodeProcessor} options.gcodeProcessor - Provide this if running in the context of a gcode processor.  This provides
     *     the gcode processor in the environment of the macro and also causes the push() method to push onto the gcode processor's
     *     output stream instead of being directly executed on the controller.
     *   @param {Function} options.push - Provide a function for handling pushing gcode lines.
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'macro' implicitly has an 'any' type.
    async runMacro(macro, params = {}, options = {}) {
        if (typeof macro === 'string' && macro.indexOf(';') !== -1) {
            // A javascript string blob
            return await this.runJS(macro, params, options);
        }
        else if (typeof macro === 'string') {
            // A filename to a javascript file
            if (macro.indexOf('..') !== -1 || path.isAbsolute(macro))
                throw new XError(XError.INVALID_ARGUMENT, '.. is not allowed in macro names');
            // Get the macro metadata
            await this._updateMacroCacheOne(macro);
            if (!(this as any).macroCache[macro])
                throw new XError(XError.NOT_FOUND, 'Macro ' + macro + ' not found');
            // Normalize the params
            let paramsSchema = this.getMacroParams(macro);
            if (paramsSchema) {
                createSchema(paramsSchema).normalize(params, { removeUnknownFields: true });
            }
            // Load the macro code
            let code = await this._readFile((this as any).macroCache[macro].absPath);
            if (!code)
                throw new XError(XError.NOT_FOUND, 'Macro ' + macro + ' not found');
            // Run the macro
            return await this.runJS(code, params, options);
        }
        else if (Array.isArray(macro) && typeof macro[0] === 'string') {
            // An array of strings with substitutions
            let code = '';
            for (let str of macro) {
                code += 'push(`' + str + '`);\n';
            }
            return await this.runJS(code, params, options);
        }
        else {
            throw new XError(XError.INVALID_ARGUMENT, 'Unknown macro type');
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'macro' implicitly has an 'any' type.
    generatorMacroStream(macro, params) {
        return new MacroGcodeSourceStream(this, macro, params);
    }
}
class MacroGcodeSourceStream extends zstreams.Readable {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'macros' implicitly has an 'any' type.
    constructor(macros, macro, macroParams) {
        super({ objectMode: true });
        (this as any).pushReadWaiter = null;
        let gotChainError = false;
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
        (this as any).on('chainerror', (err) => {
            gotChainError = true;
            if ((this as any).pushReadWaiter) {
                (this as any).pushReadWaiter.reject(err);
                (this as any).pushReadWaiter = null;
            }
        });
        macros.runMacro(macro, macroParams, {
            // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
            push: async (gline) => {
                let r = (this as any).push(gline);
                if (!r) {
                    // wait until _read is called
                    if (!(this as any).pushReadWaiter) {
                        (this as any).pushReadWaiter = pasync.waiter();
                    }
                    await (this as any).pushReadWaiter.promise;
                }
            },
            sync: async () => {
                throw new XError(XError.UNSUPPORTED_OPERATION, 'sync() not supported in generator macros');
            }
        })
            .then(() => {
            (this as any).push(null);
        })
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            .catch((err) => {
            if (!gotChainError) {
                (this as any).emit('error', new XError(XError.INTERNAL_ERROR, 'Error running generator macro', err));
            }
        });
    }
    _read() {
        if ((this as any).pushReadWaiter) {
            (this as any).pushReadWaiter.resolve();
            (this as any).pushReadWaiter = null;
        }
    }
}
module.exports = Macros;
