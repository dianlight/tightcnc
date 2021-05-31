// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'CrispHooks... Remove this comment to see the full error message
const CrispHooks = require('crisphooks');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ConsoleUIM... Remove this comment to see the full error message
class ConsoleUIMode extends CrispHooks {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui) {
        super();
        (this as any).consoleui = consoleui;
        (this as any).modeHints = [];
        (this as any).activeModeHints = [];
        (this as any).modeIsActive = false;
        (this as any).box = blessed.box({
            width: '100%',
            height: '100%',
            tags: true
        });
    }
    /**
     * Called once all modes have been registered, in registration order.
     */
    init() {
    }
    /**
     * Registers a hint to be automatically activated when the mode is activated, and deactivated when the mode is exited.
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keyNames' implicitly has an 'any' type.
    registerModeHint(keyNames, label, order = 1000) {
        let pos = (this as any).modeHints.length;
        for (let i = 0; i < (this as any).modeHints.length; i++) {
            if ((this as any).modeHints[i].order > order) {
                pos = i;
                break;
            }
        }
        (this as any).modeHints.splice(pos, 0, { keyNames, label, order });
        this._refreshModeHints();
        return (this as any).modeHints[pos];
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'hint' implicitly has an 'any' type.
    removeModeHint(hint) {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
        (this as any).modeHints = (this as any).modeHints.filter((h) => h !== hint);
        this._refreshModeHints();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keys' implicitly has an 'any' type.
    registerModeKey(keys, keyNames, keyLabel, fn, order = 1000) {
        if (!Array.isArray(keys))
            keys = [keys];
        let hint = this.registerModeHint(keyNames, keyLabel, order);
        (this as any).box.key(keys, fn);
        return { hint, keys, fn };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'mkey' implicitly has an 'any' type.
    removeModeKey(mkey) {
        this.removeModeHint(mkey.hint);
        (this as any).box.unkey(mkey.keys, mkey.fn);
    }
    _refreshModeHints() {
        if (!(this as any).modeIsActive)
            return;
        for (let hint of (this as any).activeModeHints) {
            (this as any).consoleui.removeHint(hint);
        }
        (this as any).activeModeHints = [];
        for (let modeHint of (this as any).modeHints) {
            let hint = (this as any).consoleui.addHint(modeHint.keyNames, modeHint.label);
            (this as any).activeModeHints.push(hint);
        }
    }
    /**
     * Called by ConsoleUI() as part of mode activation.  Responsible for filling consoleui.mainPane.
     */
    activateMode() {
        for (let modeHint of (this as any).modeHints) {
            let hint = (this as any).consoleui.addHint(modeHint.keyNames, modeHint.label);
            (this as any).activeModeHints.push(hint);
        }
        (this as any).consoleui.mainPane.append((this as any).box);
        (this as any).box.focus();
        (this as any).modeIsActive = true;
    }
    /**
     * Called by ConsoleUI when the mode is exited.  Must clean up after the mode.
     */
    exitMode() {
        (this as any).modeIsActive = false;
        for (let hint of (this as any).activeModeHints) {
            (this as any).consoleui.removeHint(hint);
        }
        (this as any).activeModeHints = [];
        (this as any).consoleui.mainPane.remove((this as any).box);
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = ConsoleUIMode;
