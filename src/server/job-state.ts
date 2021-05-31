import EventEmitter from 'events';
import objtools from 'objtools';
/**
 * This class tracks the state of a running job or dry run.  It's mostly just a collection of properties
 * managed by JobManager.  It can also emit the events 'start', 'complete' and 'error' (also managed by JobManager).
 *
 * @class JobState
 */
export default class JobState extends EventEmitter {

    state = 'initializing';
    tartTime = new Date().toISOString();
    _hasFinished = false;
    waitList = [];
    sourceStream: any;
    gcodeProcessors: any;

    constructor(props = {}) {
        super();
        // this is a list of values that the job is currently "waiting" for.  these waits are managed by gcode processors, and must be
        // added and removed by the gcode processor.  the values themselves don't mean anything.  as long as there's at least one
        // entry in this wait list, the job status is returned as "waiting"
        
        for (let key in props) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            this[key] = props[key];
        }
        // add a handler for 'error' so the default handler (exit program) doesn't happen
        this.on('error', () => { });
    }
    emitJobStart() {
        if (this._hasFinished)
            return;
        this.emit('start');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
    emitJobError(err) {
        if (this._hasFinished)
            return;
        this._hasFinished = true;
        this.emit('error', err);
    }
    emitJobComplete() {
        if (this._hasFinished)
            return;
        this._hasFinished = true;
        this.emit('complete');
    }
    addWait(val:never) {
        this.waitList.push(val);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
    removeWait(val) {
        this.waitList = this.waitList.filter((a) => !objtools.deepEquals(a, val));
    }
}