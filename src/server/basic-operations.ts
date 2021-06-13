import  Operation from './operation';
import objtools from 'objtools';
//import XError from 'xerror';
import { errRegistry } from './errRegistry';
import TightCNCServer, { StatusObject } from './tightcnc-server';

class OpGetStatus extends Operation {
    async run(params: {
        fields: string[],
        sync?: boolean
    }):Promise<Partial<StatusObject>> {
        if (params.sync) {
            await this.tightcnc.controller?.waitSync();
        }
        let fields = params && params.fields;
        let stat = await this.tightcnc.getStatus();
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
    /*
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
    */
}
class OpSend extends Operation {
    /*
    getParamSchema() {
        return {
            line: { type: String, required: true, description: 'Line of gcode to send' },
            wait: { type: Boolean, default: false, description: 'Whether to wait for the line to be received' }
        };
    }
    */
    async run(params:{line: string, wait?:boolean}) {
        if (params.wait) {
            this.tightcnc.controller?.send(params.line);
            await this.tightcnc.controller?.waitSync();
        }
        else {
            this.tightcnc.controller?.send(params.line);
        }
    }
}
class OpHold extends Operation {
    //getParamSchema() { return {}; }
    run() {
        this.tightcnc.controller?.hold();
    }
}
class OpResume extends Operation {
    //getParamSchema() { return {}; }
    run() {
        this.tightcnc.controller?.resume();
    }
}
class OpCancel extends Operation {
    //getParamSchema() { return {}; }
    run() {
        this.tightcnc.controller?.cancel();
        this.tightcnc.cancelInput();
    }
}
class OpReset extends Operation {
    //getParamSchema() { return {}; }
    run() {
        this.tightcnc.controller?.reset();
    }
}
class OpClearError extends Operation {
    //getParamSchema() { return {}; }
    run() {
        this.tightcnc.controller?.clearError();
    }
}
class OpRealTimeMove extends Operation {
    /*
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
    */
    run(params:{axis:number, inc:number}) {
        this.checkReady();
        this.tightcnc.controller?.realTimeMove(params.axis, params.inc);
    }
}
class OpMove extends Operation {
    /*
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
    */
    async run(params:{pos:number[],feed?:number}) {
        this.checkReady();
        await this.tightcnc.controller?.move(params.pos, params.feed);
    }
}
class OpHome extends Operation {
    /*
    getParamSchema() {
        return {
            axes: {
                type: 'array',
                elements: Boolean,
                description: 'True for each axis to home.  False for axes not to home.'
            }
        };
    }
    */
    async run(params:{axes:boolean[]}) {
        this.checkReady();
        await this.tightcnc.controller?.home(params.axes);
    }
}
class OpSetAbsolutePos extends Operation {
    /*
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
    */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let pos = params.pos;
        await this.tightcnc.controller?.waitSync();
        if (!pos) {
            pos = [];
            for (let axisNum = 0; axisNum < this.tightcnc.controller!.usedAxes.length; axisNum++) {
                if (this.tightcnc.controller!.usedAxes[axisNum]) {
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
        if(this.tightcnc.controller) for (let axisNum of this.tightcnc.controller.listUsedAxisNumbers()) {
            let axis = this.tightcnc.controller!.axisLabels[axisNum].toUpperCase();
            if (typeof pos[axisNum] === 'number') {
                gcode += ' ' + axis + pos[axisNum];
            }
        }
        await this.tightcnc.controller?.send(gcode);
        await this.tightcnc.controller?.waitSync();
    }
}
class OpProbe extends Operation {
    /*
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
    */
    async run(params:{pos:number[],feed?:number}) {
        this.checkReady();
        return await this.tightcnc.controller?.probe(params.pos, params.feed);
    }
}
class OpSetOrigin extends Operation {
    /*
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
    */
    async run(params:{coordSys?:number,pos?:(number|boolean)[]}) {
        let pos = params.pos;
        let posHasBooleans = pos && pos.some((c) => typeof c === 'boolean');
        if (!pos || posHasBooleans || !params.coordSys) {
            await this.tightcnc.controller?.waitSync();
        }
        if (!pos) {
            pos = this.tightcnc.controller!.mpos;
        }
        else {
            for (let axisNum = 0; axisNum < pos.length; axisNum++) {
                if (pos[axisNum] === true)
                    pos[axisNum] = this.tightcnc.controller!.mpos[axisNum];
            }
        }
        let coordSys = params.coordSys || this.tightcnc.controller!.activeCoordSys || 0;
        let gcode = 'G10 L2 P' + (coordSys + 1);
        if(this.tightcnc.controller) for (let axisNum of this.tightcnc.controller.listUsedAxisNumbers()) {
            let axis = this.tightcnc.controller?.axisLabels[axisNum].toUpperCase();
            if (typeof pos[axisNum] === 'number') {
                gcode += ' ' + axis + pos[axisNum];
            }
        }
        await this.tightcnc.controller?.send(gcode);
        await this.tightcnc.controller?.waitSync();
    }
}

class OpWaitSync extends Operation {
    /*
    override getParamSchema() {
        return {};
    }
    */
    override async run() {
        await this.tightcnc.controller?.waitSync();
    }
}
class OpGetLog extends Operation {
    /*
    override getParamSchema() {
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
    */
    override async run(params:{logType:'comms'|'message',start:number,end:number,limit:number}) {
        let logger;
        if (params.logType === 'comms') {
            logger = this.tightcnc.loggerMem;
        }
        else if (params.logType === 'message') {
            logger = this.tightcnc.messageLog;
        }
        else {
            throw errRegistry.newError('INTERNAL_SERVER_ERROR','INVALID_ARGUMENT').formatMessage('Bad log type');
        }
        return logger?.section(params.start, params.end, params.limit);
    }
}
class OpProvideInput extends Operation {
    /*
    override getParamSchema() {
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
    */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    run(params) {
        if (this.tightcnc.waitingForInput && this.tightcnc.waitingForInput.id === params.inputId) {
            this.tightcnc.provideInput(params.value);
        }
        else {
            throw errRegistry.newError('INTERNAL_SERVER_ERROR','BAD_REQUEST').formatMessage('Not waiting on input');
        }
    }
}
class OpCancelInput extends Operation {
    /*
    override getParamSchema() {
        return {
            inputId: {
                type: Number,
                required: true,
                description: 'ID of the input being waited for'
            }
        };
    }
    */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    run(params) {
        if (this.tightcnc.waitingForInput && this.tightcnc.waitingForInput.id === params.inputId) {
            this.tightcnc.cancelInput();
        }
        else {
            throw errRegistry.newError('INTERNAL_SERVER_ERROR','BAD_REQUEST').formatMessage('Not waiting on input')
        }
    }
}
export default function registerOperations(tightcnc: TightCNCServer) {
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
