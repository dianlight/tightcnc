const XError = require('xerror');
const objtools = require('objtools');
const LoggerDisk = require('./logger-disk');
const LoggerMem = require('./logger-mem');

/**
 * This is the central class for the application server.  Operations, gcode processors, and controllers
 * are registered here.
 *
 * @class OpManager
 */
class OpManager {

	/**
	 * Class constructor.
	 *
	 * @constructor
	 * @param {Object} config
	 */
	constructor(config = null) {
		if (!config) {
			config = require('littleconf').getConfig();
		}
		this.config = config;

		this.controllerClasses = {};
		this.controller = null;

		this.operations = {};

		this.gcodeProcessors = {};

		// Register builtin modules
		this.registerController('TinyG', require('./tinyg-controller'));
		require('./basic-operations')(this);
	}

	/**
	 * Initialize class.  To be called after everything's registered.
	 *
	 * @method init
	 */
	async init() {
		const suppressDuplicateErrors = this.config.suppressDuplicateErrors === undefined ? true : this.config.suppressDuplicateErrors;
		this.loggerDisk = new LoggerDisk(this.config.logger);
		await this.loggerDisk.init();
		this.loggerMem = new LoggerMem(this.config.loggerMem || {});
		this.loggerMem.log('other', 'Server started.');
		this.loggerDisk.log('other', 'Server started.');
		if (this.config.controller) {
			let controllerClass = this.controllerClasses[this.config.controller];
			let controllerConfig = this.config.controllers[this.config.controller];
			this.controller = new controllerClass(controllerConfig);
			let lastError = null; // used to suppress duplicate error messages on repeated connection retries
			this.controller.on('error', (err) => {
				let errrep = err.toObject ? err.toObject() : err.toString;
				if (objtools.deepEquals(errrep, lastError) && suppressDuplicateErrors) return;
				lastError = errrep;
				console.error('Controller error: ', err);
				if (err.toObject) console.error(err.toObject());
				if (err.stack) console.error(err.stack);
			});
			this.controller.on('ready', () => {
				lastError = null;
				console.log('Controller ready.');
			});
			this.controller.on('sent', (line) => {
				this.loggerMem.log('send', line);
				this.loggerDisk.log('send', line);
			});
			this.controller.on('received', (line) => {
				this.loggerMem.log('receive', line);
				this.loggerDisk.log('receive', line);
			});
			this.controller.initConnection(true);
		} else {
			console.log('WARNING: Initializing without a controller enabled.  For testing only.');
			this.controller = {};
		}
		for (let opname in this.operations) {
			await this.operations[opname].init();
		}
	}

	registerController(name, cls) {
		this.controllerClasses[name] = cls;
	}

	registerOperation(name, cls) {
		this.operations[name] = new cls(this, this.config.operations[name] || {});
	}

	registerGcodeProcessor(name, cls, dependencies = []) {
	}

	async runOperation(opname, params) {
		if (!(opname in this.operations)) {
			throw new XError(XError.NOT_FOUND, 'No such operation: ' + opname);
		}
		return await this.operations[name].run(params);
	}

}

module.exports = OpManager;

