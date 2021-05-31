// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'ConsoleUIM... Remove this comment to see the full error message
const ConsoleUIMode = require('./consoleui-mode');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'blessed'.
const blessed = require('blessed');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'XError'.
const XError = require('xerror');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'objtools'.
const objtools = require('objtools');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'path'.
const path = require('path');
class ModeNewJob extends ConsoleUIMode {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'consoleui' implicitly has an 'any' type... Remove this comment to see the full error message
    constructor(consoleui) {
        super(consoleui);
        this.resetJobInfo(false);
    }
    updateJobInfoText() {
        let jobInfoStr = '';
        if ((this as any).jobFilename)
            jobInfoStr += 'File: ' + (this as any).jobFilename + '\n';
        if ((this as any).jobMacro)
            jobInfoStr += 'Generator Macro: ' + (this as any).jobMacro + '\n';
        for (let jobOptionName in ((this as any).jobOptionInstances || {})) {
            let inst = (this as any).jobOptionInstances[jobOptionName];
            let optionStr = inst.getDisplayString();
            if (optionStr) {
                jobInfoStr += '\n' + optionStr.trim();
            }
        }
        if ((this as any).dryRunResults && (this as any).dryRunResults.stats && (this as any).dryRunResults.stats.lineCount) {
            jobInfoStr += '\n\n{bold}Dry Run Results{/bold}\n';
            jobInfoStr += 'Line count: ' + (this as any).dryRunResults.stats.lineCount + '\n';
            let timeHours = Math.floor((this as any).dryRunResults.stats.time / 3600);
            let timeMinutes = Math.floor(((this as any).dryRunResults.stats.time - timeHours * 3600) / 60);
            if (timeMinutes < 10)
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number'.
                timeMinutes = '0' + timeMinutes;
            jobInfoStr += 'Est. Time: ' + timeHours + ':' + timeMinutes + '\n';
            let bounds = objtools.getPath((this as any).dryRunResults, 'gcodeProcessors.final-job-vm.bounds');
            if (bounds) {
                jobInfoStr += 'Bounds: ' + (this as any).consoleui.pointToStr(bounds[0]) + ' to ' + (this as any).consoleui.pointToStr(bounds[1]) + '\n';
            }
        }
        jobInfoStr = jobInfoStr.trim();
        if (!jobInfoStr) {
            jobInfoStr = '{bold}New Job{/bold}';
        }
        else {
            jobInfoStr = '{bold}New Job Info:{/bold}\n' + jobInfoStr;
        }
        (this as any).jobInfoBox.setContent(jobInfoStr);
        (this as any).consoleui.render();
    }
    selectJobFile() {
        (this as any).consoleui.showWaitingBox();
        (this as any).consoleui.client.op('listFiles', {})
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'files' implicitly has an 'any' type.
            .then((files) => {
            (this as any).consoleui.hideWaitingBox();
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'f' implicitly has an 'any' type.
            files = files.filter((f) => f.type === 'gcode').map((f) => f.name);
            let fileListBox = blessed.list({
                style: {
                    selected: {
                        inverse: true
                    },
                    item: {
                        inverse: false
                    }
                },
                keys: true,
                items: files,
                width: '50%',
                height: '50%',
                border: {
                    type: 'line'
                },
                top: 'center',
                left: 'center'
            });
            (this as any).box.append(fileListBox);
            fileListBox.focus();
            fileListBox.once('select', () => {
                let selectedFile = files[fileListBox.selected];
                (this as any).jobFilename = selectedFile;
                (this as any).jobMacro = null;
                (this as any).jobMacroParams = {};
                (this as any).dryRunResults = null;
                (this as any).box.remove(fileListBox);
                this.updateJobInfoText();
            });
            fileListBox.once('cancel', () => {
                (this as any).box.remove(fileListBox);
                (this as any).consoleui.render();
            });
            (this as any).consoleui.render();
        })
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            .catch((err) => {
            (this as any).consoleui.clientError(err);
            (this as any).consoleui.hideWaitingBox();
        });
    }
    selectJobMacro() {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'm' implicitly has an 'any' type.
        const macroFilterFn = (m) => {
            return /^generator-/.test(m);
        };
        (this as any).consoleui.macroSelector(null, null, macroFilterFn)
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'minfo' implicitly has an 'any' type.
            .then((minfo) => {
            if (!minfo)
                return;
            (this as any).jobMacro = minfo.macro;
            (this as any).jobMacroParams = minfo.macroParams;
            (this as any).jobFilename = null;
            (this as any).dryRunResults = null;
            this.updateJobInfoText();
        })
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            .catch((err) => (this as any).consoleui.clientError(err));
    }
    selectJobOption() {
        (this as any).dryRunResults = null;
        let optionNames = Object.keys((this as any).consoleui.jobOptionClasses);
        let containerBox = blessed.box({
            width: '50%',
            border: {
                type: 'line'
            },
            height: '50%',
            top: 'center',
            left: 'center'
        });
        let boxTitle = blessed.box({
            width: '100%',
            height: 1,
            align: 'center',
            content: 'Configure Job Option'
        });
        containerBox.append(boxTitle);
        let listBox = blessed.list({
            style: {
                selected: {
                    inverse: true
                },
                item: {
                    inverse: false
                }
            },
            keys: true,
            items: optionNames,
            width: '100%-2',
            height: '100%-3',
            top: 1,
            border: {
                type: 'line'
            }
        });
        containerBox.append(listBox);
        (this as any).box.append(containerBox);
        listBox.focus();
        listBox.on('select', () => {
            //this.box.remove(containerBox);
            let optionName = optionNames[listBox.selected];
            if (!(this as any).jobOptionInstances[optionName]) {
                let cls = (this as any).consoleui.jobOptionClasses[optionName];
                (this as any).jobOptionInstances[optionName] = new cls((this as any).consoleui);
            }
            let r = (this as any).jobOptionInstances[optionName].optionSelected();
            if (r && typeof r.then === 'function') {
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                r.catch((err) => (this as any).clientError(err));
                r.then(() => listBox.focus());
            }
            (this as any).consoleui.render();
        });
        listBox.on('cancel', () => {
            containerBox.remove(listBox);
            (this as any).box.remove(containerBox);
            (this as any).consoleui.render();
        });
        (this as any).consoleui.render();
    }
    uploadFile() {
        let fileSelector = blessed.filemanager({
            cwd: (this as any).foleLastCwd,
            width: '50%',
            height: '50%',
            top: 'center',
            left: 'center',
            border: {
                type: 'line'
            },
            style: {
                selected: {
                    inverse: true
                },
                item: {
                    inverse: false
                }
            },
            keys: true
        });
        (this as any).box.append(fileSelector);
        fileSelector.focus();
        fileSelector.once('cancel', () => {
            (this as any).box.remove(fileSelector);
            (this as any).consoleui.render();
        });
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'filename' implicitly has an 'any' type.
        fileSelector.once('file', (filename) => {
            (this as any).fileLastCwd = fileSelector.cwd;
            (this as any).box.remove(fileSelector);
            (this as any).consoleui.render();
            (this as any).consoleui.showWaitingBox('Uploading ...');
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            fs.readFile(filename, (err, fileData) => {
                if (err) {
                    (this as any).consoleui.hideWaitingBox();
                    (this as any).consoleui.clientError(err);
                    return;
                }
                fileData = fileData.toString('utf8');
                let fileBaseName = path.basename(filename);
                (this as any).consoleui.client.op('uploadFile', {
                    filename: fileBaseName,
                    data: fileData
                })
                    .then(() => {
                    (this as any).consoleui.hideWaitingBox();
                    (this as any).consoleui.showTempMessage('File uploaded.');
                    (this as any).jobFilename = fileBaseName;
                    (this as any).jobMacro = null;
                    (this as any).jobMacroParams = {};
                    (this as any).dryRunResults = null;
                    this.updateJobInfoText();
                })
                    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                    .catch((err) => {
                    (this as any).consoleui.hideWaitingBox();
                    (this as any).consoleui.clientError(err);
                });
            });
        });
        (this as any).consoleui.render();
        fileSelector.refresh();
    }
    makeJobOptionsObj() {
        if (!(this as any).jobOptionInstances)
            this._instantiateJobOptions();
        let obj = {};
        if ((this as any).jobFilename)
            (obj as any).filename = (this as any).jobFilename;
        else if ((this as any).jobMacro) {
            (obj as any).macro = (this as any).jobMacro;
            (obj as any).macroParams = (this as any).jobMacroParams;
        }
        if (!(obj as any).filename && !(obj as any).macro)
            throw new XError(XError.INVALID_ARGUMENT, 'No filename specified');
        for (let key in ((this as any).jobOptionInstances || {})) {
            (this as any).jobOptionInstances[key].addToJobOptions(obj);
        }
        // This event allows other components to hook into and modify the job options object just before it is sent
        (this as any).consoleui.emit('newJobObject', obj);
        return obj;
    }
    jobDryRunToFile() {
        let inputBox = blessed.box({
            width: '50%',
            height: 3,
            border: {
                type: 'line'
            },
            top: 'center',
            left: 'center'
        });
        let inputTextbox = blessed.textbox({
            inputOnFocus: true,
            width: '100%',
            height: 1
        });
        inputBox.append(inputTextbox);
        (this as any).box.append(inputBox);
        inputTextbox.focus();
        inputTextbox.on('submit', () => {
            let filename = inputTextbox.getValue();
            (this as any).box.remove(inputBox);
            (this as any).consoleui.render();
            if (!filename)
                return;
            this.jobDryRun(filename);
        });
        inputTextbox.on('cancel', () => {
            (this as any).box.remove(inputBox);
            (this as any).consoleui.render();
        });
        (this as any).consoleui.render();
    }
    jobDryRun(toFile = null) {
        let jobOptions;
        try {
            jobOptions = this.makeJobOptionsObj();
        }
        catch (err) {
            (this as any).consoleui.showTempMessage(err.message);
            return;
        }
        if (toFile) {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
            if (!/(\.nc|\.gcode)$/i.test(toFile)) {
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null'.
                toFile += '.nc';
            }
            (jobOptions as any).outputFilename = toFile;
        }
        (this as any).consoleui.showWaitingBox('Running ...');
        (this as any).consoleui.client.op('jobDryRun', jobOptions)
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'result' implicitly has an 'any' type.
            .then((result) => {
            (this as any).dryRunResults = result;
            (this as any).consoleui.showTempMessage('Dry run complete.');
            (this as any).consoleui.hideWaitingBox();
            this.updateJobInfoText();
        })
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            .catch((err) => {
            (this as any).consoleui.clientError(err);
            (this as any).consoleui.hideWaitingBox();
        });
    }
    jobStart() {
        let jobOptions;
        try {
            jobOptions = this.makeJobOptionsObj();
        }
        catch (err) {
            (this as any).consoleui.showTempMessage(err.message);
            return;
        }
        (this as any).consoleui.showWaitingBox('Initializing ...');
        (this as any).consoleui.client.op('startJob', jobOptions)
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'result' implicitly has an 'any' type.
            .then((result) => {
            if (result.dryRunResults) {
                (this as any).dryRunResults = result.dryRunResults;
            }
            (this as any).consoleui.showTempMessage('Starting job.');
            (this as any).consoleui.hideWaitingBox();
            this.updateJobInfoText();
            (this as any).consoleui.activateMode('jobInfo');
        })
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            .catch((err) => {
            (this as any).consoleui.clientError(err);
            (this as any).consoleui.hideWaitingBox();
        });
    }
    _instantiateJobOptions() {
        (this as any).jobOptionInstances = {};
        for (let optionName in (this as any).consoleui.jobOptionClasses) {
            if (!(this as any).jobOptionInstances[optionName]) {
                let cls = (this as any).consoleui.jobOptionClasses[optionName];
                (this as any).jobOptionInstances[optionName] = new cls((this as any).consoleui);
            }
        }
        this.updateJobInfoText();
    }
    resetJobInfo(update = true) {
        (this as any).jobFilename = null;
        (this as any).jobMacro = null;
        (this as any).jobMacroParams = null;
        (this as any).dryRunResults = null;
        (this as any).jobOptionInstances = null;
        if (update) {
            this.updateJobInfoText();
            this._instantiateJobOptions();
        }
    }
    activateMode() {
        super.activateMode();
        if (!(this as any).jobOptionInstances)
            this._instantiateJobOptions();
    }
    exitMode() {
        super.exitMode();
    }
    init() {
        super.init();
        (this as any).jobInfoBox = blessed.box({
            width: '100%',
            height: '100%',
            content: '',
            align: 'center',
            valign: 'center',
            tags: true
        });
        (this as any).box.append((this as any).jobInfoBox);
        this.updateJobInfoText();
        (this as any).consoleui.registerHomeKey(['n', 'N'], 'n', 'New Job', () => (this as any).consoleui.activateMode('newJob'), 3);
        this.registerModeKey(['escape'], ['Esc'], 'Home', () => (this as any).consoleui.exitMode());
        this.registerModeKey(['f'], ['f'], 'Select File', () => this.selectJobFile());
        this.registerModeKey(['u'], ['u'], 'Upload File', () => this.uploadFile());
        this.registerModeKey(['g'], ['g'], 'Generator', () => this.selectJobMacro());
        this.registerModeKey(['o'], ['o'], 'Job Option', () => this.selectJobOption());
        this.registerModeKey(['r'], ['r'], 'Reset', () => this.resetJobInfo());
        this.registerModeKey(['d'], ['d'], 'Dry Run', () => this.jobDryRun());
        this.registerModeKey(['y'], ['y'], 'Run to File', () => this.jobDryRunToFile());
        this.registerModeKey(['s'], ['s'], 'Start Job', () => this.jobStart());
    }
}
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = ModeNewJob;
// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUI = function (consoleui) {
    consoleui.registerMode('newJob', new ModeNewJob(consoleui));
};
