// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'JobOption'... Remove this comment to see the full error message
const JobOption = require('./job-option');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ListForm'.
const ListForm = require('./list-form');
class JobOptionRawfile extends JobOption {
    /**
     * This method is called when the option is selected in the job creation UI.  It
     * should handle any configuration for the option.
     *
     * @method optionSelected
     */
    async optionSelected() {
        let form = new ListForm((this as any).consoleui);
        (this as any).rawFile = await form.showEditor(null, { type: 'boolean', label: 'Raw File Sending Enabled' }, !!(this as any).rawFile);
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
        if ((this as any).rawFile)
            obj.rawFile = true;
    }
    /**
     * Return a string to append to the job configuration display.
     *
     * @method getDisplayString
     * @return {String}
     */
    getDisplayString() {
        if (!(this as any).rawFile)
            return null;
        return 'Send Raw File: On';
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = JobOptionRawfile;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUI = (consoleui) => {
    consoleui.registerJobOption('Send Raw File (No Analysis)', JobOptionRawfile);
};
