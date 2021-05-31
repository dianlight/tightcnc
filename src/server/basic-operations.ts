// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Operation'... Remove this comment to see the full error message
const Operation = require('./operation');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'objtools'.
const objtools = require('objtools');
class OpGetStatus extends Operation {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        if (params.sync) {
            await (this as any).tightcnc.controller.waitSync();
        }
        let fields = params && params.fields;
        let stat = await (this as any).tightcnc.getStatus();
        if (!fields)
            return stat;
        let ret = {};
        for (let field of fields) {
            let val = objtools.getPath(stat, field);
            if (val !== undefined)
                objtools.setPath(ret, field, val);
        }
        return ret;
    }
    getParamSchema() {
        return {
            fields: {
                type: 'array',
                elements: String,
                description: 'List of status fields to return.'
            },
            sync: {
                type: 'boolean',
                default: false,
                description: 'Whether to wait for machine to stop and all commands to be processed before returning status'
            }
        };
    }
}
class OpSend extends Operation {
    getParamSchema() {
        return {
            line: { type: String, required: true, description: 'Line of gcode to send' },
            wait: { type: Boolean, default: false, description: 'Whether to wait for the line to be received' }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        if (params.wait) {
            (this as any).tightcnc.controller.send(params.line);
            await (this as any).tightcnc.controller.waitSync();
        }
        else {
            (this as any).tightcnc.controller.send(params.line);
        }
    }
}
class OpHold extends Operation {
    getParamSchema() { return {}; }
    run() {
        (this as any).tightcnc.controller.hold();
    }
}
class OpResume extends Operation {
    getParamSchema() { return {}; }
    run() {
        (this as any).tightcnc.controller.resume();
    }
}
class OpCancel extends Operation {
    getParamSchema() { return {}; }
    run() {
        (this as any).tightcnc.controller.cancel();
        (this as any).tightcnc.cancelInput();
    }
}
class OpReset extends Operation {
    getParamSchema() { return {}; }
    run() {
        (this as any).tightcnc.controller.reset();
    }
}
class OpClearError extends Operation {
    getParamSchema() { return {}; }
    run() {
        (this as any).tightcnc.controller.clearError();
    }
}
class OpRealTimeMove extends Operation {
    getParamSchema() {
        return {
            axis: {
                type: Number,
                required: true,
                description: 'Axis number to move'
            },
            inc: {
                type: Number,
                required: true,
                description: 'Amount to move the axis'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    run(params) {
        (this as any).checkReady();
        (this as any).tightcnc.controller.realTimeMove(params.axis, params.inc);
    }
}
class OpMove extends Operation {
    getParamSchema() {
        return {
            pos: {
                type: 'array',
                elements: Number,
                required: true,
                description: 'Position to move to'
            },
            feed: {
                type: Number,
                description: 'Feed rate'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        (this as any).checkReady();
        await (this as any).tightcnc.controller.move(params.pos, params.feed);
    }
}
class OpHome extends Operation {
    getParamSchema() {
        return {
            axes: {
                type: 'array',
                elements: Boolean,
                description: 'True for each axis to home.  False for axes not to home.'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        (this as any).checkReady();
        await (this as any).tightcnc.controller.home(params.axes);
    }
}
class OpSetAbsolutePos extends Operation {
    getParamSchema() {
        return {
            pos: {
                type: 'array',
                elements: {
                    type: 'or',
                    alternatives: [
                        { type: Number },
                        { type: Boolean }
                    ]
                },
                description: 'Positions of axes to set.  If null, 0 is used for all axes.  Elements can also be true (synonym for 0) or false (to ignore that axis).'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let pos = params.pos;
        await (this as any).tightcnc.controller.waitSync();
        if (!pos) {
            pos = [];
            for (let axisNum = 0; axisNum < (this as any).tightcnc.controller.usedAxes.length; axisNum++) {
                if ((this as any).tightcnc.controller.usedAxes[axisNum]) {
                    pos.push(0);
                }
                else {
                    pos.push(false);
                }
            }
        }
        else {
            for (let axisNum = 0; axisNum < pos.length; axisNum++) {
                if (pos[axisNum] === true)
                    pos[axisNum] = 0;
            }
        }
        let gcode = 'G28.3';
        for (let axisNum of (this as any).tightcnc.controller.listUsedAxisNumbers()) {
            let axis = (this as any).tightcnc.controller.axisLabels[axisNum].toUpperCase();
            if (typeof pos[axisNum] === 'number') {
                gcode += ' ' + axis + pos[axisNum];
            }
        }
        await (this as any).tightcnc.controller.send(gcode);
        await (this as any).tightcnc.controller.waitSync();
    }
}
class OpProbe extends Operation {
    getParamSchema() {
        return {
            pos: {
                type: 'array',
                elements: Number,
                required: true,
                description: 'Position to probe to'
            },
            feed: {
                type: Number,
                description: 'Feed rate'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        (this as any).checkReady();
        return await (this as any).tightcnc.controller.probe(params.pos, params.feed);
    }
}
class OpSetOrigin extends Operation {
    getParamSchema() {
        return {
            coordSys: {
                type: Number,
                description: 'Coordinate system to set origin for; 0 = G54.  If null, current coord sys is used.'
            },
            pos: {
                type: 'array',
                elements: {
                    type: 'or',
                    alternatives: [
                        { type: Number },
                        { type: Boolean }
                    ]
                },
                description: 'Position offsets of new origin.  If null, current position is used.  Elements can also be true (to use current position for that axis) or false (to ignore that axis).'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let pos = params.pos;
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'c' implicitly has an 'any' type.
        let posHasBooleans = pos && pos.some((c) => typeof c === 'boolean');
        if (!pos || posHasBooleans || typeof params.coordSys !== 'number') {
            await (this as any).tightcnc.controller.waitSync();
        }
        if (!pos) {
            pos = (this as any).tightcnc.controller.mpos;
        }
        else {
            for (let axisNum = 0; axisNum < pos.length; axisNum++) {
                if (pos[axisNum] === true)
                    pos[axisNum] = (this as any).tightcnc.controller.mpos[axisNum];
            }
        }
        let coordSys = params.coordSys;
        if (typeof params.coordSys !== 'number') {
            coordSys = (this as any).tightcnc.controller.activeCoordSys || 0;
        }
        let gcode = 'G10 L2 P' + (coordSys + 1);
        for (let axisNum of (this as any).tightcnc.controller.listUsedAxisNumbers()) {
            let axis = (this as any).tightcnc.controller.axisLabels[axisNum].toUpperCase();
            if (typeof pos[axisNum] === 'number') {
                gcode += ' ' + axis + pos[axisNum];
            }
        }
        await (this as any).tightcnc.controller.send(gcode);
        await (this as any).tightcnc.controller.waitSync();
    }
}
class OpWaitSync extends Operation {
    getParamSchema() {
        return {};
    }
    async run() {
        await (this as any).tightcnc.controller.waitSync();
    }
}
class OpGetLog extends Operation {
    getParamSchema() {
        return {
            logType: {
                type: String,
                required: true,
                default: 'comms',
                enum: ['comms', 'message'],
                description: 'Which log to fetch'
            },
            start: {
                type: Number,
                description: 'Starting line to fetch.'
            },
            end: {
                type: Number,
                description: 'Ending line to fetch.'
            },
            limit: {
                type: Number,
                description: 'Max number to return.'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let logger;
        if (params.logType === 'comms') {
            logger = (this as any).tightcnc.loggerMem;
        }
        else if (params.logType === 'message') {
            logger = (this as any).tightcnc.messageLog;
        }
        else {
            throw new XError(XError.INVALID_ARGUMENT, 'Bad log type');
        }
        return logger.section(params.start, params.end, params.limit);
    }
}
class OpProvideInput extends Operation {
    getParamSchema() {
        return {
            inputId: {
                type: Number,
                required: true,
                description: 'ID of the input being waited for'
            },
            value: {
                type: 'mixed',
                required: true,
                description: 'Value of the input to provide'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    run(params) {
        if ((this as any).tightcnc.waitingForInput && (this as any).tightcnc.waitingForInput.id === params.inputId) {
            (this as any).tightcnc.provideInput(params.value);
        }
        else {
            throw new XError(XError.BAD_REQUEST, 'Not waiting on input');
        }
    }
}
class OpCancelInput extends Operation {
    getParamSchema() {
        return {
            inputId: {
                type: Number,
                required: true,
                description: 'ID of the input being waited for'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    run(params) {
        if ((this as any).tightcnc.waitingForInput && (this as any).tightcnc.waitingForInput.id === params.inputId) {
            (this as any).tightcnc.cancelInput();
        }
        else {
            throw new XError(XError.BAD_REQUEST, 'Not waiting on input');
        }
    }
}
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
function registerOperations(tightcnc) {
    tightcnc.registerOperation('getStatus', OpGetStatus);
    tightcnc.registerOperation('send', OpSend);
    tightcnc.registerOperation('hold', OpHold);
    tightcnc.registerOperation('resume', OpResume);
    tightcnc.registerOperation('cancel', OpCancel);
    tightcnc.registerOperation('reset', OpReset);
    tightcnc.registerOperation('clearError', OpClearError);
    tightcnc.registerOperation('realTimeMove', OpRealTimeMove);
    tightcnc.registerOperation('move', OpMove);
    tightcnc.registerOperation('home', OpHome);
    tightcnc.registerOperation('setAbsolutePos', OpSetAbsolutePos);
    tightcnc.registerOperation('probe', OpProbe);
    tightcnc.registerOperation('setOrigin', OpSetOrigin);
    tightcnc.registerOperation('waitSync', OpWaitSync);
    tightcnc.registerOperation('getLog', OpGetLog);
    tightcnc.registerOperation('provideInput', OpProvideInput);
    tightcnc.registerOperation('cancelInput', OpCancelInput);
}
module.exports = registerOperations;
