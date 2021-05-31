// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'XError'.
const XError = require('xerror');
/**
 * Base class for an operation that can be performed.  Operations pretty much map
 * one-to-one to API calls.
 *
 * @class Operation
 */
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Operation'... Remove this comment to see the full error message
class Operation {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
    constructor(tightcnc, config) {
        (this as any).tightcnc = tightcnc;
        (this as any).config = config;
    }
    /**
     * Initialize the operation.  May return a Promise.
     *
     * @method init
     * @return {Promise|undefined}
     */
    init() { }
    /**
     * Run the operation with the given params.
     *
     * @method run
     * @param {Object} params
     * @return {Mixed}
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    run(params) { }
    /**
     * Return a common-schema Schema object corresponding to the accepted parameters for the operation.
     *
     * @method getParamSchema
     * @return {Object|Schema}
     */
    getParamSchema() { }
    checkReady() {
        if (!(this as any).tightcnc.controller || !(this as any).tightcnc.controller.ready) {
            throw new XError(XError.BAD_REQUEST, 'Controller not ready');
        }
    }
}
module.exports = Operation;
