// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ConsoleUIM... Remove this comment to see the full error message
const ConsoleUIMode = require('./consoleui-mode');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ListForm'.
const ListForm = require('./list-form');
class ModeControl extends ConsoleUIMode {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui) {
        super(consoleui);
        (this as any).keybinds = consoleui.config.consoleui.control.keybinds;
        (this as any).moveIncrement = 1;
        (this as any).onlyAxes = null;
        (this as any).macroParamCache = {};
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async _executeKeybind(action) {
        if (Array.isArray(action)) {
            for (let el of action)
                await this._executeKeybind(action);
            return;
        }
        const makeOnlyAxesFlags = (trueVal = true, falseVal = false, defVal = undefined) => {
            let flags = undefined;
            if ((this as any).onlyAxes) {
                flags = [];
                for (let i = 0; i < (this as any).consoleui.axisLabels.length; i++)
                    flags[i] = falseVal;
                for (let axisNum of (this as any).onlyAxes)
                    flags[axisNum] = trueVal;
            }
            else if (defVal !== undefined) {
                flags = [];
                for (let i = 0; i < (this as any).consoleui.usedAxes.length; i++) {
                    if ((this as any).consoleui.usedAxes[i]) {
                        flags.push(defVal);
                    }
                    else {
                        flags.push(falseVal);
                    }
                }
            }
            (this as any).onlyAxes = null;
            this._refreshText();
            return flags;
        };
        for (let key in action) {
            let params = action[key];
            switch (key) {
                case 'exitMode':
                    (this as any).consoleui.exitMode();
                    break;
                case 'realTimeMove':
                    await (this as any).consoleui.client.op('realTimeMove', { axis: params.axis, inc: params.mult * (this as any).moveIncrement });
                    break;
                case 'inc':
                    let newInc = (this as any).moveIncrement * params.mult;
                    if (newInc > 1000 || newInc < 0.0001)
                        break;
                    (this as any).moveIncrement = +newInc.toFixed(4);
                    this._refreshText();
                    break;
                case 'onlyAxis':
                    if (!(this as any).onlyAxes)
                        (this as any).onlyAxes = [];
                    if ((this as any).onlyAxes.indexOf(params.axis) !== -1) {
                        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
                        (this as any).onlyAxes = (this as any).onlyAxes.filter((a) => a !== params.axis);
                    }
                    else {
                        (this as any).onlyAxes.push(params.axis);
                        (this as any).onlyAxes.sort();
                    }
                    if (!(this as any).onlyAxes.length)
                        (this as any).onlyAxes = null;
                    this._refreshText();
                    break;
                case 'setOrigin':
                    await (this as any).consoleui.client.op('setOrigin', {
                        pos: makeOnlyAxesFlags()
                    });
                    (this as any).consoleui.showTempMessage('Origin set.');
                    break;
                case 'home':
                    (this as any).consoleui.showTempMessage('Homing ...');
                    await (this as any).consoleui.client.op('home', {
                        axes: makeOnlyAxesFlags()
                    });
                    (this as any).consoleui.showTempMessage('Homing complete.');
                    break;
                case 'setMachineHome':
                    await (this as any).consoleui.client.op('setAbsolutePos', {
                        pos: makeOnlyAxesFlags()
                    });
                    (this as any).consoleui.showTempMessage('Machine home set.');
                    break;
                case 'goOrigin':
                    await (this as any).consoleui.client.op('move', {
                        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '0' is not assignable to paramete... Remove this comment to see the full error message
                        pos: makeOnlyAxesFlags(0, null, 0)
                    });
                    break;
                case 'probe':
                    await (this as any).consoleui.client.op('waitSync', {});
                    let probePos = [];
                    for (let axisNum = 0; axisNum < (this as any).consoleui.axisLabels.length; axisNum++)
                        probePos.push(null);
                    probePos[params.axis] = (this as any).consoleui.lastStatus.controller.pos[params.axis] + params.mult * (this as any).moveIncrement;
                    (this as any).consoleui.showTempMessage('Probing ...');
                    let probeTripped = true;
                    try {
                        await (this as any).consoleui.client.op('probe', {
                            pos: probePos,
                            feed: params.feed
                        });
                    }
                    catch (err) {
                        if (err && err.code === 'probe_not_tripped') {
                            probeTripped = false;
                        }
                        else {
                            throw err;
                        }
                    }
                    if (probeTripped) {
                        (this as any).consoleui.showTempMessage('Probe successful.');
                    }
                    else {
                        (this as any).consoleui.showTempMessage('Probe not tripped.');
                    }
                    break;
                case 'operation':
                    await (this as any).consoleui.client.op(params.name, params.params);
                    break;
                case 'sendTextbox':
                    (this as any).box.append((this as any).sendBoxBorder);
                    (this as any).sendTextbox.focus();
                    (this as any).consoleui.render();
                    break;
                case 'macroList':
                    await this._macroList();
                    break;
                default:
                    throw new Error('Unknown keybind action ' + key);
            }
        }
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async _macroList() {
        let info = await (this as any).consoleui.macroSelector(null, (this as any).macroParamCache);
        if (!info)
            return;
        (this as any).consoleui.client.op('runMacro', { macro: info.macro, params: info.macroParams })
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            .catch((err) => (this as any).consoleui.clientError('Macro error: ' + err));
        (this as any).consoleui.showTempMessage('Macro running.');
    }
    _refreshText() {
        let content = '{bold}Machine Control{/bold}';
        content += '\nMove Increment: ' + (this as any).moveIncrement + ' ' + ((this as any).consoleui.lastStatus.controller.units || '');
        if ((this as any).onlyAxes) {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'axisNum' implicitly has an 'any' type.
            content += '\nNext command axes: ' + (this as any).onlyAxes.map((axisNum) => (this as any).consoleui.axisLabels[axisNum].toUpperCase()).join(', ');
        }
        (this as any)._centerTextBox.setContent(content);
        (this as any).consoleui.screen.render();
    }
    init() {
        super.init();
        let text = blessed.box({
            top: '50%',
            width: '100%',
            height: '100%',
            content: '',
            align: 'center',
            tags: true
        });
        (this as any).box.append(text);
        text.setIndex(10);
        (this as any)._centerTextBox = text;
        (this as any).consoleui.registerHomeKey(['c', 'C'], 'c', 'Control Mode', () => (this as any).consoleui.activateMode('control'), 1);
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
        const handleError = (err) => (this as any).consoleui.clientError(err);
        this._refreshText();
        // Register keybinds
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'kb' implicitly has an 'any' type.
        const registerKeybind = (kb) => {
            this.registerModeKey(kb.keys, kb.keyNames, kb.label, () => {
                this._executeKeybind(kb.action)
                    .catch(handleError);
            });
        };
        for (let key in (this as any).keybinds) {
            registerKeybind((this as any).keybinds[key]);
        }
        (this as any).sendBoxBorder = blessed.box({
            top: '50%-2',
            left: '25%',
            width: '50%',
            height: 3,
            border: {
                type: 'line'
            }
        });
        (this as any).sendTextbox = blessed.textbox({
            inputOnFocus: true,
            height: 1,
            width: '100%'
        });
        (this as any).sendBoxBorder.append((this as any).sendTextbox);
        (this as any).sendBoxBorder.setIndex(100);
        (this as any).sendTextbox.on('cancel', () => {
            (this as any).sendTextbox.clearValue();
            (this as any).box.remove((this as any).sendBoxBorder);
        });
        (this as any).sendTextbox.on('submit', () => {
            let line = (this as any).sendTextbox.getValue();
            (this as any).sendTextbox.clearValue();
            (this as any).box.remove((this as any).sendBoxBorder);
            (this as any).consoleui.render();
            if (line.trim()) {
                (this as any).consoleui.client.op('send', {
                    line: line
                })
                    .then(() => {
                    (this as any).consoleui.showTempMessage('Line sent.');
                })
                    .catch(handleError);
            }
        });
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = ModeControl;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUI = function (consoleui) {
    consoleui.registerMode('control', new ModeControl(consoleui));
};
