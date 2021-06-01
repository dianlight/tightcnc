import ConsoleUIMode from './consoleui-mode';
import blessed from 'blessed';
export default class ModeHome extends ConsoleUIMode {
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
        this.box.append(text);
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
export function registerConsoleUI(consoleui:ConsoleUI) {
    consoleui.registerMode('home', new ModeHome(consoleui));
};
