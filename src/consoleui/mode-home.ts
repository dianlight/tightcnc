// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ConsoleUIM... Remove this comment to see the full error message
const ConsoleUIMode = require('./consoleui-mode');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
class ModeHome extends ConsoleUIMode {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui) {
        super(consoleui);
    }
    init() {
        super.init();
        //this.box.setContent('Home screen');
        let text = blessed.box({
            top: '50%',
            width: '100%',
            height: '100%',
            content: 'TightCNC ConsoleUI',
            align: 'center'
        });
        (this as any).box.append(text);
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'process'. Do you need to install... Remove this comment to see the full error message
        this.registerHomeKey(['escape', 'q'], 'Esc', 'Exit', () => process.exit(0), 0);
    }
    activateMode() {
        super.activateMode();
    }
    exitMode() {
        super.exitMode();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keys' implicitly has an 'any' type.
    registerHomeKey(keys, keyNames, keyLabel, fn, order = 1000) {
        return this.registerModeKey(keys, keyNames, keyLabel, fn, order);
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = ModeHome;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUI = function (consoleui) {
    consoleui.registerMode('home', new ModeHome(consoleui));
};
