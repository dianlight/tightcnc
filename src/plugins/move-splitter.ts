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
/**
 * This gcode processor will split long linear moves into a series of shorter ones.
 *
 * @class MoveSplitter
 * @constructor
 * @param {Object} options
 *   @param {Number} options.maxMoveLength=10
 */
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'MoveSplitt... Remove this comment to see the full error message
class MoveSplitter extends GcodeProcessor {
    constructor(options = {}) {
        super(options, 'movesplitter', true);
        (this as any).maxMoveLength = (options as any).maxMoveLength || 10;
        (this as any).vm = new GcodeVM(options);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    processGcode(gline) {
        let startVMState = objtools.deepCopy((this as any).vm.getState());
        // Run the line through the gcode VM
        let { isMotion, changedCoordOffsets, motionCode } = (this as any).vm.runGcodeLine(gline);
        // Make sure the line represents motion
        if (!isMotion)
            return gline;
        // If anything regarding changing coordinate systems has changed, ignore the line
        if (changedCoordOffsets || gline.has('G53'))
            return gline;
        // Get position diffs for all changed axes
        let endVMState = (this as any).vm.getState();
        let axisDiffs = [];
        let numChangedAxes = 0;
        for (let axisNum = 0; axisNum < startVMState.pos.length; axisNum++) {
            if (startVMState.pos[axisNum] !== endVMState.pos[axisNum]) {
                // Moved on this axis
                // If we've never gotten definitive positions for this axis before, ignore the line
                if (!startVMState.hasMovedToAxes[axisNum])
                    return gline;
                axisDiffs.push(endVMState.pos[axisNum] - startVMState.pos[axisNum]);
                numChangedAxes++;
            }
            else {
                axisDiffs.push(0);
            }
        }
        if (!numChangedAxes)
            return gline; // nothing actually moved
        // Make sure we're not in incremental mode
        if (endVMState.incremental)
            return gline; // incremental mode not supported
        // Make sure the motion mode is one of the supported motion modes
        if (motionCode !== 'G0' && motionCode !== 'G1')
            return gline;
        // Calculate the distance moved and check if it's above the threshold
        let dist = 0;
        for (let p of axisDiffs) {
            dist += p * p;
        }
        dist = Math.sqrt(dist);
        if (dist <= (this as any).maxMoveLength)
            return gline;
        // This is a move that needs to be split up.
        // Output a version of the original gline without any of the coordinates specified, to set any other modes it may be setting (including feed)
        for (let i = 0; i < axisDiffs.length; i++) {
            gline.set(endVMState.axisLabels[i], null);
        }
        // don't send if line is now empty, or only contains the motion gcode
        if (gline.words.length > 1 || (gline.words.length === 1 && 'G' + gline.get('G') !== motionCode) || gline.comment) {
            gline.addComment('sp');
            this.pushGcode(gline);
        }
        else {
            let l = new GcodeLine();
            l.addComment('sp');
            (this as any).push(l);
        }
        // Output movement segments
        let numMoves = Math.ceil(dist / (this as any).maxMoveLength);
        for (let i = 0; i < numMoves; i++) {
            let newgline = new GcodeLine(motionCode);
            newgline.addComment('sp+');
            for (let axisNum = 0; axisNum < axisDiffs.length; axisNum++) {
                if (axisDiffs[axisNum]) {
                    let moveAxisDiff = (i + 1) * axisDiffs[axisNum] / numMoves;
                    let moveAxisCoord = startVMState.pos[axisNum] + moveAxisDiff;
                    newgline.set(startVMState.axisLabels[axisNum], moveAxisCoord);
                }
            }
            this.pushGcode(newgline);
        }
        return undefined;
    }
}
module.exports.MoveSplitter = MoveSplitter;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerServerComponents = function (tightcnc) {
    tightcnc.registerGcodeProcessor('movesplitter', MoveSplitter);
};
