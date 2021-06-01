/**
 * This class handles the ConsoleUI client side component of job options.  It is modular so
 * modules can register UIs for any provided job options.
 *
 * This class is instantiated each time the option is selected, so can store state data
 * related to the option.
 *
 * @class JobOption
 */
export default class JobOption {
    newJobMode: any;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(public consoleui) {
        this.newJobMode = consoleui.modes.newJob;
    }
    /**
     * This method is called when the option is selected in the job creation UI.  It
     * should handle any configuration for the option.
     *
     * @method optionSelected
     */
    optionSelected() {
    }
    /**
     * This method should handle adding whatever this job option needs to the jobOptions
     * object sent to the server.  It should use state information that was collected
     * in optionSelected().
     *
     * @method addToJobOptions
     * @param {Object} obj - jobOptions object to be sent to the server
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'obj' implicitly has an 'any' type.
    addToJobOptions(obj) {
    }
    /**
     * Return a string to append to the job configuration display.
     *
     * @method getDisplayString
     * @return {String}
     */
    getDisplayString() {
    }
}
