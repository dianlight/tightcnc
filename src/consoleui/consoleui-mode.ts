import blessed from 'blessed';
import CrispHooks from 'crisphooks';
export default class ConsoleUIMode extends CrispHooks {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui:ConsoleUI) {
        super();
        this.consoleui = consoleui;
        this.modeHints = [];
        this.activeModeHints = [];
        this.modeIsActive = false;
        this.box = blessed.box({
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
        let pos = this.modeHints.length;
        for (let i = 0; i < this.modeHints.length; i++) {
            if (this.modeHints[i].order > order) {
                pos = i;
                break;
            }
        }
        this.modeHints.splice(pos, 0, { keyNames, label, order });
        this._refreshModeHints();
        return this.modeHints[pos];
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'hint' implicitly has an 'any' type.
    removeModeHint(hint) {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
        this.modeHints = this.modeHints.filter((h) => h !== hint);
        this._refreshModeHints();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keys' implicitly has an 'any' type.
    registerModeKey(keys, keyNames, keyLabel, fn, order = 1000) {
        if (!Array.isArray(keys))
            keys = [keys];
        let hint = this.registerModeHint(keyNames, keyLabel, order);
        this.box.key(keys, fn);
        return { hint, keys, fn };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'mkey' implicitly has an 'any' type.
    removeModeKey(mkey) {
        this.removeModeHint(mkey.hint);
        this.box.unkey(mkey.keys, mkey.fn);
    }
    _refreshModeHints() {
        if (!this.modeIsActive)
            return;
        for (let hint of this.activeModeHints) {
            this.consoleui.removeHint(hint);
        }
        this.activeModeHints = [];
        for (let modeHint of this.modeHints) {
            let hint = this.consoleui.addHint(modeHint.keyNames, modeHint.label);
            this.activeModeHints.push(hint);
        }
    }
    /**
     * Called by ConsoleUI() as part of mode activation.  Responsible for filling consoleui.mainPane.
     */
    activateMode() {
        for (let modeHint of this.modeHints) {
            let hint = this.consoleui.addHint(modeHint.keyNames, modeHint.label);
            this.activeModeHints.push(hint);
        }
        this.consoleui.mainPane.append(this.box);
        this.box.focus();
        this.modeIsActive = true;
    }
    /**
     * Called by ConsoleUI when the mode is exited.  Must clean up after the mode.
     */
    exitMode() {
        this.modeIsActive = false;
        for (let hint of this.activeModeHints) {
            this.consoleui.removeHint(hint);
        }
        this.activeModeHints = [];
        this.consoleui.mainPane.remove(this.box);
    }
}
