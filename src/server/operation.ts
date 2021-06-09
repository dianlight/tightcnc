
import  XError from 'xerror';
import TightCNCServer from './tightcnc-server';
/**
 * Base class for an operation that can be performed.  Operations pretty much map
 * one-to-one to API calls.
 *
 * @class Operation
 */
export default abstract class Operation {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
    constructor(public tightcnc: TightCNCServer, public config){}
    
    /**
     * Initialize the operation.  May return a Promise.
     *
     * @method init
     * @return {Promise|undefined}
     */
    init():Promise<void>|undefined {return }
    /**
     * Run the operation with the given params.
     *
     * @method run
     * @param {Object} params
     * @return {Mixed}
     */
    abstract run(params:any):unknown
    /**
     * Return a common-schema Schema object corresponding to the accepted parameters for the operation.
     *
     * @method getParamSchema
     * @return {Object|Schema}
     */
    //abstract getParamSchema(): unknown
    
    checkReady() {
        if (!this.tightcnc.controller || !this.tightcnc.controller.ready) {
            throw new XError(XError.BAD_REQUEST, 'Controller not ready');
        }
    }
}
