
import { errRegistry } from './errRegistry';
import TightCNCServer from './tightcnc-server';
/**
 * Base class for an operation that can be performed.  Operations pretty much map
 * one-to-one to API calls.
 *
 * @class Operation
 */
export default abstract class Operation {
    constructor(public tightcnc: TightCNCServer, public config:any){}
    
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
            throw errRegistry.newError('INTERNAL_ERROR','BAD_REQUEST').formatMessage('Controller not ready');
        }
    }
}
