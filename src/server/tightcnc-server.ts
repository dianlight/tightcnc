import { registerOperations } from './file-operations';
const XError = require('xerror');
const objtools = require('objtools');
const LoggerDisk = require('./logger-disk');
const LoggerMem = require('./logger-mem');
const mkdirp = require('mkdirp');
const GcodeProcessor = require('../../lib/gcode-processor');
const GcodeLine = require('../../lib/gcode-line');
const zstreams = require('zstreams');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const JobManager = require('./job-manager');
const stable = require('stable');
const Macros = require('./macros');
const pasync = require('pasync');
const { createSchema } = require('common-schema');
/**
 * This is the central class for the application server.  Operations, gcode processors, and controllers
 * are registered here.
 *
 * @class TightCNCServer
 */
export default class TightCNCServer extends EventEmitter {

    operations: any = {}
    /**
     * Class constructor.
     *
     * @constructor
     * @param {Object} config
     */
    constructor(private config = null) {
        super();
        if (!config) {
            config = require('littleconf').getConfig();
        }
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        if (config.enableServer === false) {
            throw new XError(XError.INVALID_ARGUMENT, 'enableServer config flag now found.  Ensure configuration is correct - check the documentation.');
        }
        (this as any).baseDir = (this as any).config.baseDir;
        (this as any).macros = new Macros(this);
        (this as any).controllerClasses = {};
        (this as any).controller = null;
        this.operations = {};
        (this as any).gcodeProcessors = {};
        (this as any).waitingForInput = null;
        (this as any).waitingForInputCounter = 1;
        // Register builtin modules
        this.registerController('TinyG', require('./tinyg-controller'));
        this.registerController('grbl', require('./grbl-controller'));
        require('./basic-operations')(this);
        registerOperations(this);
        require('./job-operations')(this);
        require('./macro-operations')(this);
        this.registerGcodeProcessor('gcodevm', require('../../lib/gcode-processors/gcode-vm'));
        // Register bundled plugins
        require('../plugins').registerServerComponents(this);
        // Register external plugins
        for (let plugin of ((this as any).config.plugins || [])) {
            let p = require(plugin);
            if (p.registerServerComponents) {
                require(plugin).registerServerComponents(this);
            }
        }
    }
    /**
     * Initialize class.  To be called after everything's registered.
     *
     * @method initServer
     */
    async initServer() {
        // Whether to suppress duplicate error messages from being output sequentially
        const suppressDuplicateErrors = (this as any).config.suppressDuplicateErrors === undefined ? true : (this as any).config.suppressDuplicateErrors;
        // Create directories if missing
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '"data"' is not assignable to par... Remove this comment to see the full error message
        this.getFilename(null, 'data', true, true, true);
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '"macro"' is not assignable to pa... Remove this comment to see the full error message
        this.getFilename(null, 'macro', true, true, true);
        // Initialize the disk and in-memory communications loggers
        (this as any).loggerDisk = new LoggerDisk((this as any).config.logger, this);
        await (this as any).loggerDisk.init();
        (this as any).loggerMem = new LoggerMem((this as any).config.loggerMem || {});
        (this as any).loggerMem.log('other', 'Server started.');
        (this as any).loggerDisk.log('other', 'Server started.');
        // Initialize the message log
        (this as any).messageLog = new LoggerMem((this as any).config.messageLog || {});
        (this as any).messageLog.log('Server started.');
        // Initialize macros
        await (this as any).macros.initMacros();
        // Set up the controller
        if ((this as any).config.controller) {
            let controllerClass = (this as any).controllerClasses[(this as any).config.controller];
            let controllerConfig = (this as any).config.controllers[(this as any).config.controller];
            (this as any).controller = new controllerClass(controllerConfig);
            (this as any).controller.tightcnc = this;
            // @ts-expect-error ts-migrate(7034) FIXME: Variable 'lastError' implicitly has type 'any' in ... Remove this comment to see the full error message
            let lastError = null; // used to suppress duplicate error messages on repeated connection retries
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            (this as any).controller.on('error', (err) => {
                let errrep = JSON.stringify(err.toObject ? err.toObject() : err.toString) + err;
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'lastError' implicitly has an 'any' type.
                if (objtools.deepEquals(errrep, lastError) && suppressDuplicateErrors)
                    return;
                lastError = errrep;
                console.error('Controller error: ', err);
                if (err.toObject)
                    console.error(err.toObject());
                if (err.stack)
                    console.error(err.stack);
            });
            (this as any).controller.on('ready', () => {
                lastError = null;
                console.log('Controller ready.');
            });
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'line' implicitly has an 'any' type.
            (this as any).controller.on('sent', (line) => {
                (this as any).loggerMem.log('send', line);
                (this as any).loggerDisk.log('send', line);
            });
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'line' implicitly has an 'any' type.
            (this as any).controller.on('received', (line) => {
                (this as any).loggerMem.log('receive', line);
                (this as any).loggerDisk.log('receive', line);
            });
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
            (this as any).controller.on('message', (msg) => {
                this.message(msg);
            });
            (this as any).controller.initConnection(true);
        }
        else {
            console.log('WARNING: Initializing without a controller enabled.  For testing only.');
            (this as any).controller = {};
        }
        // Set up the job manager
        (this as any).jobManager = new JobManager(this);
        await (this as any).jobManager.initialize();
        // Initialize operations
        for (let opname in this.operations) {
            await this.operations[opname].init();
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
    message(msg) {
        (this as any).messageLog.log(msg);
        (this as any).loggerMem.log('other', 'Message: ' + msg);
        (this as any).loggerDisk.log('other', 'Message: ' + msg);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    debug(str) {
        if (!(this as any).config.enableDebug)
            return;
        if ((this as any).config.debugToStdout) {
            console.log('Debug: ' + str);
        }
        if ((this as any).loggerDisk) {
            (this as any).loggerDisk.log('other', 'Debug: ' + str);
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    getFilename(name, place = null, allowAbsolute = false, createParentsIfMissing = false, createAsDirIfMissing = false) {
        if (name && path.isAbsolute(name) && !allowAbsolute)
            throw new XError(XError.INVALID_ARGUMENT, 'Absolute paths not allowed');
        if (name && name.split(path.sep).indexOf('..') !== -1 && !allowAbsolute)
            throw new XError(XError.INVALID_ARGUMENT, 'May not ascend directories');
        let base = (this as any).baseDir;
        if (place) {
            // @ts-expect-error ts-migrate(2538) FIXME: Type 'null' cannot be used as an index type.
            let placePath = (this as any).config.paths[place];
            if (!placePath)
                throw new XError(XError.INVALID_ARGUMENT, 'No such place ' + place);
            base = path.resolve(base, placePath);
        }
        if (name) {
            base = path.resolve(base, name);
        }
        let absPath = base;
        if (createParentsIfMissing) {
            mkdirp.sync(path.dirname(absPath));
        }
        if (createAsDirIfMissing) {
            if (!fs.existsSync(absPath)) {
                fs.mkdirSync(absPath);
            }
        }
        return absPath;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    registerController(name, cls) {
        (this as any).controllerClasses[name] = cls;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    registerOperation(name, cls) {
        this.operations[name] = new cls(this, (this as any).config.operations[name] || {});
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    registerGcodeProcessor(name, cls) {
        (this as any).gcodeProcessors[name] = cls;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'opname' implicitly has an 'any' type.
    async runOperation(opname, params) {
        if (!(opname in this.operations)) {
            throw new XError(XError.NOT_FOUND, 'No such operation: ' + opname);
        }
        try {
            return await this.operations[opname].run(params);
        }
        catch (err) {
            console.error('Error running operation ' + opname);
            console.error(err);
            if (err.stack)
                console.error(err.stack);
            throw err;
        }
    }
    /**
     * Return the current status object.
     *
     * @method getStatus
     * @return {Promise{Object}}
     */
    async getStatus() {
        let statusObj = {};
        // Fetch controller status
        (statusObj as any).controller = (this as any).controller ? (this as any).controller.getStatus() : {};
        // Fetch job status
        (statusObj as any).job = (this as any).jobManager ? (this as any).jobManager.getStatus() : undefined;
        // Emit 'statusRequest' event so other components can modify the status object directly
        (this as any).emit('statusRequest', statusObj);
        // Add input request
        if ((this as any).waitingForInput) {
            (statusObj as any).requestInput = {
                prompt: (this as any).waitingForInput.prompt,
                schema: (this as any).waitingForInput.schema,
                id: (this as any).waitingForInput.id
            };
        }
        // Return status
        return statusObj;
    }
    /**
     * Returns a stream of gcode data that can be piped to a controller.
     *
     * @method getGcodeSourceStream
     * @param {Object} options
     *   @param {String} options.filename - Filename to read source gcode from.
     *   @param {String[]} options.data - Array of gcode line strings.  Can be supplied instead of filename.
     *   @param {Mixed} options.macro - Use a macro as a source.  Can be supplied instead of filename.
     *   @param {Object} options.macroParams - Parameters when using options.macro
     *   @param {Object[]} options.gcodeProcessors - The set of gcode processors to apply, in order, along with
     *     options for each.  These objects are modified by this function to add the instantiated gcode processor
     *     instances under the key 'inst' (unless the 'inst' key already exists, in which case it is used).
     *     @param {String} options.gcodeProcessors.#.name - Name of gcode processor.
     *     @param {Object} options.gcodeProcessors.#.options - Additional options to pass to gcode processor constructor.
     *     @param {Number} [options.gcodeProcessors.#.order] - Optional order number.  Gcode processors with associated order numbers
     *       are reordered according to the numbers.
     *   @param {Boolean} options.rawStrings=false - If true, the stream returns strings (lines) instead of GcodeLine instances.
     *   @param {Boolean} options.dryRun=false - If true, sets dryRun flag on gcode processors.
     *   @param {JobState} options.job - Optional job object associated.
     * @return {ReadableStream} - a readable object stream of GcodeLine instances.  The stream will have
     *   the additional property 'gcodeProcessorChain' containing an array of all GcodeProcessor's in the chain.  This property
     *   is only available once the 'processorChainReady' event is fired on the returned stream;
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'options' implicitly has an 'any' type.
    getGcodeSourceStream(options) {
        // Handle case where returning raw strings
        if (options.rawStrings) {
            if (options.filename) {
                let filename = options.filename;
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '"data"' is not assignable to par... Remove this comment to see the full error message
                filename = this.getFilename(filename, 'data', true);
                return zstreams.fromFile(filename).pipe(new zstreams.SplitStream());
            }
            else if (options.macro) {
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
                return (this as any).macros.generatorMacroStream(options.macro, options.macroParams || {}).through((gline) => gline.toString());
            }
            else {
                return zstreams.fromArray(options.data);
            }
        }
        // 
        let macroStreamFn = null;
        if (options.macro) {
            macroStreamFn = () => {
                return (this as any).macros.generatorMacroStream(options.macro, options.macroParams || {});
            };
        }
        // Sort gcode processors
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
        let sortedGcodeProcessors = stable(options.gcodeProcessors || [], (a, b) => {
            let aorder, border;
            if ('order' in a)
                aorder = a.order;
            else if (a.name && (this as any).gcodeProcessors[a.name] && 'DEFAULT_ORDER' in (this as any).gcodeProcessors[a.name])
                aorder = (this as any).gcodeProcessors[a.name].DEFAULT_ORDER;
            else
                aorder = 0;
            if ('order' in b)
                border = b.order;
            else if (b.name && (this as any).gcodeProcessors[b.name] && 'DEFAULT_ORDER' in (this as any).gcodeProcessors[b.name])
                border = (this as any).gcodeProcessors[b.name].DEFAULT_ORDER;
            else
                border = 0;
            if (aorder > border)
                return 1;
            if (aorder < border)
                return -1;
            return 0;
        });
        // Construct gcode processor chain
        let gcodeProcessorInstances = [];
        for (let gcpspec of sortedGcodeProcessors) {
            if (gcpspec.inst) {
                if (options.dryRun)
                    gcpspec.inst.dryRun = true;
                gcodeProcessorInstances.push(gcpspec.inst);
            }
            else {
                let cls = (this as any).gcodeProcessors[gcpspec.name];
                if (!cls)
                    throw new XError(XError.NOT_FOUND, 'Gcode processor not found: ' + gcpspec.name);
                let opts = objtools.deepCopy(gcpspec.options || {});
                opts.tightcnc = this;
                if (options.job)
                    opts.job = options.job;
                let inst = new cls(opts);
                if (options.dryRun)
                    inst.dryRun = true;
                gcpspec.inst = inst;
                gcodeProcessorInstances.push(inst);
            }
        }
        return (GcodeProcessor as any).buildProcessorChain(options.filename || options.data || macroStreamFn, gcodeProcessorInstances, false);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'macro' implicitly has an 'any' type.
    async runMacro(macro, params = {}, options = {}) {
        return await (this as any).macros.runMacro(macro, params, options);
    }
    // @ts-expect-error ts-migrate(7023) FIXME: 'requestInput' implicitly has return type 'any' be... Remove this comment to see the full error message
    async requestInput(prompt, schema) {
        if (prompt && typeof prompt === 'object' && !schema) {
            schema = prompt;
            prompt = null;
        }
        if (schema) {
            if (typeof schema.getData !== 'function') {
                schema = createSchema(schema);
            }
            schema = schema.getData();
        }
        if (!prompt)
            prompt = 'Waiting ...';
        if ((this as any).waitingForInput) {
            await (this as any).waitingForInput.waiter.promise;
            return await this.requestInput(prompt, schema);
        }
        (this as any).waitingForInput = {
            prompt: prompt,
            schema: schema,
            waiter: pasync.waiter(),
            id: (this as any).waitingForInputCounter++
        };
        let result = await (this as any).waitingForInput.waiter.promise;
        return result;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
    provideInput(value) {
        if (!(this as any).waitingForInput)
            throw new XError(XError.INVALID_ARGUMENT, 'Not currently waiting for input');
        let w = (this as any).waitingForInput;
        (this as any).waitingForInput = null;
        w.waiter.resolve(value);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
    cancelInput(err) {
        if (!err)
            err = new XError(XError.CANCELLED, 'Requested input cancelled');
        if (!(this as any).waitingForInput)
            return;
        let w = (this as any).waitingForInput;
        (this as any).waitingForInput = null;
        w.waiter.reject(err);
    }
}