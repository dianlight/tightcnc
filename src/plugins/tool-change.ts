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
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Operation'... Remove this comment to see the full error message
const Operation = require('../server/operation');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pasync'.
const pasync = require('pasync');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'JobOption'... Remove this comment to see the full error message
const JobOption = require('../consoleui/job-option');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ListForm'.
const ListForm = require('../consoleui/list-form');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
// Order: Must be after recovery processor
/**
 * This gcode processor can handle software tool changes and job stops.  It can intercept T, M6, M0, M1, and M60
 * and pause the gcode stream, waiting for actions from the UI.  There is also some configuration associated
 * with this in the config file.  Ensure those settings are correct before using.
 *
 * This should go in the gcode processor chain somewhere after a job recovery processor, so tool changes aren't
 * executed for the skipped section of gcode.
 *
 * @class ToolChangeProcessor
 * @param {Object} options - Options for this gcode processor (in addition to the base options)
 *   @param {Boolean} handleT - Whether to intercept T words
 *   @param {Boolean} handleM6 - Whether to intercept M6 words
 *   @param {Boolean} toolChangeOnT - Whether to execute a tool change wait when a T word is seen
 *   @param {Boolean} handleProgramStop - Whether to handle M0, M1, and M60
 *   @param {Boolean} stopSwitch - Whether the optional stop switch is engaged
 */
class ToolChangeProcessor extends GcodeProcessor {
    static DEFAULT_ORDER = 800000;
    constructor(options = {}) {
        super(options, 'toolchange', true);
        (this as any).vm = new GcodeVM(options);
        (this as any).lastToolNumber = null;
        (this as any).stopSwitch = (options as any).stopSwitch || false;
        (this as any).handleT = ('handleT' in options) ? (options as any).handleT : true;
        (this as any).handleM6 = ('handleM6' in options) ? (options as any).handleM6 : true;
        (this as any).toolChangeOnT = ('toolChangeOnT' in options) ? (options as any).toolChangeOnT : true;
        (this as any).handleProgramStop = ('handleProgramStop' in options) ? (options as any).handleProgramStop : true;
        (this as any).programStopWaiter = null;
        (this as any).maxDwell = 0;
        (this as any).currentToolOffset = 0;
        (this as any).toolOffsetAxis = (this as any).tightcnc.config.toolChange.toolOffsetAxis;
        (this as any).toolOffsetAxisLetter = (this as any).tightcnc.controller.axisLabels[(this as any).toolOffsetAxis];
        (this as any).currentlyStopped = false;
    }
    getStatus() {
        return {
            stopped: (this as any).currentlyStopped,
            tool: (this as any).lastToolNumber,
            stopSwitch: (this as any).stopSwitch,
            toolOffset: (this as any).currentToolOffset
        };
    }
    resumeFromStop() {
        if (!(this as any).programStopWaiter)
            throw new XError(XError.INVALID_ARGUMENT, 'Program is not stopped');
        (this as any).programStopWaiter.resolve();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    pushGcode(gline) {
        if (!gline)
            return;
        if (typeof gline === 'string')
            gline = new GcodeLine(gline);
        // handle tool offset by adjusting Z if present
        if ((this as any).currentToolOffset && gline.has((this as any).toolOffsetAxisLetter) && !gline.has('G53')) {
            // by default use positive tool offsets (ie, a larger tool offset means a longer tool and increased Z height)
            gline.set((this as any).toolOffsetAxisLetter, gline.get((this as any).toolOffsetAxisLetter) + (this as any).currentToolOffset * ((this as any).tightcnc.config.toolChange.negateToolOffset ? -1 : 1));
            gline.addComment('to'); // to=tool offset
        }
        super.pushGcode(gline);
        (this as any).vm.runGcodeLine(gline);
        if ((this as any).vm.getState().incremental)
            throw new XError(XError.INTERNAL_ERROR, 'Incremental mode not supported with tool change');
    }
    async _doToolChange() {
        // create a map from axis letters to current position in job
        let vmState = objtools.deepCopy((this as any).vm.getState());
        let controller = (this as any).tightcnc.controller;
        // If spindle/coolant on, turn them off
        let changedMachineProp = false;
        if (controller.spindle) {
            changedMachineProp = true;
            this.pushGcode('M5');
        }
        if (controller.coolant) {
            changedMachineProp = true;
            this.pushGcode('M9');
        }
        let origFeed = controller.feed;
        if (changedMachineProp)
            await controller.waitSync();
        // Run pre-toolchange macro
        let preToolChange = (this as any).tightcnc.config.toolChange.preToolChange;
        await (this as any).tightcnc.runMacro(preToolChange, { pos: vmState.pos }, { gcodeProcessor: this, waitSync: true });
        // Wait for resume
        await this._doProgramStop('tool_change');
        // Run post-toolchange macro
        let postToolChange = (this as any).tightcnc.config.toolChange.postToolChange;
        await (this as any).tightcnc.runMacro(postToolChange, { pos: vmState.pos }, { gcodeProcessor: this, waitSync: true });
        // Restart spindle/coolant
        if (changedMachineProp) {
            let lines = (this as any).vm.syncMachineToState({ vmState: vmState, include: ['spindle', 'coolant'] });
            for (let line of lines)
                this.pushGcode(line);
            await controller.waitSync();
        }
        if (origFeed)
            this.pushGcode('F' + origFeed);
        // Add dwell corresponding to longest seen in job
        if ((this as any).maxDwell)
            this.pushGcode('G4 P' + (this as any).maxDwell);
        // Move to position to restart job
        let moveBackGcode = (vmState.motionMode || 'G0');
        for (let axisNum = 0; axisNum < vmState.pos.length; axisNum++) {
            if (vmState.hasMovedToAxes[axisNum]) {
                moveBackGcode += ' ' + vmState.axisLabels[axisNum].toUpperCase() + vmState.pos[axisNum];
            }
        }
        this.pushGcode(moveBackGcode);
    }
    async _doProgramStop(waitname = 'program_stop') {
        if ((this as any).programStopWaiter)
            return await (this as any).programStopWaiter.promise;
        (this as any).currentlyStopped = waitname;
        (this as any).job.addWait(waitname);
        (this as any).programStopWaiter = pasync.waiter();
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
        const chainerrorListener = (err) => {
            if ((this as any).programStopWaiter) {
                (this as any).programStopWaiter.reject(err);
            }
        };
        (this as any).on('chainerror', chainerrorListener);
        try {
            await (this as any).programStopWaiter.promise;
            (this as any).job.removeWait(waitname);
            (this as any).currentlyStopped = false;
        }
        catch (err) {
            // this should only be reached in the case that a chainerror has already occurred on this stream, so just ignore the error here and let the chainerror propagate
        }
        finally {
            (this as any).programStopWaiter = null;
            (this as any).removeListener('chainerror', chainerrorListener);
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    async processGcode(gline) {
        // Track the tool number
        if (gline.has('T'))
            (this as any).lastToolNumber = gline.get('T');
        // Check if a pause
        if (gline.has('G4') && gline.has('P') && gline.get('P') > (this as any).maxDwell)
            (this as any).maxDwell = gline.get('P');
        // Determine if this line contains an word that will trigger a program stop
        let isToolChange = ((this as any).handleT && (this as any).toolChangeOnT && gline.has('T')) || ((this as any).handleM6 && gline.has('M6'));
        let isProgramStop = (this as any).handleProgramStop && (gline.has('M0') || gline.has('M60') || (gline.has('M1') && (this as any).stopSwitch));
        // Remove from the gline anything we're handling, and add a comment to it
        if ((this as any).handleT && gline.has('T')) {
            gline.remove('T');
            gline.addComment((this as any).toolChangeOnT ? 'tool change' : 'tool sel');
        }
        if ((this as any).handleM6 && gline.has('M6')) {
            gline.remove('M6');
            gline.addComment('tool change');
        }
        if ((this as any).handleProgramStop && (gline.has('M0') || gline.has('M1') || gline.has('M60'))) {
            gline.remove('M0');
            gline.remove('M1');
            gline.remove('M60');
            gline.addComment('pgm stop');
        }
        // If this is a dry run, don't do anything further, just return the gcode line without the program-stop-related words
        if ((this as any).dryRun)
            return gline;
        // Check if this line indicates a program stop we have to handle
        if (isToolChange || isProgramStop) {
            // Flush downstream processors
            await this.flushDownstreamProcessorChain();
            // Wait for controller to sync
            await (this as any).tightcnc.controller.waitSync();
            // Handle the operation
            if (isToolChange)
                await this._doToolChange();
            else if (isProgramStop)
                await this._doProgramStop();
        }
        return gline;
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
class ResumeFromStopOperation extends Operation {
    getParamSchema() {
        return {};
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        findCurrentJobGcodeProcessor((this as any).tightcnc, 'toolchange').resumeFromStop();
        return { success: true };
    }
}
class SetToolOffsetOperation extends Operation {
    getParamSchema() {
        return {
            toolOffset: {
                type: 'number',
                description: 'Tool offset.  If not supplied, use current Z position.'
            },
            accountForAutolevel: {
                type: 'boolean',
                default: true,
                description: 'If true, and an autolevel processor is enabled for this job, use its surface map to adjust for tool length at the current X,Y position.  (Not used if toolOffset is supplied)'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let toolchange = findCurrentJobGcodeProcessor((this as any).tightcnc, 'toolchange');
        if (typeof params.toolOffset === 'number') {
            toolchange.currentToolOffset = params.toolOffset;
        }
        else {
            let controller = (this as any).tightcnc.controller;
            let axisNum = (this as any).tightcnc.config.toolChange.toolOffsetAxis;
            let pos = controller.getPos();
            let off = pos[axisNum];
            if (params.accountForAutolevel) {
                let autolevel = findCurrentJobGcodeProcessor((this as any).tightcnc, 'autolevel', false);
                if (autolevel && autolevel.surfaceMap && axisNum === 2) {
                    let surfaceOffset = autolevel.surfaceMap.predictZ(pos.slice(0, 2));
                    if (typeof surfaceOffset === 'number') {
                        off -= surfaceOffset;
                    }
                }
            }
            toolchange.currentToolOffset = off;
        }
        return { success: true };
    }
}
module.exports.ToolChangeProcessor = ToolChangeProcessor;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerServerComponents = function (tightcnc) {
    tightcnc.registerGcodeProcessor('toolchange', ToolChangeProcessor);
    tightcnc.registerOperation('resumeFromStop', ResumeFromStopOperation);
    tightcnc.registerOperation('setToolOffset', SetToolOffsetOperation);
};
class ToolChangeConsoleUIJobOption extends JobOption {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui) {
        super(consoleui);
        (this as any).tcOptions = {
            handleToolChange: false,
            handleJobStop: true,
            toolChangeOnM6: true,
            toolChangeOnT: true,
            stopSwitch: false
        };
    }
    async optionSelected() {
        let formSchema = {
            label: 'Tool Change / Job Stop Settings',
            type: 'object',
            properties: {
                handleToolChange: {
                    type: 'boolean',
                    default: (this as any).tcOptions.handleToolChange,
                    label: 'Handle tool change (T/M6)'
                },
                handleJobStop: {
                    type: 'boolean',
                    default: (this as any).tcOptions.handleJobStop,
                    label: 'Handle job stop (M0/M1)'
                },
                toolChangeOnM6: {
                    type: 'boolean',
                    default: (this as any).tcOptions.toolChangeOnM6,
                    label: 'Tool change on M6'
                },
                toolChangeOnT: {
                    type: 'boolean',
                    default: (this as any).tcOptions.toolChangeOnT,
                    label: 'Tool change on T'
                },
                stopSwitch: {
                    type: 'boolean',
                    default: (this as any).tcOptions.stopSwitch,
                    label: 'Optional stop switch engaged'
                }
            }
        };
        let form = new ListForm((this as any).consoleui);
        let r = await form.showEditor(null, formSchema, (this as any).alOptions);
        if (r !== null)
            (this as any).tcOptions = r;
        (this as any).newJobMode.updateJobInfoText();
    }
    getDisplayString() {
        let strs = [];
        if ((this as any).tcOptions.handleToolChange) {
            let tcTypes = [];
            if ((this as any).tcOptions.toolChangeOnM6)
                tcTypes.push('M6');
            if ((this as any).tcOptions.toolChangeOnT)
                tcTypes.push('T');
            strs.push('Tool Change Handling (' + tcTypes.join(',') + ')');
        }
        if ((this as any).tcOptions.handleJobStop) {
            strs.push('Job Stop Handling');
        }
        return strs.join('\n') || null;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'obj' implicitly has an 'any' type.
    addToJobOptions(obj) {
        if ((this as any).tcOptions.handleToolChange || (this as any).tcOptions.handleJobStop) {
            if (!obj.gcodeProcessors)
                obj.gcodeProcessors = [];
            obj.gcodeProcessors.push({
                name: 'toolchange',
                options: {
                    handleT: true,
                    handleM6: (this as any).tcOptions.toolChangeOnM6,
                    toolChangeOnT: (this as any).tcOptions.toolChangeOnT,
                    handleProgramStop: (this as any).tcOptions.handleJobStop,
                    stopSwitch: (this as any).tcOptions.stopSwitch
                },
                order: 800000
            });
        }
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUIComponents = function (consoleui) {
    consoleui.registerJobOption('Tool Change / Job Stop', ToolChangeConsoleUIJobOption);
    const doToolOffset = async () => {
        let selected = await new ListForm(consoleui).selector(null, 'Set Tool Offset', ['Specify Offset', 'From Current Pos']);
        if (selected === 0) {
            let offset = await new ListForm(consoleui).showEditor(consoleui.mainPane, {
                type: 'number',
                default: 0,
                required: true,
                label: 'Tool Offset'
            });
            if (typeof offset === 'number') {
                await consoleui.runWithWait(async () => {
                    await consoleui.client.op('setToolOffset', {
                        toolOffset: offset
                    });
                });
            }
        }
        else if (selected === 1) {
            await consoleui.runWithWait(async () => {
                await consoleui.client.op('setToolOffset', {});
            });
        }
    };
    let offsetSelectedSinceToolChange = false;
    let lastJobWaitingBool = false;
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'mkeys' implicitly has type 'any[]' in so... Remove this comment to see the full error message
    let mkeys = [];
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    const doResumeFromStop = async (jobWaiting) => {
        if (jobWaiting === 'tool_change' && !offsetSelectedSinceToolChange) {
            let confirmed = await consoleui.showConfirm('No tool offset selected.  Press Esc to go back or Enter to continue anyway.');
            if (!confirmed)
                return;
        }
        await consoleui.runWithWait(async () => {
            await consoleui.client.op('resumeFromStop', {});
        });
        offsetSelectedSinceToolChange = false;
    };
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'textobj' implicitly has an 'any' type.
    consoleui.modes.jobInfo.hookSync('buildStatusText', (textobj) => {
        let status = consoleui.lastStatus;
        let jobWaiting = (status.job && status.job.state === 'waiting' && status.job.waits[0]) || false;
        if (jobWaiting === 'tool_change') {
            let toolNum = objtools.getPath(status, 'job.gcodeProcessors.toolchange.tool');
            textobj.text += '\n{blue-bg}Waiting for Tool Change{/blue-bg}\n';
            if (toolNum !== null && toolNum !== undefined) {
                textobj.text += 'Tool number: ' + toolNum + '\n';
            }
            textobj.text += 'Press c after changing tool.\n';
        }
        if (jobWaiting === 'program_stop') {
            textobj.text += '\n{blue-bg}Program Stop{/blue-bg}\nPress c to continue from stop.\n';
        }
    });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'status' implicitly has an 'any' type.
    consoleui.on('statusUpdate', (status) => {
        let jobWaiting = (status.job && status.job.state === 'waiting' && status.job.waits[0]) || false;
        if (!!jobWaiting !== lastJobWaitingBool) {
            if (jobWaiting) {
                let mkey;
                mkey = consoleui.modes.jobInfo.registerModeKey(['c'], ['c'], 'Continue', () => {
                    doResumeFromStop(jobWaiting).catch((err) => consoleui.clientError(err));
                });
                mkeys.push(mkey);
                if (jobWaiting === 'tool_change') {
                    mkey = consoleui.modes.jobInfo.registerModeKey(['t'], ['t'], 'Tool Offset', () => {
                        doToolOffset().catch((err) => consoleui.clientError(err));
                        offsetSelectedSinceToolChange = true;
                    });
                    mkeys.push(mkey);
                }
            }
            else if (mkeys.length) {
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'mkeys' implicitly has an 'any[]' type.
                for (let mkey of mkeys) {
                    consoleui.modes.jobInfo.removeModeKey(mkey);
                }
                mkeys = [];
                offsetSelectedSinceToolChange = false;
            }
            lastJobWaitingBool = !!jobWaiting;
        }
    });
};
