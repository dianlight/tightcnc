// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'EventEmitt... Remove this comment to see the full error message
const EventEmitter = require('events');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'objtools'.
const objtools = require('objtools');
/**
 * This class tracks the state of a running job or dry run.  It's mostly just a collection of properties
 * managed by JobManager.  It can also emit the events 'start', 'complete' and 'error' (also managed by JobManager).
 *
 * @class JobState
 */
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'JobState'.
class JobState extends EventEmitter {
    constructor(props = {}) {
        super();
        (this as any).state = 'initializing';
        (this as any).startTime = new Date().toISOString();
        (this as any)._hasFinished = false;
        // this is a list of values that the job is currently "waiting" for.  these waits are managed by gcode processors, and must be
        // added and removed by the gcode processor.  the values themselves don't mean anything.  as long as there's at least one
        // entry in this wait list, the job status is returned as "waiting"
        (this as any).waitList = [];
        for (let key in props) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            this[key] = props[key];
        }
        // add a handler for 'error' so the default handler (exit program) doesn't happen
        (this as any).on('error', () => { });
    }
    emitJobStart() {
        if ((this as any)._hasFinished)
            return;
        (this as any).emit('start');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
    emitJobError(err) {
        if ((this as any)._hasFinished)
            return;
        (this as any)._hasFinished = true;
        (this as any).emit('error', err);
    }
    emitJobComplete() {
        if ((this as any)._hasFinished)
            return;
        (this as any)._hasFinished = true;
        (this as any).emit('complete');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
    addWait(val) {
        (this as any).waitList.push(val);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
    removeWait(val) {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
        (this as any).waitList = (this as any).waitList.filter((a) => !objtools.deepEquals(a, val));
    }
}
module.exports = JobState;
