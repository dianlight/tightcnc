// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'XError'.
const XError = require('xerror');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'GcodeProce... Remove this comment to see the full error message
const GcodeProcessor = require('../../lib/gcode-processor');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'GcodeLine'... Remove this comment to see the full error message
const GcodeLine = require('../../lib/gcode-line');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'GcodeVM'.
const GcodeVM = require('../../lib/gcode-vm');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'objtools'.
const objtools = require('objtools');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pasync'.
const pasync = require('pasync');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Operation'... Remove this comment to see the full error message
const Operation = require('../server/operation');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ListForm'.
const ListForm = require('../consoleui/list-form');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'commonSche... Remove this comment to see the full error message
const commonSchema = require('common-schema');
/**
 * This gcode processors allows overriding things at job runtime.  Currently just supports feed multiplier.
 *
 * To ensure override changes take effect quickly, this processor limits the total number of lines buffered
 * and not yet executed downstream of this processor to a set minimum.  Because of this, this processor should
 * probably occur near the end of a processor chain.  It should also probably occur after the job recovery processors
 * so it doesn't interfere with that.
 *
 * @class RuntimeOverride
 * @constructor
 * @param {Object} options
 *   @param {Number} [maxTotalLinesBuffered=40] - Maximum number of buffered not-executed lines downstream
 */
class RuntimeOverride extends GcodeProcessor {
    static DEFAULT_ORDER = 950000;
    constructor(options = {}) {
        super(options, 'runtimeoverride', true);
        (this as any).maxTotalLinesBuffered = (options as any).maxTotalLinesBuffered || 40;
        (this as any).feedMultiplier = 1;
        (this as any).vm = new GcodeVM(options);
        (this as any).lastLineCounterExecuted = 0;
        (this as any).nextExecutedWaiter = null;
    }
    getStatus() {
        return {
            feedMultiplier: (this as any).feedMultiplier
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    async processGcode(gline) {
        if ((this as any).dryRun)
            return gline;
        (this as any).vm.runGcodeLine(gline);
        let lineCounter = (this as any).vm.lineCounter;
        if (lineCounter - (this as any).lastLineCounterExecuted - 1 >= (this as any).maxTotalLinesBuffered) {
            if (!(this as any).nextExecutedWaiter)
                (this as any).nextExecutedWaiter = pasync.waiter();
            await (this as any).nextExecutedWaiter.promise;
        }
        if ((this as any).feedMultiplier !== 1 && gline.has('F')) {
            gline.set('F', gline.get('F') * (this as any).feedMultiplier);
            gline.addComment('ro');
        }
        gline.hookSync('executed', () => {
            if (lineCounter > (this as any).lastLineCounterExecuted) {
                (this as any).lastLineCounterExecuted = lineCounter;
            }
            if ((this as any).nextExecutedWaiter && lineCounter - (this as any).lastLineCounterExecuted - 1 < (this as any).maxTotalLinesBuffered) {
                (this as any).nextExecutedWaiter.resolve();
                (this as any).nextExecutedWaiter = null;
            }
        });
        return gline;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'm' implicitly has an 'any' type.
    setFeedMultiplier(m) {
        (this as any).feedMultiplier = m;
        if ((this as any).vm.getState().seenWordSet.F) {
            this.pushGcode(new GcodeLine('F' + ((this as any).vm.getState().feed * m)));
        }
    }
}
class SetFeedMultiplierOperation extends Operation {
    getParamSchema() {
        return {
            feedMultiplier: {
                type: Number,
                required: true,
                default: 1,
                description: 'Multiplier for job feed rates'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        findCurrentJobGcodeProcessor((this as any).tightcnc, 'runtimeoverride').setFeedMultiplier(params.feedMultiplier);
        return { success: true };
    }
}
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
function findCurrentJobGcodeProcessor(tightcnc, name, throwOnMissing = true) {
    let currentJob = tightcnc.jobManager.currentJob;
    if (!currentJob || currentJob.state === 'cancelled' || currentJob.state === 'error' || currentJob.state === 'complete') {
        throw new XError(XError.INTERNAL_ERROR, 'No currently running job');
    }
    let gcodeProcessors = currentJob.gcodeProcessors || {};
    for (let key in gcodeProcessors) {
        if (gcodeProcessors[key].gcodeProcessorName === name) {
            return gcodeProcessors[key];
        }
    }
    if (throwOnMissing) {
        throw new XError(XError.INTERNAL_ERROR, 'No ' + name + ' gcode processor found');
    }
    else {
        return null;
    }
}
module.exports.RuntimeOverride = RuntimeOverride;
module.exports.SetFeedMultiplierOperation = SetFeedMultiplierOperation;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerServerComponents = function (tightcnc) {
    tightcnc.registerGcodeProcessor('runtimeoverride', RuntimeOverride);
    tightcnc.registerOperation('setFeedMultiplier', SetFeedMultiplierOperation);
};
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUIComponents = function (consoleui) {
    // Automatically add to all jobs created in the console UI
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'jobOptions' implicitly has an 'any' typ... Remove this comment to see the full error message
    consoleui.on('newJobObject', (jobOptions) => {
        if (!jobOptions.gcodeProcessors)
            jobOptions.gcodeProcessors = [];
        jobOptions.gcodeProcessors.push({
            name: 'runtimeoverride',
            options: {},
            order: 950000
        });
    });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'textobj' implicitly has an 'any' type.
    consoleui.modes.jobInfo.hookSync('buildStatusText', (textobj) => {
        let status = consoleui.lastStatus;
        let feedMultiplier = objtools.getPath(status, 'job.gcodeProcessors.runtimeoverride.feedMultiplier');
        if (feedMultiplier && feedMultiplier !== 1) {
            textobj.text += 'Feed multiplier: ' + feedMultiplier + '\n';
        }
    });
    const doFeedOverride = async () => {
        let form = new ListForm(consoleui);
        let mult = await form.showEditor(null, {
            type: 'number',
            required: true,
            label: 'Feed Multiplier',
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'v' implicitly has an 'any' type.
            validate: (v) => {
                if (!v || v < 0)
                    throw new commonSchema.FieldError('invalid', 'Feed multiplier must be a positive number');
            }
        }, objtools.getPath(consoleui, 'lastStatus.job.gcodeProcessors.runtimeoverride.feedMultiplier') || 1);
        if (mult && !form.editorCancelled) {
            await consoleui.client.op('setFeedMultiplier', { feedMultiplier: mult });
        }
    };
    consoleui.modes.jobInfo.registerModeKey(['f'], ['f'], 'Feed Mult.', () => {
        doFeedOverride().catch((err) => consoleui.clientError(err));
    });
};
