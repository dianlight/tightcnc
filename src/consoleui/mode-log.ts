// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ConsoleUIM... Remove this comment to see the full error message
const ConsoleUIMode = require('./consoleui-mode');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
class ModeLog extends ConsoleUIMode {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui) {
        super(consoleui);
        (this as any).updateLoopRunning = false;
        (this as any).modeActive = false;
        (this as any).logConfig = consoleui.config.consoleui.log;
        (this as any).lastLineNum = null;
        (this as any).logStr = '';
    }
    async updateLog() {
        let request = {
            start: ((this as any).lastLineNum === null) ? 0 : ((this as any).lastLineNum + 1),
            end: null,
            limit: (this as any).logConfig.updateBatchLimit
        };
        let newEntries = await (this as any).consoleui.client.op('getLog', request);
        if (!newEntries.length)
            return false;
        let firstLineNum = newEntries[0][0];
        let lastLineNum = newEntries[newEntries.length - 1][0];
        if ((this as any).lastLineNum !== null && firstLineNum !== (this as any).lastLineNum + 1) {
            // Either server log indexes reset, or we missed a gap in log data
            (this as any).logStr = '';
        }
        for (let entry of newEntries) {
            (this as any).logStr += entry[1] + '\n';
        }
        (this as any).lastLineNum = newEntries[newEntries.length - 1][0];
        if ((this as any).logStr.length > (this as any).logConfig.bufferMaxSize) {
            (this as any).logStr = (this as any).logStr.slice(-(this as any).logConfig.bufferMaxSize);
        }
        return true;
    }
    refreshLogDisplay() {
        (this as any).logBox.setContent((this as any).logStr);
        if ((this as any).logStr)
            (this as any).logBox.setScrollPerc(100);
        (this as any).consoleui.render();
    }
    startLogUpdateLoop() {
        if ((this as any).updateLoopRunning)
            return;
        (this as any).updateLoopRunning = true;
        // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
        const runLoop = async () => {
            // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
            await (this as any).consoleui.serverPollLoop(async () => {
                try {
                    let updated = await this.updateLog();
                    if ((this as any).modeActive && updated) {
                        this.refreshLogDisplay();
                    }
                }
                catch (err) {
                    (this as any).consoleui.clientError(err);
                }
            }, (this as any).logConfig.updateInterval);
        };
        runLoop().catch((this as any).consoleui.clientError.bind(this));
    }
    activateMode() {
        super.activateMode();
        (this as any).modeActive = true;
        if (!(this as any).updateLoopRunning)
            this.startLogUpdateLoop();
        (this as any).textbox.focus();
    }
    exitMode() {
        (this as any).modeActive = false;
        super.exitMode();
    }
    init() {
        super.init();
        (this as any).logBox = blessed.box({
            width: '100%',
            height: '100%-2',
            content: 'Foo\nBar\n',
            scrollable: true,
            scrollbar: {
                ch: '#',
                style: {
                //fg: 'blue'
                },
                track: {
                    bg: 'gray'
                }
            },
            style: {}
        });
        (this as any).box.append((this as any).logBox);
        (this as any).separatorLine = blessed.line({
            type: 'line',
            orientation: 'horizontal',
            width: '100%',
            bottom: 1
        });
        (this as any).box.append((this as any).separatorLine);
        (this as any).textbox = blessed.textbox({
            inputOnFocus: true,
            height: 1,
            width: '100%',
            bottom: 0
        });
        (this as any).box.append((this as any).textbox);
        const scrollUp = () => {
            (this as any).logBox.scroll(-Math.ceil((this as any).logBox.height / 3));
            (this as any).consoleui.render();
        };
        const scrollDown = () => {
            (this as any).logBox.scroll(Math.ceil((this as any).logBox.height / 3));
            (this as any).consoleui.render();
        };
        (this as any).consoleui.registerHomeKey(['l', 'L'], 'l', 'Log Mode', () => (this as any).consoleui.activateMode('log'), 2);
        this.registerModeKey(['escape'], ['Esc'], 'Home', () => (this as any).consoleui.exitMode());
        this.registerModeKey(['pageup'], ['PgUp'], 'Scroll Up', scrollUp);
        this.registerModeKey(['pagedown'], ['PgDn'], 'Scroll Down', scrollDown);
        this.registerModeHint(['<Any>'], 'Type');
        this.registerModeHint(['Enter'], 'Submit');
        (this as any).textbox.key(['escape'], () => (this as any).consoleui.exitMode());
        (this as any).textbox.key(['pageup'], scrollUp);
        (this as any).textbox.key(['pagedown'], scrollDown);
        (this as any).textbox.on('submit', () => {
            let line = (this as any).textbox.getValue();
            (this as any).textbox.clearValue();
            (this as any).textbox.focus();
            (this as any).consoleui.render();
            if (line.trim()) {
                (this as any).consoleui.client.op('send', {
                    line: line
                })
                    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                    .catch((err) => {
                    (this as any).consoleui.clientError(err);
                });
            }
        });
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = ModeLog;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUI = function (consoleui) {
    consoleui.registerMode('log', new ModeLog(consoleui));
};
