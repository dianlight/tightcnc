// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'TightCNCCl... Remove this comment to see the full error message
const TightCNCClient = require('../../lib/clientlib');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pasync'.
const pasync = require('pasync');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'EventEmitt... Remove this comment to see the full error message
const EventEmitter = require('events');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'path'.
const path = require('path');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'mkdirp'.
const mkdirp = require('mkdirp');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ListForm'.
const ListForm = require('./list-form');
class ConsoleUI extends EventEmitter {
    constructor() {
        super();
        (this as any).statusBoxes = [];
        (this as any).hints = [];
        (this as any).hintOverrideStack = [];
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        (this as any).config = require('littleconf').getConfig();
        (this as any).hintBoxHeight = 3;
        (this as any).modes = {};
        (this as any).jobOptionClasses = {};
        (this as any).enableRendering = true;
        (this as any).inputRequest = {
            lastInputId: null,
            dialogElement: null,
            isHidden: false,
            isComplete: true
        };
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async initLog() {
        let logDir = (this as any).config.consoleui.logDir;
        // @ts-expect-error ts-migrate(2585) FIXME: 'Promise' only refers to a type, but is being used... Remove this comment to see the full error message
        await new Promise((resolve, reject) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            mkdirp(logDir, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        (this as any).logFilename = path.join(logDir, 'consoleui.log');
        (this as any).logFile = fs.openSync((this as any).logFilename, 'w');
        (this as any).curLogSize = 0;
        (this as any).maxLogSize = 2000000;
        (this as any).logInited = true;
    }
    // @ts-expect-error ts-migrate(7019) FIXME: Rest parameter 'args' implicitly has an 'any[]' ty... Remove this comment to see the full error message
    log(...args) {
        let str = '';
        for (let arg of args) {
            if (str)
                str += '; ';
            str += '' + arg;
        }
        if (str === (this as any).lastLogStr)
            return;
        (this as any).lastLogStr = str;
        if (!(this as any).logInited) {
            console.log(str);
        }
        else {
            (this as any).curLogSize += str.length + 1;
            if ((this as any).curLogSize >= (this as any).maxLogSize) {
                fs.closeSync((this as any).logFile);
                (this as any).logFile = fs.openSync((this as any).logFilename, 'w');
            }
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            fs.write((this as any).logFile, '' + str + '\n', (err) => {
                if (err)
                    console.error('Error writing to log', err);
            });
        }
    }
    render() {
        if ((this as any).screen && (this as any).enableRendering)
            (this as any).screen.render();
    }
    disableRender() {
        (this as any).enableRendering = false;
    }
    enableRender() {
        (this as any).enableRendering = true;
        this.render();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keys' implicitly has an 'any' type.
    registerGlobalKey(keys, keyNames, keyLabel, fn) {
        if (!Array.isArray(keys))
            keys = [keys];
        if (keyNames && !Array.isArray(keyNames))
            keyNames = [keyNames];
        let hint = null;
        if (keyNames) {
            hint = this.addHint(keyNames, keyLabel);
        }
        (this as any).screen.key(keys, fn);
        return hint;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keyNames' implicitly has an 'any' type.
    _makeHintStr(keyNames, label) {
        if (!Array.isArray(keyNames))
            keyNames = [keyNames];
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'n' implicitly has an 'any' type.
        return keyNames.map((n) => '{inverse}' + n + '{/inverse}').join('/') + ' ' + label;
    }
    // hints is in form: [ [ keyNames, label ], [ keyNames, label ], ... ]
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'hints' implicitly has an 'any' type.
    pushHintOverrides(hints) {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
        let hintStrs = hints.map((a) => this._makeHintStr(a[0], a[1]));
        (this as any).hintOverrideStack.push(hintStrs);
        this.updateHintBox();
    }
    popHintOverrides() {
        (this as any).hintOverrideStack.pop();
        this.updateHintBox();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keyNames' implicitly has an 'any' type.
    addHint(keyNames, label) {
        (this as any).hints.push(this._makeHintStr(keyNames, label));
        this.updateHintBox();
        return (this as any).hints[(this as any).hints.length - 1];
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'hint' implicitly has an 'any' type.
    removeHint(hint) {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
        (this as any).hints = (this as any).hints.filter((h) => h !== hint);
        this.updateHintBox();
    }
    updateHintBox() {
        let hints = (this as any).hints;
        if ((this as any).hintOverrideStack.length)
            hints = (this as any).hintOverrideStack[(this as any).hintOverrideStack.length - 1];
        if (!hints.length) {
            (this as any).bottomHintBox.setContent('');
            return;
        }
        let totalWidth = (this as any).bottomHintBox.width;
        let rowHints = [];
        let numRowsUsed = Math.min(Math.floor(hints.length / 6) + 1, (this as any).hintBoxHeight);
        let hintsPerRow = Math.ceil(hints.length / numRowsUsed);
        let hintWidth = Math.floor(totalWidth / hintsPerRow);
        let hintsToShow = [];
        for (let i = 0; i < hintsPerRow * numRowsUsed; i++) {
            hintsToShow[i] = hints[i] || '';
        }
        let hintBoxContent = '';
        for (let rowNum = 0; rowNum < numRowsUsed; rowNum++) {
            if (rowNum != 0)
                hintBoxContent += '\n';
            hintBoxContent += '{center}';
            for (let hintIdx = rowNum * hintsPerRow; hintIdx < (rowNum + 1) * hintsPerRow; hintIdx++) {
                let hintStrLen = hintsToShow[hintIdx].replace(/\{[^}]*\}/g, '').length;
                let padLeft = Math.floor((hintWidth - hintStrLen) / 2);
                let padRight = Math.ceil((hintWidth - hintStrLen) / 2);
                for (let i = 0; i < padLeft; i++)
                    hintBoxContent += ' ';
                hintBoxContent += hintsToShow[hintIdx];
                for (let i = 0; i < padRight; i++)
                    hintBoxContent += ' ';
            }
            hintBoxContent += '{/center}';
        }
        (this as any).bottomHintBox.setContent(hintBoxContent);
        this.render();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'fn' implicitly has an 'any' type.
    async runInModal(fn, options = {}) {
        let modal = blessed.box({
            width: (options as any).width || '80%',
            height: (options as any).height || '80%',
            top: 'center',
            left: 'center',
            border: (options as any).border ? { type: 'line' } : undefined
            //border: { type: 'line' },
            //content: 'MODAL CONTENT'
        });
        let container = (options as any).container || (this as any).mainPane;
        container.append(modal);
        modal.setFront();
        (this as any).screen.render();
        try {
            return await fn(modal);
        }
        finally {
            container.remove(modal);
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'fn' implicitly has an 'any' type.
    async runWithWait(fn, text = 'Waiting ...') {
        this.showWaitingBox(text);
        try {
            return await fn();
        }
        finally {
            this.hideWaitingBox();
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'content' implicitly has an 'any' type.
    async showConfirm(content, options = {}, container = null) {
        if (!container)
            container = (this as any).mainPane;
        let box = blessed.box({
            width: '50%',
            height: '30%',
            top: 'center',
            left: 'center',
            align: 'center',
            valign: 'middle',
            keyable: true,
            content: content,
            border: { type: 'line' }
        });
        let origGrabKeys = (this as any).screen.grabKeys;
        // @ts-expect-error ts-migrate(2585) FIXME: 'Promise' only refers to a type, but is being used... Remove this comment to see the full error message
        let r = await new Promise((resolve, reject) => {
            this.pushHintOverrides([['Esc', (options as any).cancelLabel || 'Cancel'], ['Enter', (options as any).okLabel || 'OK']]);
            box.key(['escape'], () => {
                resolve(false);
            });
            box.key(['enter'], () => {
                resolve(true);
            });
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            container.append(box);
            this.render();
            box.focus();
            (this as any).screen.grabKeys = true;
        });
        this.popHintOverrides();
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        container.remove(box);
        (this as any).screen.grabKeys = origGrabKeys;
        (this as any).screen.render();
        return r;
    }
    async macroSelector(container = null, macroParamMap = null, macroFilterFn = null) {
        let macroList = await this.runWithWait(async () => {
            return await (this as any).client.op('listMacros', {});
        });
        if (macroFilterFn) {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'm' implicitly has an 'any' type.
            macroList = macroList.filter((m) => {
                // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
                return macroFilterFn(m.name);
            });
        }
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'm' implicitly has an 'any' type.
        let macroNames = macroList.map((m) => m.name);
        let selected = await new ListForm(this).selector(container, 'Run Macro', macroNames);
        if (typeof selected === 'number') {
            let macro = macroList[selected];
            let macroParams = {};
            if (macro.params && macro.params.type === 'object' && Object.keys(macro.params.properties).length > 0) {
                let form = new ListForm(this);
                // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                macroParams = await form.showEditor(container, macro.params, (macroParamMap && macroParamMap[macro]) || macro.params.default || {}, { returnValueOnCancel: true });
                if (form.editorCancelled) {
                    if (macroParams && macroParamMap)
                        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                        macroParamMap[macro] = macroParams;
                    return null;
                }
                else {
                    if (!macroParams)
                        return null;
                }
            }
            return {
                macro: macro.name,
                macroParams
            };
        }
        else {
            return null;
        }
    }
    /**
     * Adds a status box to the status box stack.
     *
     * @method addStatusBox
     * @param {String} title - Status box title
     * @param {Object} statusObj - An object mapping keys to status values to display.
     * @param {Object} labels - Optional mapping from status keys to display labels for them.
     * @return {Object} - A reference to the UI data for the box.
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'title' implicitly has an 'any' type.
    addStatusBox(title, statusObj, labels = null) {
        if (!labels) {
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{}' is not assignable to type 'null'.
            labels = {};
            for (let key in statusObj)
                // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                labels[key] = key;
        }
        let boxData = {
            title: title,
            data: statusObj,
            labels: labels,
            titleBox: blessed.box({
                tags: true,
                width: '100%',
                height: 1,
                content: '{center}{bold}' + title + '{/bold}{/center}'
            }),
            box: blessed.box({
                tags: true,
                width: '100%',
                content: ''
            }),
            line: blessed.line({
                type: 'line',
                orientation: 'horizontal',
                width: '100%'
            })
        };
        (this as any).statusBoxes.push(boxData);
        (this as any).statusPane.append(boxData.titleBox);
        (this as any).statusPane.append(boxData.box);
        (this as any).statusPane.append(boxData.line);
        this.updateStatusBoxes();
        return boxData;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'boxData' implicitly has an 'any' type.
    removeStatusBox(boxData) {
        let boxIdx = (this as any).statusBoxes.indexOf(boxData);
        if (boxIdx === -1) {
            for (let i = 0; i < (this as any).statusBoxes.length; i++) {
                if ((this as any).statusBoxes[i].data === boxData) {
                    boxIdx = i;
                    boxData = (this as any).statusBoxes[i];
                    break;
                }
            }
            if (boxIdx === -1)
                return;
        }
        (this as any).statusPane.remove(boxData.titleBox);
        (this as any).statusPane.remove(boxData.box);
        (this as any).statusPane.remove(boxData.line);
        (this as any).statusBoxes.splice(boxIdx, 1);
        this.updateStatusBoxes();
    }
    updateStatusBoxes() {
        let vOffset = 0;
        for (let boxData of (this as any).statusBoxes) {
            let numEntries = Object.keys(boxData.labels).length;
            boxData.box.position.height = numEntries;
            boxData.titleBox.position.top = vOffset;
            boxData.box.position.top = vOffset + 1;
            boxData.line.position.top = vOffset + 1 + numEntries;
            vOffset += numEntries + 2;
            let content = '';
            for (let key in boxData.labels) {
                if (content)
                    content += '\n';
                let dataStr = boxData.data[key];
                if (dataStr === null || dataStr === undefined)
                    dataStr = '';
                dataStr = '' + dataStr;
                content += boxData.labels[key] + ':{|}' + dataStr;
            }
            boxData.box.setContent(content);
        }
        this.render();
    }
    initUI() {
        (this as any).screen = blessed.screen({
            smartCSR: true
        });
        (this as any).screen.title = 'TightCNC Console UI';
        (this as any).mainOuterBox = blessed.box({
            top: 0,
            height: '100%-' + (3 + (this as any).hintBoxHeight)
        });
        (this as any).screen.append((this as any).mainOuterBox);
        let messageSeparatorLine = blessed.line({
            type: 'line',
            orientation: 'horizontal',
            width: '100%',
            bottom: (this as any).hintBoxHeight + 2
        });
        (this as any).screen.append(messageSeparatorLine);
        (this as any).messageBox = blessed.box({
            tags: true,
            bottom: (this as any).hintBoxHeight + 1,
            width: '100%',
            height: 1,
            content: '',
            align: 'center'
        });
        (this as any).screen.append((this as any).messageBox);
        let hintSeparatorLine = blessed.line({
            type: 'line',
            orientation: 'horizontal',
            width: '100%',
            bottom: (this as any).hintBoxHeight
        });
        (this as any).screen.append(hintSeparatorLine);
        (this as any).bottomHintBox = blessed.box({
            tags: true,
            bottom: 0,
            height: (this as any).hintBoxHeight,
            content: ''
        });
        (this as any).screen.append((this as any).bottomHintBox);
        (this as any).statusPane = blessed.box({
            left: 0,
            width: '20%',
            content: 'Status'
        });
        (this as any).mainOuterBox.append((this as any).statusPane);
        let statusSeparatorLine = blessed.line({
            type: 'line',
            orientation: 'vertical',
            left: '20%',
            height: '100%'
        });
        (this as any).mainOuterBox.append(statusSeparatorLine);
        (this as any).mainPane = blessed.box({
            right: 0,
            width: '80%-1'
        });
        (this as any).mainOuterBox.append((this as any).mainPane);
        (this as any).screen.on('resize', () => {
            this.updateHintBox();
        });
        /*let testBox = blessed.box({
            width: '100%',
            height: '100%',
            content: '',
            input: true
        });
        testBox.key([ 'f', 'Esc' ], (ch, key) => {
            testBox.setContent('key pressed\n' + ch + '\n' + JSON.stringify(key));
            this.screen.render();
        });
        this.mainPane.append(testBox);
        testBox.focus();*/
        (this as any).screen.render();
        //this.registerGlobalKey([ 'escape', 'C-c' ], [ 'Esc' ], 'Exit', () => process.exit(0));
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    registerJobOption(name, cls) {
        (this as any).jobOptionClasses[name] = cls;
    }
    showWaitingBox(text = 'Waiting ...') {
        if ((this as any).waitingBox)
            return;
        (this as any).waitingBox = blessed.box({
            border: {
                type: 'line'
            },
            content: text,
            align: 'center',
            valign: 'middle',
            width: text.length + 2,
            height: 3,
            top: '50%-2',
            left: '50%-' + (Math.floor(text.length / 2) + 1)
        });
        (this as any).mainOuterBox.append((this as any).waitingBox);
        (this as any).screen.lockKeys = true;
        this.render();
    }
    hideWaitingBox() {
        if (!(this as any).waitingBox)
            return;
        (this as any).mainOuterBox.remove((this as any).waitingBox);
        delete (this as any).waitingBox;
        (this as any).screen.lockKeys = false;
        this.render();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'pos' implicitly has an 'any' type.
    pointToStr(pos) {
        let str = '';
        for (let axisNum = 0; axisNum < (this as any).usedAxes.length; axisNum++) {
            if ((this as any).usedAxes[axisNum]) {
                if (str)
                    str += ', ';
                str += (pos[axisNum] || 0).toFixed(3);
            }
        }
        return str;
    }
    async initClient() {
        console.log('Connecting ...');
        (this as any).client = new TightCNCClient((this as any).config);
        return await (this as any).client.op('getStatus');
    }
    runMessageFetchLoop() {
        // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
        const runLoop = async () => {
            // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
            await this.serverPollLoop(async () => {
                try {
                    let newEntries = await (this as any).client.op('getLog', {
                        logType: 'message',
                        start: -1,
                        limit: 1
                    });
                    let messageEntry = newEntries[0];
                    if (messageEntry && messageEntry[0] !== (this as any).lastMessageEntryId) {
                        (this as any).lastMessageEntryId = messageEntry[0];
                        this.setMessage(messageEntry[1]);
                    }
                }
                catch (err) {
                    this.clientError(err);
                }
            // @ts-expect-error ts-migrate(2693) FIXME: 'any' only refers to a type, but is being used as ... Remove this comment to see the full error message
            }, (this as any).config.consoleui.log, any.messageUpdateInterval);
        };
        runLoop().catch(this.clientError.bind(this));
    }
    setupPrimaryStatusBoxes() {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ state: string; held: string; e... Remove this comment to see the full error message
        (this as any).machineStateStatusBox = this.addStatusBox('Machine', { state: 'NOT READY', held: null, error: null }, { state: 'State', held: 'Hold', error: 'Err' });
        let posStatusInitial = {};
        let posStatusLabels = {};
        for (let i = 0; i < (this as any).usedAxes.length; i++) {
            if ((this as any).usedAxes[i]) {
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                posStatusInitial[(this as any).axisLabels[i]] = null;
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                posStatusLabels[(this as any).axisLabels[i]] = (this as any).axisLabels[i].toUpperCase();
            }
        }
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{}' is not assignable to paramet... Remove this comment to see the full error message
        (this as any).positionStatusBox = this.addStatusBox('Pos Cur/Mach', posStatusInitial, posStatusLabels);
        (this as any).miscStateStatusBox = this.addStatusBox('State', {
            activeCoordSys: null,
            allAxisHomed: null,
            units: null,
            feed: null,
            incremental: null,
            moving: null,
            spindle: null,
            coolant: null
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ moving: string; activeCoordSys... Remove this comment to see the full error message
        }, {
            moving: 'Moving',
            activeCoordSys: 'Coord',
            incremental: 'Inc',
            spindle: 'Spind',
            coolant: 'Cool',
            feed: 'Feed',
            units: 'Unit',
            allAxisHomed: 'Homed'
        });
        (this as any).jobStatusBox = this.addStatusBox('Cur. Job', {
            state: 'NONE',
            percentComplete: '',
            timeRemaining: ''
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ state: string; percentComplete... Remove this comment to see the full error message
        }, {
            state: 'State',
            percentComplete: '% Done',
            timeRemaining: 'Remain'
        });
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'status' implicitly has an 'any' type.
    updatePrimaryStatusBoxes(status) {
        if (!status)
            return;
        let cstatus = status.controller;
        // Machine state
        let machineState = null;
        let machineError = null;
        if (cstatus.error) {
            machineState = '{red-bg}ERROR{/red-bg}';
            if (cstatus.errorData && (cstatus.errorData.message || cstatus.errorData.msg)) {
                machineError = cstatus.errorData.message || cstatus.errorData.msg;
            }
            else if (cstatus.errorData) {
                machineError = JSON.stringify(cstatus.errorData);
            }
            else {
                machineError = 'Unknown';
            }
        }
        else if (cstatus.ready) {
            machineState = '{green-bg}READY{/green-bg}';
        }
        else {
            machineState = '{red-bg}NOT READY{/red-bg}';
        }
        (this as any).machineStateStatusBox.data.state = machineState;
        (this as any).machineStateStatusBox.data.error = machineError;
        (this as any).machineStateStatusBox.data.held = cstatus.held ? '{red-bg}YES{/red-bg}' : 'NO';
        // Position
        const posPrecision = 3;
        for (let i = 0; i < (this as any).usedAxes.length; i++) {
            if ((this as any).usedAxes[i]) {
                let axis = (this as any).axisLabels[i];
                let posStr = '';
                if (cstatus.pos && typeof cstatus.pos[i] === 'number') {
                    posStr += cstatus.pos[i].toFixed(posPrecision);
                }
                if (cstatus.mpos && typeof cstatus.mpos[i] === 'number') {
                    posStr += '{cyan-fg}/' + cstatus.mpos[i].toFixed(posPrecision) + '{/cyan-fg}';
                }
                (this as any).positionStatusBox.data[axis] = posStr;
            }
        }
        // Misc
        (this as any).miscStateStatusBox.data.activeCoordSys = (typeof cstatus.activeCoordSys === 'number') ? ('G' + (cstatus.activeCoordSys + 54)) : '';
        if (cstatus.homed) {
            (this as any).miscStateStatusBox.data.allAxisHomed = '{green-fg}YES{/green-fg}';
            for (let i = 0; i < (this as any).usedAxes.length; i++) {
                if ((this as any).usedAxes[i] && !cstatus.homed[i]) {
                    (this as any).miscStateStatusBox.data.allAxisHomed = 'NO';
                }
            }
        }
        else {
            (this as any).miscStateStatusBox.data.allAxisHomed = '';
        }
        (this as any).miscStateStatusBox.data.units = cstatus.units;
        (this as any).miscStateStatusBox.data.feed = (typeof cstatus.feed === 'number') ? cstatus.feed.toFixed(posPrecision) : '';
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
        const boolstr = (val, iftrue = '{yellow-fg}YES{/yellow-fg}', iffalse = 'NO') => {
            if (val)
                return iftrue;
            if (val === null || val === undefined || val === '')
                return '';
            return iffalse;
        };
        (this as any).miscStateStatusBox.data.incremental = boolstr(cstatus.incremental);
        (this as any).miscStateStatusBox.data.moving = boolstr(cstatus.moving);
        let spindleStr = '';
        if (cstatus.spindle === true && cstatus.spindleDirection === 1) {
            spindleStr = '{yellow-fg}FWD{/yellow-fg}';
        }
        else if (cstatus.spindle === true && cstatus.spindleDirection === -1) {
            spindleStr = '{yellow-fg}REV{/yellow-fg}';
        }
        else if (cstatus.spindle === true) {
            spindleStr = '{yellow-fg}ON{/yellow-fg}';
        }
        else if (cstatus.spindle === false) {
            spindleStr = 'OFF';
        }
        (this as any).miscStateStatusBox.data.spindle = spindleStr;
        (this as any).miscStateStatusBox.data.coolant = boolstr(cstatus.coolant, '{yellow-fg}ON{/yellow-fg}', 'OFF');
        // Job
        if (status.job && status.job.state !== 'none') {
            if (status.job.state === 'initializing') {
                (this as any).jobStatusBox.data.state = '{blue-bg}INIT{/blue-bg}';
            }
            else if (status.job.state === 'running') {
                (this as any).jobStatusBox.data.state = '{yellow-bg}RUN{/yellow-bg}';
            }
            else if (status.job.state === 'waiting') {
                (this as any).jobStatusBox.data.state = '{blue-bg}WAIT{/blue-bg}';
            }
            else if (status.job.state === 'complete') {
                (this as any).jobStatusBox.data.state = '{green-bg}DONE{/green-bg}';
            }
            else {
                (this as any).jobStatusBox.data.state = '{red-bg}' + status.job.state.toUpperCase() + '{/red-bg}';
            }
            if (status.job.progress) {
                (this as any).jobStatusBox.data.percentComplete = '' + status.job.progress.percentComplete.toFixed(1) + '%';
                let hoursRemaining = Math.floor(status.job.progress.estTimeRemaining / 3600);
                let minutesRemaining = Math.floor((status.job.progress.estTimeRemaining - hoursRemaining * 3600) / 60);
                if (minutesRemaining < 10)
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number'.
                    minutesRemaining = '0' + minutesRemaining;
                (this as any).jobStatusBox.data.timeRemaining = '' + hoursRemaining + ':' + minutesRemaining;
            }
            else {
                (this as any).jobStatusBox.data.percentComplete = '';
                (this as any).jobStatusBox.data.timeRemaining = '';
            }
        }
        else {
            (this as any).jobStatusBox.data.state = 'NONE';
            (this as any).jobStatusBox.data.percentComplete = '';
            (this as any).jobStatusBox.data.timeRemaining = '';
        }
        this.updateStatusBoxes();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
    setMessage(msg) {
        (this as any).messageBox.setContent(msg);
        this.render();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
    showTempMessage(msg, time = 6) {
        this.setMessage(msg);
        if ((this as any).curTempMessageTimeout)
            clearTimeout((this as any).curTempMessageTimeout);
        (this as any).curTempMessageTimeout = setTimeout(() => {
            delete (this as any).curTempMessageTimeout;
            this.setMessage('');
        }, time * 1000);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
    clientError(err) {
        this.showTempMessage(err.message || err.msg || ('' + err));
        this.log(err, err.stack);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'container' implicitly has an 'any' type... Remove this comment to see the full error message
    _makeInputRequestDialog(container) {
        let ri = (this as any).inputRequest.spec;
        let dialog = blessed.box({
            width: '50%',
            height: '50%',
            top: 'center',
            left: 'center',
            border: { type: 'line' }
        });
        container.append(dialog);
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'result' implicitly has an 'any' type.
        const inputGiven = (result) => {
            // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
            this.runWithWait(async () => {
                await (this as any).client.op('provideInput', {
                    inputId: ri.id,
                    value: result
                });
            })
                .then(() => {
                this._closeInputRequestDialog();
                (this as any).inputRequest.isHidden = false;
                (this as any).inputRequest.isComplete = true;
            }, (err) => {
                this.clientError(err);
                this._dismissInputRequestDialog();
            });
        };
        if (ri.schema) {
            if (ri.prompt) {
                ri.schema.title = ri.prompt;
                ri.schema.label = ri.prompt;
            }
            let form = new ListForm(this);
            form.showEditor(dialog, ri.schema)
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'result' implicitly has an 'any' type.
                .then((result) => {
                if (form.editorCancelled) {
                    this._dismissInputRequestDialog();
                }
                else {
                    inputGiven(result);
                }
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            }, (err) => {
                this.clientError(err);
            });
        }
        else {
            this.showConfirm(ri.prompt || 'Hit ENTER to continue ...', {}, dialog)
                .then((result) => {
                if (!result) {
                    this._dismissInputRequestDialog();
                }
                else {
                    inputGiven(true);
                }
            }, (err) => {
                this.clientError(err);
            });
        }
        return dialog;
    }
    _showInputRequestDialog() {
        let dialog = this._makeInputRequestDialog((this as any).mainPane);
        (this as any).inputRequest.dialogElement = dialog;
        (this as any).inputRequest.isHidden = false;
        if ((this as any).inputRequest.recallKey) {
            (this as any).modes['home'].removeModeKey((this as any).inputRequest.recallKey);
            (this as any).inputRequest.recallKey = null;
        }
    }
    _closeInputRequestDialog() {
        if (!(this as any).inputRequest.dialogElement)
            return;
        (this as any).mainPane.remove((this as any).inputRequest.dialogElement);
        (this as any).inputRequest.dialogElement = null;
    }
    _dismissInputRequestDialog() {
        if ((this as any).inputRequest.isHidden || !(this as any).inputRequest.dialogElement)
            return;
        this._closeInputRequestDialog();
        (this as any).inputRequest.isHidden = true;
        (this as any).inputRequest.recallKey = this.registerHomeKey(['i', 'I'], 'i', '{blue-bg}Input Req{/blue-bg}', () => {
            if (!(this as any).inputRequest.isHidden || (this as any).inputRequest.dialogElement)
                return;
            this._showInputRequestDialog();
        }, 1000);
        this.render();
    }
    _resetInputRequest() {
        this._closeInputRequestDialog();
        if ((this as any).inputRequest.recallKey) {
            (this as any).modes['home'].removeModeKey((this as any).inputRequest.recallKey);
            (this as any).inputRequest.recallKey = null;
        }
        (this as any).inputRequest.lastInputId = null;
        (this as any).inputRequest.isHidden = false;
        (this as any).inputRequest.isComplete = false;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'status' implicitly has an 'any' type.
    _checkInputRequestOnStatusReport(status) {
        if (status.requestInput) {
            if (status.requestInput.id !== (this as any).inputRequest.lastInputId) {
                if ((this as any).inputRequest.isHidden) {
                    // remove recall keybind
                    if ((this as any).inputRequest.recallKey) {
                        (this as any).modes['home'].removeModeKey((this as any).inputRequest.recallKey);
                        (this as any).inputRequest.recallKey = null;
                    }
                }
                if ((this as any).inputRequest.dialogElement) {
                    this._closeInputRequestDialog();
                }
                (this as any).inputRequest.spec = status.requestInput;
                // show dialog
                this._showInputRequestDialog();
                // update state vars
                (this as any).inputRequest.lastInputId = status.requestInput.id;
                (this as any).inputRequest.isHidden = false;
                (this as any).inputRequest.isComplete = false;
            }
        }
        else {
            if ((this as any).inputRequest.isHidden) {
                // remove recall keybind
                if ((this as any).inputRequest.recallKey) {
                    (this as any).modes['home'].removeModeKey((this as any).inputRequest.recallKey);
                    (this as any).inputRequest.recallKey = null;
                }
            }
            if ((this as any).inputRequest.dialogElement) {
                this._closeInputRequestDialog();
            }
            (this as any).inputRequest.lastInputId = null;
            (this as any).inputRequest.isHidden = false;
            (this as any).inputRequest.isComplete = false;
        }
    }
    runStatusUpdateLoop() {
        // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
        const runLoop = async () => {
            // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
            await this.serverPollLoop(async () => {
                let status;
                try {
                    status = await (this as any).client.op('getStatus');
                    (this as any).lastStatus = status;
                    (this as any).axisLabels = status.controller.axisLabels;
                    (this as any).usedAxes = status.controller.usedAxes;
                    this._checkInputRequestOnStatusReport(status);
                    (this as any).emit('statusUpdate', status);
                }
                catch (err) {
                    this.clientError(err);
                    this._resetInputRequest();
                }
                this.updatePrimaryStatusBoxes(status);
            });
        };
        runLoop().catch(this.clientError.bind(this));
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    registerMode(name, m) {
        (this as any).modes[name] = m;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    activateMode(name) {
        this.disableRender();
        // @ts-expect-error ts-migrate(2551) FIXME: Property 'activeMode' does not exist on type 'Cons... Remove this comment to see the full error message
        if (this.activeMode) {
            // @ts-expect-error ts-migrate(2551) FIXME: Property 'activeMode' does not exist on type 'Cons... Remove this comment to see the full error message
            (this as any).modes[this.activeMode].exitMode();
        }
        (this as any).modes[name].activateMode();
        // @ts-expect-error ts-migrate(2551) FIXME: Property 'activeMode' does not exist on type 'Cons... Remove this comment to see the full error message
        this.activeMode = name;
        this.enableRender();
    }
    exitMode() {
        this.disableRender();
        // @ts-expect-error ts-migrate(2551) FIXME: Property 'activeMode' does not exist on type 'Cons... Remove this comment to see the full error message
        (this as any).modes[this.activeMode].exitMode();
        // @ts-expect-error ts-migrate(2551) FIXME: Property 'activeMode' does not exist on type 'Cons... Remove this comment to see the full error message
        this.activeMode = null;
        this.activateMode('home');
        this.enableRender();
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async registerModules() {
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('./mode-home').registerConsoleUI(this);
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('./mode-control').registerConsoleUI(this);
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('./mode-log').registerConsoleUI(this);
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('./mode-new-job').registerConsoleUI(this);
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('./job-option-rawfile').registerConsoleUI(this);
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('./mode-job-info').registerConsoleUI(this);
        // Register bundled plugins
        // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
        require('../plugins').registerConsoleUIComponents(this);
        // Register external plugins
        for (let plugin of ((this as any).config.plugins || [])) {
            // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
            let p = require(plugin);
            if (p.registerConsoleUIComponents) {
                p.registerConsoleUIComponents(this);
            }
        }
        for (let mname in (this as any).modes) {
            await (this as any).modes[mname].init();
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'keys' implicitly has an 'any' type.
    registerHomeKey(keys, keyNames, keyLabel, fn, order = 1000) {
        return (this as any).modes['home'].registerHomeKey(keys, keyNames, keyLabel, fn, order);
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async serverPollLoop(fn, minInterval = 300) {
        while (true) {
            let t1 = new Date().getTime();
            await fn();
            let t2 = new Date().getTime();
            let tDiff = t2 - t1;
            if (tDiff > 15000)
                tDiff = 15000; // in case something funky happens with the time, such as the computer goes on standby
            let waitTime = Math.max(minInterval, tDiff);
            await pasync.setTimeout(waitTime);
        }
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async run() {
        try {
            await this.initLog();
        }
        catch (err) {
            console.error('Error initializing consoleui log', err, err.stack);
            // @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'process'. Do you need to install... Remove this comment to see the full error message
            process.exit(1);
        }
        let initStatus = await this.initClient();
        (this as any).lastStatus = initStatus;
        (this as any).axisLabels = initStatus.controller.axisLabels;
        (this as any).usedAxes = initStatus.controller.usedAxes;
        this.initUI();
        await this.registerModules();
        this.setupPrimaryStatusBoxes();
        this.updatePrimaryStatusBoxes(initStatus);
        this.runStatusUpdateLoop();
        this.runMessageFetchLoop();
        this.activateMode('home');
        this.log('ConsoleUI Started');
    }
}
new ConsoleUI().run().catch((err) => console.error(err, err.stack));
