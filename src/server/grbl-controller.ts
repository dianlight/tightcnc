// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Controller... Remove this comment to see the full error message
const Controller = require('./controller');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'SerialPort... Remove this comment to see the full error message
const SerialPort = require('serialport');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'XError'.
const XError = require('xerror');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'pasync'.
const pasync = require('pasync');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'GcodeLine'... Remove this comment to see the full error message
const GcodeLine = require('../../lib/gcode-line');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'CrispHooks... Remove this comment to see the full error message
const CrispHooks = require('crisphooks');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'objtools'.
const objtools = require('objtools');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'GcodeVM'.
const GcodeVM = require('../../lib/gcode-vm');
class GRBLController extends Controller {
    constructor(config = {}) {
        super(config);
        (this as any).serial = null;
        (this as any)._initializing = false;
        (this as any)._resetting = false;
        (this as any)._serialListeners = {};
        (this as any).sendQueue = [];
        // This is the index into sendQueue of the next entry to send to the device.  Can be 1 past the end of the queue if there are no lines queued to be sent.
        (this as any).sendQueueIdxToSend = 0;
        // This is the index into sendQueue of the next entry that has been sent but a response is expected for.
        (this as any).sendQueueIdxToReceive = 0;
        // Total number of chars that might be in the grbl serial buffer
        (this as any).unackedCharCount = 0;
        // For certain operations, this interface class uses the concept of a "machine timestamp".  It's kinda
        // like an epoch timestamp, but start at the time this class was instantiated, and does not include
        // time spent in a feed hold.  These variables are involved in calculating machine time.
        (this as any).machineTimeBaseline = new Date().getTime();
        (this as any).totalHeldMachineTime = 0;
        (this as any).lastHoldStartTime = null;
        // The machine timestamp that the most recent line began executing
        (this as any).lastLineExecutingTime = null;
        (this as any).timeEstVM = new GcodeVM({ maxFeed: [1000, 1000, 1000], acceleration: [36000, 36000, 36000] });
        (this as any)._checkExecutedLoopTimeout = null;
        // Number of blocks in sendQueue to send immediately even if it would exceed normal backpressure
        (this as any).sendImmediateCounter = 0;
        (this as any)._disableSending = false;
        (this as any).currentStatusReport = {};
        (this as any).axisLabels = ['x', 'y', 'z'];
        (this as any).usedAxes = (config as any).usedAxes || [true, true, true];
        (this as any).homableAxes = (config as any).homableAxes || [true, true, true];
        (this as any).axisMaxFeeds = (config as any).axisMaxFeeds || [500, 500, 500];
        // Mapping from a parameter key to its value (keys include things like G54, PRB, as well as VER, OPT - values are parsed)
        (this as any).receivedDeviceParameters = {};
        // Mapping from a grbl settings index (numeric) to its value
        (this as any).grblSettings = {};
        this._makeRegexes();
        (this as any).toolLengthOffset = 0;
        (this as any).grblDeviceVersion = null; // main device version, from welcome message
        (this as any).grblVersionDetails = null; // version details, from VER feedback message
        (this as any).grblBuildOptions = {}; // build option flags and values, from OPT feedback message
        (this as any)._lastRecvSrOrAck = null; // used as part of sync detection
        // used for jogging
        (this as any).realTimeMovesTimeStart = [0, 0, 0, 0, 0, 0];
        (this as any).realTimeMovesCounter = [0, 0, 0, 0, 0, 0];
        (this as any).lastMessage = null;
    }
    _getCurrentMachineTime() {
        let ctime = new Date().getTime();
        let mtime = ctime - (this as any).machineTimeBaseline;
        mtime -= (this as any).totalHeldMachineTime;
        if ((this as any).held && (this as any).lastHoldStartTime) {
            mtime -= (ctime - (this as any).lastHoldStartTime);
        }
        return mtime;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    debug(str) {
        const enableDebug = false;
        if ((this as any).tightcnc)
            (this as any).tightcnc.debug('GRBL: ' + str);
        else if (enableDebug)
            console.log('Debug: ' + str);
    }
    _commsReset(err = null) {
        this.debug('_commsReset()');
        if (!err)
            err = new XError(XError.INTERNAL_ERROR, 'Communications reset');
        // Call the error hook on anything in sendQueue
        for (let entry of (this as any).sendQueue) {
            if (entry.hooks) {
                this.debug('_commsReset triggering error hook on sendQueue entry');
                entry.hooks.triggerSync('error', err);
            }
        }
        this.debug('_commsReset() done triggering error hooks');
        // Reset all the variables
        (this as any).sendQueue = [];
        (this as any).sendQueueIdxToSend = 0;
        (this as any).sendQueueIdxToReceive = 0;
        (this as any).unackedCharCount = 0;
        (this as any).sendImmediateCounter = 0;
        if ((this as any)._checkExecutedLoopTimeout !== null) {
            clearTimeout((this as any)._checkExecutedLoopTimeout);
            (this as any)._checkExecutedLoopTimeout = null;
        }
        (this as any).emit('_sendQueueDrain');
    }
    getPos() {
        if ((this as any)._wpos)
            return (this as any)._wpos;
        else
            return super.getPos();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'obj' implicitly has an 'any' type.
    _handleStatusUpdate(obj) {
        let changed = false;
        let wasReady = (this as any).ready;
        for (let key in obj) {
            if (!objtools.deepEquals(obj[key], objtools.getPath(this, key))) {
                objtools.setPath(this, key, obj[key]);
                changed = true;
            }
        }
        if (changed)
            (this as any).emit('statusUpdate');
        if (!wasReady && (this as any).ready && !(this as any)._initializing && !(this as any)._resetting)
            (this as any).emit('ready');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'srString' implicitly has an 'any' type.
    _handleReceiveStatusReport(srString) {
        // Parse status report
        // Detect if it's an old-style (0.9) or new style (1.1) status report based on if it contains a pipe
        let statusReport = {};
        let parts;
        if (srString.indexOf('|') === -1) {
            // old style
            // process the string into an array of strings in the form 'key:val'
            parts = srString.split(',');
            for (let i = 0; i < parts.length;) {
                if (!isNaN(parts[i]) && i > 0) {
                    // this part contains no label, so glue it onto the previous part
                    parts[i - 1] += ',' + parts[i];
                    parts.splice(i, 1);
                }
                else {
                    i++;
                }
            }
        }
        else {
            // new style, just split on |
            parts = srString.split('|');
        }
        // now parse each element
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if (i === 0) {
                // Is machine state
                (statusReport as any).machineState = part;
            }
            else {
                // Split into key and value, then split value on comma if present, parsing numbers
                let matches = (this as any)._regexSrSplit.exec(part);
                let key = matches[1];
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 's' implicitly has an 'any' type.
                let val = matches[2].split(',').map((s) => {
                    if (s !== '' && !isNaN(s)) {
                        return parseFloat(s);
                    }
                    else {
                        return s;
                    }
                });
                if (val.length === 1)
                    val = val[0];
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                statusReport[key] = val;
            }
        }
        // Parsed mapping is now in statusReport
        // Separate the machine state into major and minor components
        if ((statusReport as any).machineState) {
            let state = (statusReport as any).machineState;
            if (state.indexOf(':') !== -1) {
                let stateParts = state.split(':');
                (statusReport as any).machineStateMajor = stateParts[0];
                (statusReport as any).machineStateMinor = parseInt(stateParts[1]);
            }
            else {
                (statusReport as any).machineStateMajor = (statusReport as any).machineState;
                (statusReport as any).machineStateMinor = null;
            }
        }
        // Update this.currentStatusReport
        for (let key in statusReport) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            (this as any).currentStatusReport[key] = statusReport[key];
        }
        // Update the class properties
        let obj = {};
        // Handle each key
        for (let key in statusReport) {
            // Handle each possible key we care about
            if (key === 'machineState') {
                // States: Idle, Run, Hold, Jog (1.1 only), Alarm, Door, Check, Home, Sleep (1.1 only)
                let state = (statusReport as any).machineStateMajor;
                let substate = (statusReport as any).machineStateMinor;
                switch (state.toLowerCase()) {
                    case 'idle':
                        (obj as any).ready = true;
                        (obj as any).held = false;
                        (obj as any).moving = false;
                        (obj as any).error = false;
                        (obj as any).errorData = null;
                        (obj as any).programRunning = false;
                        break;
                    case 'run':
                        (obj as any).ready = true;
                        (obj as any).held = false;
                        (obj as any).moving = true;
                        (obj as any).error = false;
                        (obj as any).errorData = null;
                        (obj as any).programRunning = true;
                        break;
                    case 'hold':
                        (obj as any).ready = true;
                        (obj as any).held = true;
                        (obj as any).moving = false;
                        (obj as any).error = false;
                        (obj as any).errorData = null;
                        (obj as any).programRunning = true;
                        break;
                    case 'alarm':
                        (obj as any).ready = false;
                        (obj as any).held = false;
                        (obj as any).moving = false;
                        (obj as any).error = true;
                        if (!(this as any).errorData && !(obj as any).errorData) {
                            // got status of alarm without a previous ALARM message indicating the type of alarm (which happens in some cases)
                            if ((this as any).lastMessage) {
                                // infer the alarm state from the most recent message received
                                (obj as any).errorData = this._msgToError((this as any).lastMessage);
                            }
                            if (!(obj as any).errorData)
                                (obj as any).errorData = new XError(XError.MACHINE_ERROR, 'Alarmed');
                        }
                        (obj as any).programRunning = false;
                        break;
                    case 'door':
                        (obj as any).ready = false;
                        (obj as any).held = false;
                        (obj as any).moving = false;
                        (obj as any).error = true;
                        // TODO: Handle substate with different messages here
                        (obj as any).errorData = new XError(XError.SAFETY_INTERLOCK, 'Door open', { doorCode: substate });
                        (obj as any).programRunning = false;
                        break;
                    case 'check':
                        (obj as any).ready = true;
                        (obj as any).held = false;
                        (obj as any).moving = false;
                        (obj as any).error = false;
                        (obj as any).errorData = null;
                        (obj as any).programRunning = true;
                        break;
                    case 'home':
                    case 'jog':
                        (obj as any).ready = true;
                        (obj as any).held = false;
                        (obj as any).moving = true;
                        (obj as any).error = false;
                        (obj as any).errorData = null;
                        break;
                    case 'sleep':
                        break;
                    default:
                        // Unknown state
                        break;
                }
            }
            else if (key === 'Bf') {
                // Not currently used.  At some point in the future, if this field is present, it can be used to additionally inform when executing and executed are called, and for waitSync
            }
            else if (key === 'Ln') {
                (obj as any).line = (statusReport as any).Ln;
            }
            else if (key === 'F') {
                (obj as any).feed = (statusReport as any).F;
            }
            else if (key === 'FS') {
                (obj as any).feed = (statusReport as any).FS[0];
                (obj as any).spindleSpeed = (statusReport as any).FS[1];
            }
            else if (key === 'Pn') {
                // pin state; currently not used
            }
            else if (key === 'Ov') {
                // currently unused; possible integration with runtime-overrides plugin
            }
            else if (key === 'A') {
                let a = (statusReport as any).A;
                if (a.indexOf('S') !== -1) {
                    (obj as any).spindle = true;
                    (obj as any).spindleDirection = 1;
                }
                // @ts-expect-error ts-migrate(2367) FIXME: This condition will always return 'true' since the... Remove this comment to see the full error message
                else if (a.indexOf('C' !== -1)) {
                    (obj as any).spindle = true;
                    (obj as any).spindleDirection = -1;
                }
                else {
                    (obj as any).spindle = false;
                }
                if (a.indexOf('F') !== -1) {
                    if (a.indexOf('M') !== -1) {
                        (obj as any).coolant = 3;
                    }
                    else {
                        (obj as any).coolant = 2;
                    }
                }
                else if (a.indexOf('M') !== -1) {
                    (obj as any).coolant = 1;
                }
                else {
                    (obj as any).coolant = false;
                }
            }
            else if (key === 'Buf') { // 0.9
                // As with 'Bf' above, could possibly be used to additional inform when to call hooks and syncing
            }
            else if (key === 'RX') { // 0.9
                // not used
            }
            else if (key !== 'MPos' && key !== 'WPos' && key !== 'WCO' && key !== 'machineStateMajor' && key !== 'machineStateMinor') {
                // unknown status field; ignore
            }
        }
        // Figure out how to update current position with given information
        if ('MPos' in statusReport) {
            (obj as any).mpos = (statusReport as any).MPos;
            if ('WCO' in statusReport) {
                // calculate this._wpos from given coordinate offset
                (obj as any)._wpos = [];
                for (let i = 0; i < (statusReport as any).MPos.length; i++)
                    (obj as any)._wpos.push((statusReport as any).MPos[i] - (statusReport as any).WCO[i]);
            }
            else if (!('WPos' in statusReport)) {
                // no work position present, so clear this._wpos so position is calculated from mpos
                (obj as any)._wpos = null;
            }
        }
        if ('WPos' in statusReport) {
            (obj as any)._wpos = (statusReport as any).WPos;
            if ('WCO' in statusReport && !('MPos' in statusReport)) {
                // calculate this.mpos from the known data
                (obj as any).mpos = [];
                for (let i = 0; i < (statusReport as any).WPos.length; i++)
                    (obj as any).mpos.push((statusReport as any).WPos[i] + (statusReport as any).WCO[i]);
            }
        }
        (this as any)._lastRecvSrOrAck = 'sr';
        this._handleStatusUpdate(obj);
        (this as any).emit('statusReportReceived', statusReport);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'setting' implicitly has an 'any' type.
    _handleSettingFeedback(setting, value) {
        // parse value
        if (value && !isNaN(value))
            value = parseFloat(value);
        // store in this.grblSettings
        let oldVal = (this as any).grblSettings[setting];
        (this as any).grblSettings[setting] = value;
        // check if setting requires updating other status properties
        if (setting === 13)
            (this as any).grblReportInches = value;
        if (setting === 22)
            (this as any).homableAxes = value ? ((this as any).config.homableAxes || [true, true, true]) : [false, false, false];
        if (setting === 30)
            (this as any).spindleSpeedMax = value;
        if (setting === 31)
            (this as any).spindleSpeedMin = value;
        if (setting === 110) {
            (this as any).axisMaxFeeds[0] = value;
            (this as any).timeEstVM.options.maxFeed[0] = value;
        }
        if (setting === 111) {
            (this as any).axisMaxFeeds[1] = value;
            (this as any).timeEstVM.options.maxFeed[1] = value;
        }
        if (setting === 112) {
            (this as any).axisMaxFeeds[2] = value;
            (this as any).timeEstVM.options.maxFeed[2] = value;
        }
        if (setting === 120) {
            (this as any).timeEstVM.options.acceleration[0] = value * 3600;
        }
        if (setting === 121) {
            (this as any).timeEstVM.options.acceleration[1] = value * 3600;
        }
        if (setting === 122) {
            (this as any).timeEstVM.options.acceleration[2] = value * 3600;
        }
        // fire event
        if (value !== oldVal) {
            (this as any).emit('statusUpdate');
            (this as any).emit('settingsUpdate');
        }
    }
    _makeRegexes() {
        // received message regexes
        (this as any)._regexWelcome = /^Grbl v?([^ ]+)/; // works for both 0.9 and 1.1
        (this as any)._regexOk = /^ok(:(.*))?/; // works for both 0.9 and 1.1
        (this as any)._regexError = /^error: ?(.*)$/; // works for both 0.9 and 1.1
        (this as any)._regexStartupLineOk = /^>.*:ok$/; // works for 1.1; not sure about 0.9
        (this as any)._regexStartupLineError = /^>.*:error:(.*)$/; // works for 1.1
        (this as any)._regexStatusReport = /^<(.*)>$/; // works for both 0.9 and 1.1
        (this as any)._regexAlarm = /^ALARM:(.*)$/; // works for both 0.9 and 1.1
        (this as any)._regexIgnore = /^\[HLP:.*\]$|^\[echo:.*/; // regex of messages we don't care about but are valid responses from grbl
        (this as any)._regexSetting = /^\$([0-9]+)=(-?[0-9.]+)/; // works forboth 0.9 and 1.1
        (this as any)._regexStartupLineSetting = /^\$N([0-9]+)=(.*)$/; // works for 1.1; not sure about 0.9
        (this as any)._regexMessage = /^\[MSG:(.*)\]$/; // 1.1 only
        (this as any)._regexParserState = /^\[GC:(.*)\]$/; // 1.1 only
        (this as any)._regexParserState09 = /^\[(([A-Z]-?[0-9.]+ ?){4,})\]$/; // 0.9 only
        (this as any)._regexParamValue = /^\[(G5[4-9]|G28|G30|G92|TLO|PRB|VER|OPT):(.*)\]$/; // 1.1 only
        (this as any)._regexVersion09 = /^\[([0-9.]+[a-zA-Z]?\.[0-9]+:.*)\]$/; // 0.9 only
        (this as any)._regexFeedback = /^\[(.*)\]$/;
        // regex for splitting status report elements
        (this as any)._regexSrSplit = /^([^:]*):(.*)$/;
        // regex for parsing outgoing settings commands
        (this as any)._regexSettingsCommand = /^\$(N?[0-9]+)=(.*)$/;
        (this as any)._regexRstCommand = /^\$RST=(.*)$/;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'alarm' implicitly has an 'any' type.
    _alarmCodeToError(alarm) {
        if (alarm && !isNaN(alarm))
            alarm = parseInt(alarm);
        if (typeof alarm === 'string')
            alarm = alarm.toLowerCase().trim();
        switch (typeof alarm === 'string' ? alarm.toLowerCase() : alarm) {
            case 1:
                return new XError(XError.LIMIT_HIT, 'Hard limit triggered', { limitType: 'hard', grblAlarm: alarm });
            case 2:
                return new XError(XError.LIMIT_HIT, 'Soft limit triggered', { limitType: 'soft', grblAlarm: alarm });
            case 'hard/soft limit':
                return new XError(XError.LIMIT_HIT, 'Limit hit', { grblAlarm: alarm });
            case 3:
            case 'abort during cycle':
                return new XError(XError.MACHINE_ERROR, 'Position unknown after reset; home machine or clear error', { grblAlarm: alarm, subcode: 'position_unknown' });
            case 4:
                return new XError(XError.PROBE_INITIAL_STATE, 'Probe not in expected initial state', { grblAlarm: alarm });
            case 5:
            case 'probe fail':
                return new XError(XError.PROBE_NOT_TRIPPED, 'Probe was not tripped', { grblAlarm: alarm });
            case 6:
                return new XError(XError.MACHINE_ERROR, 'Reset during homing cycle', { grblAlarm: alarm });
            case 7:
                return new XError(XError.MACHINE_ERROR, 'Door opened during homing', { grblAlarm: alarm });
            case 8:
                return new XError(XError.MACHINE_ERROR, 'Homing did not clear switch', { grblAlarm: alarm });
            case 9:
                return new XError(XError.MACHINE_ERROR, 'Homing switch not found', { grblAlarm: alarm });
            default:
                return new XError(XError.MACHINE_ERROR, 'GRBL Alarm: ' + alarm, { grblAlarm: alarm });
        }
    }
    // Converts the grbl message to an XError
    // Returns null if the message does not indicate an error
    // Note that just receiving a message that can be interpreted as an error doesn't mean the machine is alarmed; that should be checked separately
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    _msgToError(str) {
        switch (str.trim()) {
            case "'$H'|'$X' to unlock":
                return new XError(XError.MACHINE_ERROR, 'Position unknown; home machine or clear error', { subcode: 'position_unknown', grblMsg: str });
            case 'Reset to continue':
                return new XError(XError.MACHINE_ERROR, 'Critical error; reset required', { grblMsg: str });
            case 'Check Door':
                return new XError(XError.SAFETY_INTERLOCK, 'Door open', { grblMsg: str });
            case 'Check Limits':
                return new XError(XError.LIMIT_HIT, 'Limit hit', { grblMsg: str });
            case 'Caution: Unlocked':
            case 'Enabled':
            case 'Disabled':
            case 'Pgm End':
            case 'Restoring defaults':
            case 'Restoring spindle':
            case 'Sleeping':
                return null;
            default:
                return new XError(XError.MACHINE_ERROR, 'GRBL: ' + str, { grblMsg: str });
        }
    }
    // Converts an error code from an "error:x" message to an XError
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'ecode' implicitly has an 'any' type.
    _responseCodeToError(ecode) {
        if (ecode && !isNaN(ecode))
            ecode = parseInt(ecode);
        switch (ecode) {
            case 1:
            case 'Expected command letter':
                return new XError(XError.PARSE_ERROR, 'G-code words consist of a letter and a value. Letter was not found.', { grblErrorCode: 1 });
            case 2:
            case 'Bad number format':
                return new XError(XError.PARSE_ERROR, 'Missing the expected G-code word value or numeric value format is not valid.', { grblErrorCode: 2 });
            case 3:
            case 'Invalid statement':
                return new XError(XError.MACHINE_ERROR, 'Grbl \'$\' system command was not recognized or supported.', { grblErrorCode: 3 });
            case 4:
            case 'Value < 0':
                return new XError(XError.MACHINE_ERROR, 'Negative value received for an expected positive value.', { grblErrorCode: 4 });
            case 5:
            case 'Setting disabled':
                return new XError(XError.MACHINE_ERROR, 'Homing cycle failure. Homing is not enabled via settings.', { grblErrorCode: 5 });
            case 6:
            case 'Value < 3 usec':
                return new XError(XError.MACHINE_ERROR, 'Minimum step pulse time must be greater than 3usec.', { grblErrorCode: 6 });
            case 7:
            case 'EEPROM read fail. Using defaults':
                return new XError(XError.MACHINE_ERROR, 'An EEPROM read failed. Auto-restoring affected EEPROM to default values.', { grblErrorCode: 7 });
            case 8:
            case 'Not idle':
                return new XError(XError.MACHINE_ERROR, 'Grbl \'$\' command cannot be used unless Grbl is IDLE. Ensures smooth operation during a job.', { grblErrorCode: 8 });
            case 9:
            case 'G-code lock':
                return new XError(XError.MACHINE_ERROR, 'G-code commands are locked out during alarm or jog state.', { grblErrorCode: 9 });
            case 10:
            case 'Homing not enabled':
                return new XError(XError.MACHINE_ERROR, 'Soft limits cannot be enabled without homing also enabled.', { grblErrorCode: 10 });
            case 11:
            case 'Line overflow':
                return new XError(XError.MACHINE_ERROR, 'Max characters per line exceeded. Received command line was not executed.', { grblErrorCode: 11 });
            case 12:
            case 'Step rate > 30kHz':
                return new XError(XError.MACHINE_ERROR, 'Grbl \'$\' setting value cause the step rate to exceed the maximum supported.', { grblErrorCode: 12 });
            case 13:
            case 'Check Door':
                return new XError(XError.MACHINE_ERROR, 'Safety door detected as opened and door state initiated.', { grblErrorCode: 13 });
            case 14:
            case 'Line length exceeded':
                return new XError(XError.MACHINE_ERROR, 'Build info or startup line exceeded EEPROM line length limit. Line not stored.', { grblErrorCode: 14 });
            case 15:
            case 'Travel exceeded':
                return new XError(XError.MACHINE_ERROR, 'Jog target exceeds machine travel. Jog command has been ignored.', { grblErrorCode: 15 });
            case 16:
            case 'Invalid jog command':
                return new XError(XError.MACHINE_ERROR, 'Jog command has no \'=\' or contains prohibited g-code.', { grblErrorCode: 16 });
            case 17:
            case 'Setting disabled':
                return new XError(XError.MACHINE_ERROR, 'Laser mode requires PWM output.', { grblErrorCode: 17 });
            case 20:
            case 'Unsupported command':
                return new XError(XError.PARSE_ERROR, 'Unsupported or invalid g-code command found in block.', { grblErrorCode: 20 });
            case 21:
            case 'Modal group violation':
                return new XError(XError.PARSE_ERROR, 'More than one g-code command from same modal group found in block.', { grblErrorCode: 21 });
            case 22:
            case 'Undefined feed rate':
                return new XError(XError.MACHINE_ERROR, 'Feed rate has not yet been set or is undefined.', { grblErrorCode: 22 });
            case 23:
            case 'Invalid gcode ID:23':
                return new XError(XError.MACHINE_ERROR, 'G-code command in block requires an integer value.', { grblErrorCode: 23 });
            case 24:
            case 'Invalid gcode ID:24':
                return new XError(XError.PARSE_ERROR, 'More than one g-code command that requires axis words found in block.', { grblErrorCode: 24 });
            case 25:
            case 'Invalid gcode ID:25':
                return new XError(XError.MACHINE_ERROR, 'Repeated g-code word found in block.', { grblErrorCode: 25 });
            case 26:
            case 'Invalid gcode ID:26':
                return new XError(XError.MACHINE_ERROR, 'No axis words found in block for g-code command or current modal state which requires them.', { grblErrorCode: 26 });
            case 27:
            case 'Invalid gcode ID:27':
                return new XError(XError.MACHINE_ERROR, 'Line number value is invalid.', { grblErrorCode: 27 });
            case 28:
            case 'Invalid gcode ID:28':
                return new XError(XError.MACHINE_ERROR, 'G-code command is missing a required value word.', { grblErrorCode: 28 });
            case 29:
            case 'Invalid gcode ID:29':
                return new XError(XError.MACHINE_ERROR, 'G59.x work coordinate systems are not supported.', { grblErrorCode: 29 });
            case 30:
            case 'Invalid gcode ID:30':
                return new XError(XError.MACHINE_ERROR, 'G53 only allowed with G0 and G1 motion modes.', { grblErrorCode: 30 });
            case 31:
            case 'Invalid gcode ID:31':
                return new XError(XError.MACHINE_ERROR, 'Axis words found in block when no command or current modal state uses them.', { grblErrorCode: 31 });
            case 32:
            case 'Invalid gcode ID:32':
                return new XError(XError.MACHINE_ERROR, 'G2 and G3 arcs require at least one in-plane axis word.', { grblErrorCode: 32 });
            case 33:
            case 'Invalid gcode ID:33':
                return new XError(XError.MACHINE_ERROR, 'Motion command target is invalid.', { grblErrorCode: 33 });
            case 34:
            case 'Invalid gcode ID:34':
                return new XError(XError.MACHINE_ERROR, 'Arc radius value is invalid.', { grblErrorCode: 34 });
            case 35:
            case 'Invalid gcode ID:35':
                return new XError(XError.MACHINE_ERROR, 'G2 and G3 arcs require at least one in-plane offset word.', { grblErrorCode: 35 });
            case 36:
            case 'Invalid gcode ID:36':
                return new XError(XError.MACHINE_ERROR, 'Unused value words found in block.', { grblErrorCode: 36 });
            case 37:
            case 'Invalid gcode ID:37':
                return new XError(XError.MACHINE_ERROR, 'G43.1 dynamic tool length offset is not assigned to configured tool length axis.', { grblErrorCode: 37 });
            case 38:
            case 'Invalid gcode ID:38':
                return new XError(XError.MACHINE_ERROR, 'Tool number greater than max supported value.', { grblErrorCode: 38 });
            default:
                return new XError(XError.MACHINE_ERROR, 'GRBL error: ' + ecode, { grblErrorCode: ecode });
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'line' implicitly has an 'any' type.
    _handleReceiveSerialDataLine(line) {
        let matches;
        //this.debug('receive line ' + line);
        (this as any).emit('received', line);
        // Check for ok
        if ((this as any)._regexOk.test(line)) {
            (this as any)._lastRecvSrOrAck = 'ack';
            this._commsHandleAckResponseReceived();
            return;
        }
        // Check for status report
        matches = (this as any)._regexStatusReport.exec(line);
        if (matches) {
            this._handleReceiveStatusReport(matches[1]);
            return;
        }
        // Check for ignored line
        if ((this as any)._regexIgnore.test(line))
            return;
        // Check for error
        matches = (this as any)._regexError.exec(line);
        if (matches) {
            (this as any)._lastRecvSrOrAck = 'ack';
            this._commsHandleAckResponseReceived(this._responseCodeToError(matches[1]));
            return;
        }
        // Check for welcome message
        matches = (this as any)._regexWelcome.exec(line);
        if (matches) {
            (this as any).grblDeviceVersion = matches[1];
            (this as any).error = false;
            (this as any).errorData = null;
            (this as any).lastMessage = null;
            if ((this as any)._initializing && (this as any)._welcomeMessageWaiter) {
                // Complete initialization
                (this as any)._welcomeMessageWaiter.resolve();
                return;
            }
            else if ((this as any)._resetting) {
                // Ready again after reset
                this._cancelRunningOps(new XError(XError.MACHINE_ERROR, 'Machine reset'));
                this._commsReset();
                (this as any)._disableSending = false;
                (this as any)._resetting = false;
                this._initMachine()
                    .then(() => {
                    (this as any)._resetting = false;
                    (this as any).emit('initialized');
                    if ((this as any).ready)
                        (this as any).emit('ready');
                    (this as any).emit('statusUpdate');
                    this.debug('Done resetting');
                })
                    .catch((err) => {
                    console.error(err);
                    this.debug('Error initializing machine after reset: ' + err);
                    this.close(err);
                    this._retryConnect();
                });
                return;
            }
            else {
                // Got an unexpected welcome message indicating that the device was reset unexpectedly
                this.debug('Machine reset unexpectedly');
                let err = new XError(XError.CANCELLED, 'Machine reset');
                this.close(err);
                if (!(this as any)._initializing) {
                    this.debug('calling _retryConnect() after receive welcome message');
                    this._retryConnect();
                }
                return;
            }
        }
        // Check if it's a startup line result
        if ((this as any)._regexStartupLineOk.test(line))
            return; // ignore
        matches = (this as any)._regexStartupLineError.exec(line);
        if (matches) {
            (this as any).emit('message', 'Startup line error: ' + line);
            return;
        }
        // Check if it's an alarm
        matches = (this as any)._regexAlarm.exec(line);
        if (matches) {
            (this as any).error = true;
            (this as any).ready = false;
            (this as any).moving = false;
            let err = this._alarmCodeToError(matches[1]);
            (this as any).errorData = err;
            // Don't cancel ops or emit error on routine probe alarms
            if (err.code !== XError.PROBE_NOT_TRIPPED) {
                this._cancelRunningOps(err);
                if (!(this as any)._initializing)
                    (this as any).emit('error', err);
            }
            return;
        }
        // Check if it's a settings response
        matches = (this as any)._regexSetting.exec(line);
        if (matches) {
            this._handleSettingFeedback(parseInt(matches[1]), matches[2]);
            return;
        }
        matches = (this as any)._regexStartupLineSetting.exec(line);
        if (matches) {
            this._handleSettingFeedback('N' + matches[1], matches[2]);
            return;
        }
        // Check if it's a message
        matches = (this as any)._regexMessage.exec(line);
        if (matches) {
            (this as any).lastMessage = matches[1];
            this._handleReceivedMessage(matches[1], false);
            return;
        }
        // Check if it's parser state feedback
        matches = (this as any)._regexParserState.exec(line);
        if (!matches)
            matches = (this as any)._regexParserState09.exec(line);
        if (matches) {
            this._handleDeviceParserUpdate(matches[1]);
            return;
        }
        // Check if it's a parameter value
        matches = (this as any)._regexParamValue.exec(line);
        if (matches) {
            this._handleDeviceParameterUpdate(matches[1], matches[2]);
            return;
        }
        // Version data for 0.9
        matches = (this as any)._regexVersion09.exec(line);
        if (matches) {
            this._handleDeviceParameterUpdate('VER', matches[1]);
            return;
        }
        // Check if it's some other feedback value
        matches = (this as any)._regexFeedback.exec(line);
        if (matches) {
            this._handleReceivedMessage(matches[1], true);
            return;
        }
        // Unmatched line
        console.error('Received unknown line from grbl: ' + line);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
    _humanReadableMessage(msg) {
        switch (msg) {
            case "'$H'|'$X' to unlock":
                return 'Position lost; home machine or clear error';
            case 'Caution: Unlocked':
                return 'Caution: Error cleared';
            case 'Pgm End':
                return 'Program end';
            default:
                return msg;
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    _handleReceivedMessage(str, unwrapped = false) {
        // suppress some messages during certain operations where the messages are handled automatically and
        // don't need to be reported to the user
        if ((this as any)._ignoreUnlockedMessage && str === 'Caution: Unlocked')
            return;
        if ((this as any)._ignoreUnlockPromptMessage && str === "'$H'|'$X' to unlock")
            return;
        (this as any).emit('message', this._humanReadableMessage(str));
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    _handleDeviceParserUpdate(str) {
        // Ignore this if there's anything in the sendQueue with gcode attached (so we know the controller's parser is in sync)
        for (let entry of (this as any).sendQueue) {
            if (entry.gcode)
                return;
        }
        // Parse the whole response as a gcode line and run it through the gcode vm
        let gline = new GcodeLine(str);
        (this as any).timeEstVM.runGcodeLine(gline);
        let statusUpdates = {};
        // Fetch gcodes from each relevant modal group and update state vars accordingly
        let activeCoordSys = gline.get('G', 'G54');
        if (activeCoordSys)
            (statusUpdates as any).activeCoordSys = activeCoordSys - 54;
        let unitCode = gline.get('G', 'G20');
        if (unitCode)
            (statusUpdates as any).units = (unitCode === 20) ? 'in' : 'mm';
        let incrementalCode = gline.get('G', 'G90');
        if (incrementalCode)
            (statusUpdates as any).incremental = incrementalCode === 91;
        let feedMode = gline.get('G', 'G93');
        if (feedMode)
            (statusUpdates as any).inverseFeed = feedMode === 93;
        let spindleMode = gline.get('M', 'M5');
        if (spindleMode === 3) {
            (statusUpdates as any).spindle = true;
            (statusUpdates as any).spindleDirection = 1;
        }
        if (spindleMode === 4) {
            (statusUpdates as any).spindle = true;
            (statusUpdates as any).spindleDirection = -1;
        }
        if (spindleMode === 5)
            (statusUpdates as any).spindle = false;
        let coolantMode = gline.get('M', 'M7');
        if (coolantMode === 7)
            (statusUpdates as any).coolant = 1;
        if (coolantMode === 8)
            (statusUpdates as any).coolant = 2;
        if (coolantMode === 9)
            (statusUpdates as any).coolant = false;
        let feed = gline.get('F');
        if (typeof feed === 'number')
            (statusUpdates as any).feed = feed;
        let spindleSpeed = gline.get('S');
        if (typeof spindleSpeed === 'number')
            (statusUpdates as any).spindleSpeed = spindleSpeed;
        // Perform status updates
        this._handleStatusUpdate(statusUpdates);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
    _handleDeviceParameterUpdate(name, value) {
        name = name.toUpperCase();
        // Parse the value.  Supported formats:
        // - <number> - parsed as number
        // - <number>,<number>,<number> - parsed as number array
        // - <value>:<value> - parsed as array of other values (numbers or number arrays)
        value = value.split(':');
        for (let j = 0; j < value.length; j++) {
            let a = value[j];
            let parts = a.split(',');
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] && !isNaN(parts[i]))
                    parts[i] = parseFloat(parts[i]);
            }
            if (parts.length < 2)
                parts = parts[0];
            value[j] = parts;
        }
        if (name !== 'PRB')
            value = value[0];
        // Update any status vars
        let statusObj = {};
        if (name[0] === 'G' && name[1] === '5') {
            let n = parseInt(name[2]) - 4;
            if (n >= 0)
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                statusObj['coordSysOffsets.' + n] = value;
        }
        if (name === 'G28')
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            statusObj['storedPositions.0'] = value;
        if (name === 'G30')
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            statusObj['storedPositions.1'] = value;
        if (name === 'G92')
            (statusObj as any).offset = value;
        if (name === 'TLO')
            (statusObj as any).toolLengthOffset = value;
        if (name === 'PRB')
            (statusObj as any).lastProbeReport = value;
        if (name === 'VER')
            (statusObj as any).grblVersionDetails = value;
        if (name === 'OPT') {
            const optCharMap = {
                'V': 'variableSpindle',
                'N': 'lineNumbers',
                'M': 'mistCoolant',
                'C': 'coreXY',
                'P': 'parking',
                'Z': 'homingForceOrigin',
                'H': 'homingSingleAxis',
                'T': 'twoLimitSwitch',
                'A': 'allowProbeFeedOverride',
                '*': 'disableRestoreAllEEPROM',
                '$': 'disableRestoreSettings',
                '#': 'disableRestoreParams',
                'I': 'disableBuildInfoStr',
                'E': 'disableSyncOnEEPROMWrite',
                'W': 'disableSyncOnWCOChange',
                'L': 'powerUpLockWithoutHoming'
            };
            (this as any).grblBuildOptions = {};
            let optChars = value[0].toUpperCase();
            for (let c of optChars) {
                (this as any).grblBuildOptions[c] = true;
                if (c in optCharMap) {
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    (this as any).grblBuildOptions[optCharMap[c]] = true;
                }
            }
            for (let c in optCharMap) {
                if (!(this as any).grblBuildOptions[c]) {
                    (this as any).grblBuildOptions[c] = false;
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    (this as any).grblBuildOptions[optCharMap[c]] = false;
                }
            }
            (this as any).grblBuildOptions.blockBufferSize = value[1];
            (this as any).grblBuildOptions.rxBufferSize = value[2];
        }
        this._handleStatusUpdate(statusObj);
        // Update parameters mapping
        (this as any).receivedDeviceParameters[name] = value;
        (this as any).emit('deviceParamUpdate', name, value);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'strOrBuf' implicitly has an 'any' type.
    _writeToSerial(strOrBuf) {
        if (!(this as any).serial)
            return;
        (this as any).serial.write(strOrBuf);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
    _cancelRunningOps(err) {
        this.debug('_cancelRunningOps()');
        this._commsReset(err);
        this.debug('_cancelRunningOps() emitting cancelRunningOps');
        (this as any).emit('cancelRunningOps', err);
        this.debug('_cancelRunningOps() done');
    }
    initConnection(retry = true) {
        this.debug('initConnection()');
        if ((this as any)._initializing) {
            this.debug('skipping, already initializing');
            return;
        }
        (this as any)._retryConnectFlag = retry;
        (this as any).ready = false;
        (this as any)._initializing = true;
        (this as any).emit('statusUpdate');
        if ((this as any).serial || (this as any).sendQueue.length) {
            this.close();
        }
        const doInit = async () => {
            // Set up options for serial connection.  (Set defaults, then apply configs on top.)
            let serialOptions = {
                autoOpen: true,
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                rtscts: false,
                xany: false
            };
            for (let key in (this as any).config) {
                if (key in serialOptions) {
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    serialOptions[key] = (this as any).config[key];
                }
            }
            let port = (this as any).config.port || '/dev/ttyACM1';
            // Try to open the serial port
            this.debug('Opening serial port');
            await new Promise<void>((resolve, reject) => {
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                (this as any).serial = new SerialPort(port, serialOptions, (err) => {
                    if (err)
                        reject(new XError(XError.COMM_ERROR, 'Error opening serial port', err));
                    else
                        resolve();
                });
            });
            this.debug('Serial port opened');
            // This waiter is used for the pause during initialization later.  It's needed because
            // we need to be able to reject this and exit initialization if an error occurs while paused.
            let initializationPauseWaiter = pasync.waiter();
            // Initialize serial buffers and initial variables
            (this as any).serialReceiveBuf = '';
            this.debug('initConnection calling _commsReset()');
            this._commsReset();
            // Set up serial port communications handlers
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            const onSerialError = (err) => {
                this.debug('Serial error ' + err);
                err = new XError(XError.COMM_ERROR, 'Serial port communication error', err);
                if (!(this as any)._initializing)
                    (this as any).emit('error', err); // don't emit during initialization 'cause that's handled separately (by rejecting the waiters during close())
                this.close(err);
                this._retryConnect();
            };
            const onSerialClose = () => {
                this.debug('Serial close');
                // Note that this isn't called during intended closures via this.close(), since this.close() first removes all handlers
                let err = new XError(XError.COMM_ERROR, 'Serial port closed unexpectedly');
                if (!(this as any)._initializing)
                    (this as any).emit('error', err);
                this.close(err);
                this._retryConnect();
            };
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'buf' implicitly has an 'any' type.
            const onSerialData = (buf) => {
                // Remove any stray XONs, XOFFs, and NULs from the stream
                let newBuf = Buffer.alloc(buf.length);
                let newBufIdx = 0;
                for (let b of buf) {
                    if (b != 0 && b != 17 && b != 19) {
                        newBuf[newBufIdx] = b;
                        newBufIdx++;
                    }
                }
                buf = newBuf.slice(0, newBufIdx);
                let str = (this as any).serialReceiveBuf + buf.toString('utf8');
                let strlines = str.split(/[\r\n]+/);
                if (!strlines[strlines.length - 1].trim()) {
                    // Received data ended in a newline, so don't need to buffer anything
                    strlines.pop();
                    (this as any).serialReceiveBuf = '';
                }
                else {
                    // Last line did not end in a newline, so add to buffer
                    (this as any).serialReceiveBuf = strlines.pop();
                }
                // Process each received line
                for (let line of strlines) {
                    line = line.trim();
                    if (line) {
                        try {
                            this._handleReceiveSerialDataLine(line);
                        }
                        catch (err) {
                            if (!(this as any)._initializing)
                                (this as any).emit('error', err);
                            this.close(err);
                            this._retryConnect();
                            break;
                        }
                    }
                }
            };
            (this as any)._serialListeners = {
                error: onSerialError,
                close: onSerialClose,
                data: onSerialData
            };
            for (let eventName in (this as any)._serialListeners)
                (this as any).serial.on(eventName, (this as any)._serialListeners[eventName]);
            (this as any)._welcomeMessageWaiter = pasync.waiter();
            // Wait for the welcome message to be received; if not received in 5 seconds, send a soft reset
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            const welcomeWaitCancelRunningOpsHandler = (err) => {
                if ((this as any)._welcomeMessageWaiter) {
                    (this as any)._welcomeMessageWaiter.reject(err);
                }
            };
            (this as any).on('cancelRunningOps', welcomeWaitCancelRunningOpsHandler);
            let finishedWelcomeWait = false;
            setTimeout(() => {
                if (!finishedWelcomeWait) {
                    this._writeToSerial('\x18');
                }
            }, 5000);
            try {
                await (this as any)._welcomeMessageWaiter.promise;
            }
            finally {
                finishedWelcomeWait = true;
                (this as any).removeListener('cancelRunningOps', welcomeWaitCancelRunningOpsHandler);
            }
            // Initialize all the machine state properties
            await this._initMachine();
            // Initialization succeeded
            (this as any)._initializing = false;
            (this as any).emit('connected');
            (this as any).emit('initialized');
            if ((this as any).ready)
                (this as any).emit('ready');
            (this as any).emit('statusUpdate');
            this.debug('initConnection() done');
        };
        doInit()
            .catch((err) => {
            this.debug('initConnection() error ' + err);
            console.log(err);
            (this as any).emit('error', new XError(XError.COMM_ERROR, 'Error initializing connection', err));
            this.close(err);
            (this as any)._initializing = false;
            this._retryConnect();
        });
    }
    _retryConnect() {
        this.debug('_retryConnect()');
        if (!(this as any)._retryConnectFlag) {
            this.debug('Skipping, retry connect disabled');
            return;
        }
        if ((this as any)._waitingToRetry) {
            this.debug('Skipping, already waiting to retry');
            return;
        }
        (this as any)._waitingToRetry = true;
        setTimeout(() => {
            (this as any)._waitingToRetry = false;
            this.debug('_retryConnect() calling initConnection()');
            this.initConnection(true);
        }, 5000);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'line' implicitly has an 'any' type.
    request(line) {
        // send line, wait for ack event or error
        return new Promise<void>((resolve, reject) => {
            let hooks = new CrispHooks();
            let resolved = false;
            hooks.hookSync('ack', () => {
                if (resolved)
                    return;
                resolved = true;
                resolve();
            });
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            hooks.hookSync('error', (err) => {
                if (resolved)
                    return;
                resolved = true;
                reject(err);
            });
            this.send(line, { hooks: hooks });
        });
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'eventName' implicitly has an 'any' type... Remove this comment to see the full error message
    _waitForEvent(eventName, condition = null) {
        // wait for the given event, or a cancelRunningOps event
        // return when the condition is true
        return new Promise((resolve, reject) => {
            let finished = false;
            // @ts-expect-error ts-migrate(7034) FIXME: Variable 'eventHandler' implicitly has type 'any' ... Remove this comment to see the full error message
            let eventHandler, errorHandler;
            // @ts-expect-error ts-migrate(7019) FIXME: Rest parameter 'args' implicitly has an 'any[]' ty... Remove this comment to see the full error message
            eventHandler = (...args) => {
                if (finished)
                    return;
                // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
                if (condition && !condition(...args))
                    return;
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'eventHandler' implicitly has an 'any' ty... Remove this comment to see the full error message
                (this as any).removeListener(eventName, eventHandler);
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'errorHandler' implicitly has an 'any' ty... Remove this comment to see the full error message
                (this as any).removeListener('cancelRunningOps', errorHandler);
                finished = true;
                resolve(args[0]);
            };
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            errorHandler = (err) => {
                if (finished)
                    return;
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'eventHandler' implicitly has an 'any' ty... Remove this comment to see the full error message
                (this as any).removeListener(eventName, eventHandler);
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'errorHandler' implicitly has an 'any' ty... Remove this comment to see the full error message
                (this as any).removeListener('cancelRunningOps', errorHandler);
                finished = true;
                reject(err);
            };
            (this as any).on(eventName, eventHandler);
            (this as any).on('cancelRunningOps', errorHandler);
        });
    }
    _startStatusUpdateLoops() {
        if ((this as any)._statusUpdateLoops)
            return;
        (this as any)._statusUpdateLoops = [];
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'interval' implicitly has an 'any' type.
        const startUpdateLoop = (interval, fn) => {
            let fnIsRunning = false;
            let ival = setInterval(() => {
                if (!(this as any).serial)
                    return;
                if (fnIsRunning)
                    return;
                fnIsRunning = true;
                fn()
                    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                    .then(() => { fnIsRunning = false; }, (err) => { fnIsRunning = false; throw err; })
                    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
                    .catch((err) => (this as any).emit('error', err));
            }, interval);
            (this as any)._statusUpdateLoops.push(ival);
        };
        startUpdateLoop((this as any).config.statusUpdateInterval || 250, async () => {
            if ((this as any).serial)
                this.send('?');
        });
    }
    _stopStatusUpdateLoops() {
        if (!(this as any)._statusUpdateLoops)
            return;
        for (let ival of (this as any)._statusUpdateLoops)
            clearInterval(ival);
        (this as any)._statusUpdateLoops = null;
    }
    async fetchUpdateStatusReport() {
        this.send('?');
        return await this._waitForEvent('statusReportReceived');
    }
    async fetchUpdateSettings() {
        await this.request('$N');
        return await this.request('$$');
    }
    async fetchUpdateParameters() {
        await this.request('$I');
        await this.request('$#');
    }
    async fetchUpdateParserParameters() {
        await this.request('$G');
    }
    async _initMachine() {
        await this.fetchUpdateParameters();
        await this.fetchUpdateSettings();
        await this.fetchUpdateStatusReport();
        await this.fetchUpdateParserParameters();
        (this as any).timeEstVM.syncStateToMachine({ controller: this });
        this._startStatusUpdateLoops();
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'block' implicitly has an 'any' type.
    _sendBlock(block, immediate = false) {
        //this.debug('_sendBlock() ' + block.str);
        if (!(this as any).serial)
            throw new XError(XError.INTERNAL_ERROR, 'Cannot send, no serial connection');
        block.responseExpected = true; // note: real-time commands are picked off earlier and not handled here
        if (immediate) {
            this._sendBlockImmediate(block);
            return;
        }
        (this as any).sendQueue.push(block);
        //this.debug('In _sendBlock(), queue: ' + this.sendQueue.map((e) => [ e.str, e.duration, e.timeExecuted ].join(',')).join(' | '));
        if (block.hooks)
            block.hooks.triggerSync('queued', block);
        this._checkSendLoop();
    }
    // Pushes a block onto the sendQueue such that it will be next to be sent, and force it to be sent immediately.
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'block' implicitly has an 'any' type.
    _sendBlockImmediate(block) {
        //this.debug('_sendBlockImmediate() ' + block.str);
        if (!(this as any).serial)
            throw new XError(XError.INTERNAL_ERROR, 'Cannot send, no serial connection');
        block.responseExpected = true;
        // Insert the block where it needs to go in the send queue (as the next to send)
        (this as any).sendQueue.splice((this as any).sendQueueIdxToSend, 0, block);
        if (block.hooks)
            block.hooks.triggerSync('queued', block);
        // Force sending this block
        (this as any).sendImmediateCounter++;
        this._checkSendLoop();
    }
    // Will continue looping (asynchronously) and shifting off the front of sendQueue as long
    // as there's stuff to shift off.
    _commsCheckExecutedLoop() {
        //this.debug('_commsCheckExecutedLoop()');
        if ((this as any)._checkExecutedLoopTimeout !== null) {
            // there's already a timeout running
            //this.debug('Check executed loop already running');
            return;
        }
        // shift off the front of send queue (calling executed hooks) for everything that we think has been executed
        let mtime = this._getCurrentMachineTime();
        // If the grbl planner block buffer is full, don't shift here (we can more accurately determine execution time by when we receive the next ack)
        // This only works in certain circumstances
        if (!((this as any).grblBuildOptions.blockBufferSize && // we can only reliably do this if we definitively know grbl's planner buffer size
            (this as any).sendQueueIdxToReceive >= (this as any).grblBuildOptions.blockBufferSize && // check if grbl's planner is full
            (this as any).sendQueueIdxToSend > (this as any).sendQueueIdxToReceive // at least 1 unacked thing must be present, because the check to shift sendQueue occurs on ack
        )) {
            let shiftedAny = false;
            while ((this as any).sendQueueIdxToReceive > 0 && (this as any).sendQueue[0].timeExecuted <= mtime) {
                //this.debug('_commsCheckExecutedLoop() shifting send queue');
                this._commsShiftSendQueue();
                shiftedAny = true;
            }
            if (shiftedAny)
                this._checkSendLoop();
        }
        // if there's something queued at the front of sendQueue, wait until then
        if ((this as any).sendQueueIdxToReceive > 0 && (this as any)._checkExecutedLoopTimeout === null) {
            const minWait = 100;
            const maxWait = 1000;
            let twait = (this as any).sendQueue[0].timeExecuted - mtime;
            if (twait < minWait)
                twait = minWait;
            if (twait > maxWait)
                twait = maxWait;
            //this.debug('_commsCheckExecutedLoop() scheduling another loop in ' + twait);
            (this as any)._checkExecutedLoopTimeout = setTimeout(() => {
                //this.debug('Retrying _commsCheckExecutedLoop');
                (this as any)._checkExecutedLoopTimeout = null;
                this._commsCheckExecutedLoop();
            }, twait);
        }
    }
    _commsShiftSendQueue() {
        //this.debug('_commsShiftSendQueue()');
        if (!(this as any).sendQueue.length || !(this as any).sendQueueIdxToReceive)
            return;
        let entry = (this as any).sendQueue.shift();
        (this as any).sendQueueIdxToSend--;
        (this as any).sendQueueIdxToReceive--;
        if (entry.hooks)
            entry.hooks.triggerSync('executed', entry);
        if ((this as any).sendQueue.length && (this as any).sendQueueIdxToReceive) {
            (this as any).lastLineExecutingTime = this._getCurrentMachineTime();
            //this.debug('_commsShiftSendQueue triggering executing hook: ' + this.sendQueue[0].str);
            if ((this as any).sendQueue[0].hooks)
                (this as any).sendQueue[0].hooks.triggerSync('executing', (this as any).sendQueue[0]);
        }
        if (!(this as any).sendQueue.length)
            (this as any).emit('_sendQueueDrain');
    }
    _commsHandleAckResponseReceived(error = null) {
        //this.debug('_commsHandleAckResponseReceived');
        if ((this as any).sendQueueIdxToReceive >= (this as any).sendQueueIdxToSend) {
            // Got a response we weren't expecting; ignore it
            return;
        }
        let entry = (this as any).sendQueue[(this as any).sendQueueIdxToReceive];
        if (entry.charCount === undefined)
            throw new XError(XError.INTERNAL_ERROR, 'GRBL communications desync');
        (this as any).unackedCharCount -= entry.charCount;
        if (error === null) {
            if (entry.hooks)
                entry.hooks.triggerSync('ack', entry);
            (this as any).emit('receivedOk', entry);
            // If we're not expecting this to go onto the planner queue, splice it out of the list now.  Otherwise,
            // increment the receive pointer.
            const everythingToPlanner = true; // makes gline hooks execute in order
            if (entry.goesToPlanner || (everythingToPlanner && (this as any).sendQueueIdxToReceive > 0)) {
                // Bump this index to move the entry along the sendQueue
                (this as any).sendQueueIdxToReceive++;
                // Estimate how long this block will take to run once it starts executing
                let estBlockDuration = 0;
                if (entry.gcode) {
                    let { time } = (this as any).timeEstVM.runGcodeLine(entry.gcode);
                    if (time)
                        estBlockDuration = time * 1000;
                }
                entry.duration = estBlockDuration;
                // Estimate a machine timestamp of when this block will have executed
                if ((this as any).sendQueueIdxToReceive >= 2 && (this as any).lastLineExecutingTime) {
                    // there's a line currently executing, so base eta off of that line's executing time
                    entry.timeExecuted = (this as any).lastLineExecutingTime;
                    // add in everything in the planner buffer between the head and this instructions (including this instruction)
                    // TODO: optimize out this loop by storing this value as a running tally
                    for (let i = 0; i < (this as any).sendQueueIdxToReceive; i++)
                        entry.timeExecuted += (this as any).sendQueue[i].duration;
                }
                else {
                    // this line will start to execute right now, so base eta on current time
                    entry.timeExecuted = this._getCurrentMachineTime() + estBlockDuration;
                }
                // Handle case that the entry is at the head of the sendQueue
                if ((this as any).sendQueueIdxToReceive === 1) {
                    // just received response for entry at head of send queue, so assume it's executing now.
                    (this as any).lastLineExecutingTime = this._getCurrentMachineTime();
                    //this.debug('_commsHandleAckResponseReceived calling executing hook at head of sendQueue: ' + entry.str);
                    if (entry.hooks)
                        entry.hooks.triggerSync('executing', entry);
                }
                // If our estimated size of grbl's planner queue is larger than its max size, shift off the front of sendQueue until down to size
                let grblMaxPlannerFill = 18;
                if ((this as any).grblBuildOptions.blockBufferSize)
                    grblMaxPlannerFill = (this as any).grblBuildOptions.blockBufferSize;
                while ((this as any).sendQueueIdxToReceive > grblMaxPlannerFill) {
                    this._commsShiftSendQueue();
                }
            }
            else {
                // No response is expected, or we're at the head of the sendQueue.  So splice the entry out of the queue and call the relevant hooks.
                (this as any).sendQueue.splice((this as any).sendQueueIdxToReceive, 1);
                (this as any).sendQueueIdxToSend--; // need to adjust this for the splice
                // Run through VM
                if (entry.gcode)
                    (this as any).timeEstVM.runGcodeLine(entry.gcode);
                if (entry.hooks) {
                    (this as any).lastLineExecutingTime = this._getCurrentMachineTime();
                    //this.debug('_commsHandleAckResponseReceived calling executing hook; second case: ' + entry.str);
                    entry.hooks.triggerSync('executing', entry);
                    entry.hooks.triggerSync('executed', entry);
                }
                if (!(this as any).sendQueue.length)
                    (this as any).emit('_sendQueueDrain');
            }
        }
        else {
            // Got an error on the request.  Splice it out of sendQueue, and call the error hook on the gcode line
            (this as any).sendQueue.splice((this as any).sendQueueIdxToReceive, 1);
            (this as any).sendQueueIdxToSend--; // need to adjust this for the splice
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            if (!error.data)
                // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
                error.data = {};
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            error.data.request = entry.str;
            if (entry.hooks) {
                entry.hooks.triggerSync('error', error);
            }
            const cancelEverythingOnError = true;
            if (cancelEverythingOnError) {
                this._cancelRunningOps(error);
            }
            else {
                if (!(this as any).sendQueue.length)
                    (this as any).emit('_sendQueueDrain');
            }
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            (this as any).emit('message', error.message);
        }
        //this.debug('_commsHandleAckResponseReceived calling _commsCheckExecutedLoop');
        this._commsCheckExecutedLoop();
        this._checkSendLoop();
    }
    _checkSendLoop() {
        //this.debug('_checkSendLoop()');
        while ((this as any).sendQueueIdxToSend < (this as any).sendQueue.length && this._checkSendToDevice((this as any).sendQueue[(this as any).sendQueueIdxToSend].str.length + 1, (this as any).sendImmediateCounter > 0)) {
            //this.debug('_checkSendLoop() iteration');
            let entry = (this as any).sendQueue[(this as any).sendQueueIdxToSend];
            this._writeToSerial(entry.str + '\n');
            entry.charCount = entry.str.length + 1;
            (this as any).unackedCharCount += entry.charCount;
            (this as any).sendQueueIdxToSend++;
            if ((this as any).sendImmediateCounter > 0)
                (this as any).sendImmediateCounter--;
            if (entry.hooks) {
                entry.hooks.triggerSync('sent', entry);
            }
            (this as any).emit('sent', entry.str);
        }
        // If the next entry queued to receive a response doesn't actually expect a response, generate a "fake" response for it
        // Since _commsHandleAckResponseReceived() calls _checkSendLoop() after it's finished, this process continues for subsequent entries
        if ((this as any).sendQueueIdxToReceive < (this as any).sendQueueIdxToSend && !(this as any).sendQueue[(this as any).sendQueueIdxToReceive].responseExpected) {
            //this.debug('_checkSendLoop() call _commsHandleAckResponseReceived');
            this._commsHandleAckResponseReceived();
        }
    }
    // if preferImmediate is true, this function returns true if it's at all possible to send anything at all to the device
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'charCount' implicitly has an 'any' type... Remove this comment to see the full error message
    _checkSendToDevice(charCount, preferImmediate = false) {
        let bufferMaxFill = 115;
        let absoluteBufferMaxFill = 128;
        if ((this as any).grblBuildOptions.rxBufferSize) {
            absoluteBufferMaxFill = (this as any).grblBuildOptions.rxBufferSize;
            bufferMaxFill = absoluteBufferMaxFill - 13;
        }
        if ((this as any)._disableSending && !preferImmediate)
            return false;
        // Don't send in cases where line requests fullSync
        if ((this as any).sendQueue.length > (this as any).sendQueueIdxToSend && (this as any).sendQueueIdxToSend > 0 && (this as any).sendQueue[(this as any).sendQueueIdxToSend].fullSync) {
            // If next line to send requires fullSync, do not send it until the rest of sendQueue is empty (indicating all previously sent lines have been executed)
            return false;
        }
        if ((this as any).sendQueue.length && (this as any).sendQueue[0].fullSync && (this as any).sendQueueIdxToSend > 0) {
            // If a fullSync line is currently running, do not send anything more until it finishes
            return false;
        }
        if ((this as any).unackedCharCount === 0)
            return true; // edge case to handle if charCount is greater than the buffer size; shouldn't happen, but this prevents it from getting "stuck"
        if ((this as any).unackedCharCount + charCount > (preferImmediate ? absoluteBufferMaxFill : bufferMaxFill))
            return false;
        return true;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    _isImmediateCommand(str) {
        str = str.trim();
        return str === '!' || str === '?' || str === '~' || str === '\x18';
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    _handleSendImmediateCommand(str) {
        str = str.trim();
        this._writeToSerial(str);
        (this as any).emit('sent', str);
        if (str === '?') {
            // status report request; no current additional action
        }
        else if (str === '!') {
            if (!(this as any).held) {
                (this as any).held = true;
                (this as any).lastHoldStartTime = new Date().getTime();
            }
        }
        else if (str === '~') {
            if ((this as any).held) {
                (this as any).totalHeldMachineTime += new Date().getTime() - (this as any).lastHoldStartTime;
                (this as any).lastHoldStartTime = null;
                (this as any).held = false;
            }
        }
        else if (str === '\x18') {
            // reset held state and timer(s)
            if ((this as any).held) {
                (this as any).totalHeldMachineTime += new Date().getTime() - (this as any).lastHoldStartTime;
                (this as any).lastHoldStartTime = null;
                (this as any).held = false;
            }
            if (!this._isSynced() && !(this as any).held) {
                this.homed = [false, false, false];
            }
            // disable sending until welcome message is received
            (this as any)._disableSending = true;
            (this as any).emit('_sendingDisabled');
            (this as any)._resetting = true;
            (this as any).ready = false;
            (this as any).emit('statusUpdate');
            // wait for welcome message to be received; rest of reset is handled in received line handler
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'code' implicitly has an 'any' type.
    sendExtendedAsciiCommand(code) {
        let buf = Buffer.from([code]);
        this._writeToSerial(buf);
        (this as any).emit('sent', '<<' + code + '>>');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    _gcodeLineRequiresSync(gline) {
        // things that touch the eeprom
        return gline.has('G10') || gline.has('G28.1') || gline.has('G30.1') || gline.get('G', 'G54') || gline.has('G28') || gline.has('G30');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    sendGcode(gline, options = {}) {
        let hooks = (options as any).hooks || (gline.triggerSync ? gline : new CrispHooks());
        hooks.hookSync('executing', () => this._updateStateFromGcode(gline));
        this._sendBlock({
            str: gline.toString(),
            hooks: hooks,
            gcode: gline,
            goesToPlanner: 1,
            fullSync: this._gcodeLineRequiresSync(gline)
        }, (options as any).immediate);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
    sendLine(str, options = {}) {
        // Check for "immediate commands" like feed hold that don't go into the queue
        if (this._isImmediateCommand(str)) {
            //this._writeToSerial(str);
            this._handleSendImmediateCommand(str);
            return;
        }
        // If it doesn't start with $, try to parse as gcode
        if (str.length && str[0] !== '$') {
            let gcode = null;
            try {
                gcode = new GcodeLine(str);
            }
            catch (err) { }
            if (gcode) {
                this.sendGcode(gcode, options);
                return;
            }
        }
        let hooks = (options as any).hooks || new CrispHooks();
        let block = {
            str: str,
            hooks: hooks,
            gcode: null,
            goesToPlanner: 0,
            fullSync: true
        };
        // Register hook to update state when this executes
        hooks.hookSync('ack', () => this._updateStateOnOutgoingCommand(block));
        // If can't parse as gcode (or starts with $), send as plain string
        this._sendBlock(block, (options as any).immediate);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'block' implicitly has an 'any' type.
    _updateStateOnOutgoingCommand(block) {
        let cmd = block.str.trim();
        let matches;
        // Once homing is complete, set homing status
        if (cmd === '$H') {
            this.homed = [];
            for (let axisNum = 0; axisNum < (this as any).axisLabels.length; axisNum++)
                this.homed.push(!!(this as any).usedAxes[axisNum]);
        }
        matches = (this as any)._regexSettingsCommand.exec(cmd);
        if (matches) {
            this._handleSettingFeedback(matches[1], matches[2]);
        }
        matches = (this as any)._regexRstCommand.exec(cmd);
        if (matches) {
            // update all local state after a $RST
            this.send('$$');
            this.send('$#');
            this.send('$I');
            this.send('?');
        }
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
    _updateStateFromGcode(gline) {
        //this.debug('_updateStateFromGcode: ' + gline.toString());
        // Do not update state components that we have definite values for from status reports based on if we've ever received such a key in this.currentStatusReport
        let statusUpdates = {};
        // Need to handle F even in the case of simple moves (in case grbl doesn't report it back to us), so do that first
        if (gline.has('F') && !('F' in (this as any).currentStatusReport || 'FS' in (this as any).currentStatusReport)) {
            (statusUpdates as any).feed = gline.get('F');
        }
        // Shortcut case for simple common moves which don't need to be tracked here
        let isSimpleMove = true;
        for (let word of gline.words) {
            if (word[0] === 'G' && word[1] !== 0 && word[1] !== 1) {
                isSimpleMove = false;
                break;
            }
            if (word[0] !== 'G' && word[0] !== 'X' && word[0] !== 'Y' && word[0] !== 'Z' && word[0] !== 'A' && word[0] !== 'B' && word[0] !== 'C' && word[0] !== 'F') {
                isSimpleMove = false;
                break;
            }
        }
        if (isSimpleMove) {
            this._handleStatusUpdate(statusUpdates);
            return;
        }
        let zeropoint = [];
        for (let i = 0; i < (this as any).axisLabels.length; i++)
            zeropoint.push(0);
        if (gline.has('G10') && gline.has('L2') && gline.has('P')) {
            let csys = gline.get('P') - 1;
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            statusUpdates['coordSysOffsets.' + csys] = [];
            for (let axisNum = 0; axisNum < (this as any).axisLabels.length; axisNum++) {
                let axis = (this as any).axisLabels[axisNum].toUpperCase();
                let val = 0;
                if (gline.has(axis))
                    val = gline.get(axis);
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                statusUpdates['coordSysOffsets.' + csys][axisNum] = val;
            }
        }
        if (gline.has('G10') && gline.has('L20') && gline.has('P')) {
            let csys = gline.get('P') - 1;
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            statusUpdates['coordSysOffsets.' + csys] = [];
            for (let axisNum = 0; axisNum < (this as any).axisLabels.length; axisNum++) {
                let axis = (this as any).axisLabels[axisNum].toUpperCase();
                let val = 0;
                if (gline.has(axis))
                    val = gline.get(axis);
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                statusUpdates['coordSysOffsets.' + csys][axisNum] = (this as any).mpos[axisNum] - val;
            }
        }
        if (gline.has('G20') || gline.has('G21')) {
            (statusUpdates as any).units = gline.has('G20') ? 'in' : 'mm';
        }
        if (gline.has('G28.1') || gline.has('G30.1')) {
            let posnum = gline.has('G28.1') ? 0 : 1;
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            statusUpdates['storedPositions.' + posnum] = (this as any).mpos.slice();
        }
        let csysCode = gline.get('G', 'G54');
        if (csysCode && csysCode >= 54 && csysCode <= 59 && Math.floor(csysCode) === csysCode) {
            (statusUpdates as any).activeCoordSys = csysCode - 54;
        }
        if (gline.has('G90') || gline.has('G91')) {
            (statusUpdates as any).incremental = gline.has('G91');
        }
        if (gline.has('G92')) {
            (statusUpdates as any).offset = [];
            for (let axisNum = 0; axisNum < (this as any).axisLabels.length; axisNum++) {
                let axis = (this as any).axisLabels[axisNum].toUpperCase();
                if (gline.has(axis))
                    (statusUpdates as any).offset[axisNum] = gline.get(axis);
                else
                    (statusUpdates as any).offset[axisNum] = 0;
            }
            (statusUpdates as any).offsetEnabled = true;
        }
        if (gline.has('G92.1')) {
            (statusUpdates as any).offset = zeropoint;
            (statusUpdates as any).offsetEnabled = false;
        }
        if (gline.has('G92.2')) {
            (statusUpdates as any).offsetEnabled = false;
        }
        if (gline.has('G92.3')) {
            (statusUpdates as any).offsetEnabled = true;
        }
        if (gline.has('G93') || gline.has('G94')) {
            (statusUpdates as any).inverseFeed = gline.has('G93');
        }
        if (gline.has('M2') || gline.has('M30')) {
            (statusUpdates as any).offset = zeropoint;
            (statusUpdates as any).offsetEnabled = false;
            (statusUpdates as any).activeCoordSys = 0;
            (statusUpdates as any).incremental = false;
            (statusUpdates as any).spindle = false;
            (statusUpdates as any).coolant = false;
        }
        if (gline.has('M3') || gline.has('M4') || gline.has('M5')) {
            (statusUpdates as any).spindle = !gline.has('M5');
            (statusUpdates as any).spindleDirection = gline.has('M4') ? -1 : 1;
            (statusUpdates as any).spindleSpeed = gline.get('S') || null;
        }
        if (gline.has('M7') || gline.has('M8') || gline.has('M9')) {
            if (gline.has('M7'))
                (statusUpdates as any).coolant = 1;
            else if (gline.has('M8'))
                (statusUpdates as any).coolant = 2;
            else
                (statusUpdates as any).coolant = false;
        }
        this._handleStatusUpdate(statusUpdates);
    }
    close(err = null) {
        this.debug('close() ' + err);
        this._stopStatusUpdateLoops();
        if (err && !(this as any).error) {
            (this as any).error = true;
            (this as any).errorData = XError.isXError(err) ? err : new XError(XError.MACHINE_ERROR, '' + err);
        }
        (this as any).ready = false;
        this.debug('close() calling _cancelRunningOps()');
        this._cancelRunningOps(err || new XError(XError.CANCELLED, 'Operations cancelled due to close'));
        if ((this as any).serial) {
            this.debug('close() removing listeners from serial');
            for (let key in (this as any)._serialListeners) {
                (this as any).serial.removeListener(key, (this as any)._serialListeners[key]);
            }
            (this as any)._serialListeners = [];
            (this as any).serial.on('error', () => { }); // swallow errors on this port that we're discarding
            this.debug('close() Trying to close serial');
            try {
                (this as any).serial.close();
            }
            catch (err2) { }
            this.debug('close() done closing serial');
            delete (this as any).serial;
        }
        (this as any).emit('statusUpdate');
        this.debug('close() complete');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'stream' implicitly has an 'any' type.
    sendStream(stream) {
        let waiter = pasync.waiter();
        // Bounds within which to stop and start reading from the stream.  These correspond to the number of queued lines
        // not yet sent to the controller.
        let sendQueueHighWater = (this as any).config.streamSendQueueHighWaterMark || 20;
        let sendQueueLowWater = (this as any).config.streamSendQueueLowWaterMark || Math.min(10, Math.floor(sendQueueHighWater / 5));
        let streamPaused = false;
        let canceled = false;
        const numUnsentLines = () => {
            return (this as any).sendQueue.length - (this as any).sendQueueIdxToSend;
        };
        const sentListener = () => {
            // Check if paused stream can be resumed
            if (numUnsentLines() <= sendQueueLowWater) {
                stream.resume();
                streamPaused = false;
            }
        };
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
        const cancelHandler = (err) => {
            (this as any).removeListener('sent', sentListener);
            (this as any).removeListener('cancelRunningOps', cancelHandler);
            canceled = true;
            waiter.reject(err);
            stream.emit('error', err);
        };
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
        stream.on(stream._isZStream ? 'chainerror' : 'error', (err) => {
            if (canceled)
                return;
            (this as any).removeListener('sent', sentListener);
            (this as any).removeListener('cancelRunningOps', cancelHandler);
            waiter.reject(err);
            canceled = true;
        });
        (this as any).on('sent', sentListener);
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'chunk' implicitly has an 'any' type.
        stream.on('data', (chunk) => {
            if (canceled)
                return;
            if (!chunk)
                return;
            this.send(chunk);
            // if send queue is too full, pause the stream
            if (numUnsentLines() >= sendQueueHighWater) {
                stream.pause();
                streamPaused = true;
            }
        });
        stream.on('end', () => {
            if (canceled)
                return;
            (this as any).removeListener('sent', sentListener);
            (this as any).removeListener('cancelRunningOps', cancelHandler);
            this.waitSync()
                .then(() => waiter.resolve(), (err) => waiter.reject(err));
        });
        (this as any).on('cancelRunningOps', cancelHandler);
        return waiter.promise;
    }
    _isSynced() {
        return (this as any).currentStatusReport.machineState.toLowerCase() === 'idle' &&
            ((this as any).sendQueue.length === 0 || ((this as any)._disableSending && (this as any).sendQueueIdxToReceive === (this as any).sendQueueIdxToSend)) &&
            (this as any)._lastRecvSrOrAck === 'sr';
    }
    waitSync() {
        // Consider the machine to be synced when all of these conditions hold:
        // 1) The machine state indicated by the last received status report indicates that the machine is not moving
        // 2) this.sendQueue is empty (or sending is disabled, and all lines sent out have been processed)
        // 3) A status report has been received more recently than the most recent ack
        //
        // Check if these conditions hold immediately.  If not, send out a status report request, and
        // wait until the conditions become true.
        if ((this as any).error)
            return Promise.reject((this as any).errorData || new XError(XError.MACHINE_ERROR, 'Error waiting for sync'));
        this.send('G4 P0.01'); // grbl won't ack this until its planner buffer is empty
        //if (this._isSynced()) return Promise.resolve();	
        //this.send('?');
        return new Promise<void>((resolve, reject) => {
            const checkSyncHandler = () => {
                if ((this as any).error) {
                    reject((this as any).errorData || new XError(XError.MACHINE_ERROR, 'Error waiting for sync'));
                    removeListeners();
                }
                else if (this._isSynced()) {
                    resolve();
                    removeListeners();
                }
            };
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            const checkSyncErrorHandler = (err) => {
                reject(err);
                removeListeners();
            };
            const okHandler = () => {
                // expedites syncing
                this.send('?');
            };
            const removeListeners = () => {
                (this as any).removeListener('cancelRunningOps', checkSyncErrorHandler);
                (this as any).removeListener('_sendQueueDrain', checkSyncHandler);
                (this as any).removeListener('_sendingDisabled', checkSyncHandler);
                (this as any).removeListener('receivedOk', okHandler);
            };
            (this as any).on('cancelRunningOps', checkSyncErrorHandler);
            // events that can cause a sync: sr received, this.sendQueue drain, sending disabled
            (this as any).on('statusReportReceived', checkSyncHandler);
            (this as any).on('_sendQueueDrain', checkSyncHandler);
            (this as any).on('_sendingDisabled', checkSyncHandler);
            (this as any).on('receivedOk', okHandler);
        });
    }
    hold() {
        this.sendLine('!');
    }
    resume() {
        this.sendLine('~');
    }
    cancel() {
        // grbl doesn't have a queue wipe feature, so use a device reset and work around the issues with that.
        // The issues with this are:
        // 1) If we're currently moving, a reset will cause grbl to lose position.  To account for this, first execute
        //    a feed hold and wait for it to take effect.
        // 2) Even though grbl appears to correctly save position if reset during a feed hold, it still enters an alart
        //    state (position lost) after the reset.  To account for this, check for this state after the reset, and
        //    clear the alarm.
        // 3) On reset, parser state is lost, so save parser state prior to the reset and recover it afterwards, with
        //    the exception of spindle and coolant.  NOTE: This is currently DISABLED because resetting parser state
        //    may actually be expected on cancel.
        const doCancel = async () => {
            // Execute feed hold
            if (!(this as any).held)
                this.hold();
            // Wait for status report to confirm feed hold
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '() => any' is not assignable to ... Remove this comment to see the full error message
            await this._waitForEvent('statusReportReceived', () => (this as any).held && (this as any).currentStatusReport.machineState.toLowerCase() !== 'hold:1');
            // If on an older version of grbl that doesn't support the 'hold complete' substate, wait an additional delay
            if ((this as any).currentStatusReport.machineState.toLowerCase() !== 'hold:0') {
                await pasync.setTimeout(500);
            }
            // Copy relevant parser state to restore later
            let restoreHomed = objtools.deepCopy(this.homed);
            let restoreState = {
                activeCoordSys: (this as any).activeCoordSys,
                units: (this as any).units,
                feed: (this as any).feed,
                incremental: (this as any).incremental,
                inverseFeed: (this as any).inverseFeed
            };
            // Perform the reset (inside a try so we can make sure to restore the ignored messages)
            (this as any)._ignoreUnlockPromptMessage = true;
            try {
                this.reset();
                // Wait for the reset to complete.  Can't use _waitForEvent for this because _waitForEvent fails if
                // operations are cancelled during it, and a reset performs an operation cancel.
                await new Promise<void>((resolve, reject) => {
                    const readyHandler = () => {
                        (this as any).removeListener('initialized', readyHandler);
                        resolve();
                    };
                    // use 'initialized' instead of 'ready' because ready isn't necessarily fired if resetting into an alarm state
                    (this as any).on('initialized', readyHandler);
                });
            }
            finally {
                (this as any)._ignoreUnlockPromptMessage = false;
            }
            // If alarmed due to a loss of position, assume the alarm is erroneous (since we did a feed hold before
            // the reset) and clear it.
            if ((this as any).error && (this as any).errorData && (this as any).errorData.code === XError.MACHINE_ERROR && (this as any).errorData.data && (this as any).errorData.data.subcode === 'position_unknown') {
                (this as any)._ignoreUnlockedMessage = true;
                try {
                    await this.request('$X');
                }
                finally {
                    (this as any)._ignoreUnlockedMessage = false;
                }
            }
            // Restore parser state after reset.  Uses timeEstVM but substitutes our own state object
            this.homed = restoreHomed;
            //let restoreGcodes = this.timeEstVM.syncMachineToState({ vmState: restoreState });
            //for (let l of restoreGcodes) this.send(l);
        };
        doCancel().catch(() => { }); // ignore errors (errors in this process get reported in other ways)
    }
    reset() {
        if (!(this as any).serial)
            return; // no reason to soft-reset GRBL without active connection
        if (!(this as any)._initializing && !(this as any)._resetting) {
            this.sendLine('\x18');
        }
    }
    clearError() {
        if (!(this as any).serial)
            return;
        if ((this as any).errorData && (this as any).errorData.code === XError.SAFETY_INTERLOCK) {
            this.sendExtendedAsciiCommand(0x84);
        }
        else {
            this.send('$X');
        }
    }
    async home() {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'v' implicitly has an 'any' type.
        if (!(this as any).homableAxes || !(this as any).homableAxes.some((v) => v)) {
            throw new XError(XError.INVALID_ARGUMENT, 'No axes configured to be homed');
        }
        await this.request('$H');
    }
    // @ts-expect-error ts-migrate(2705) FIXME: An async function or method in ES5/ES3 requires th... Remove this comment to see the full error message
    async move(pos, feed = null) {
        let gcode = feed ? 'G1' : 'G0';
        for (let axisNum = 0; axisNum < pos.length; axisNum++) {
            if (typeof pos[axisNum] === 'number') {
                gcode += ' ' + (this as any).axisLabels[axisNum].toUpperCase() + pos[axisNum];
            }
        }
        await this.request(gcode);
        await this.waitSync();
    }
    _numInFlightRequests() {
        return (this as any).sendQueue.length - (this as any).sendQueueIdxToReceive;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'axisNum' implicitly has an 'any' type.
    realTimeMove(axisNum, inc) {
        // Make sure there aren't too many requests in the queue
        if (this._numInFlightRequests() > ((this as any).config.realTimeMovesMaxQueued || 8))
            return false;
        // Rate-limit real time move requests according to feed rate
        let rtmTargetFeed = ((this as any).axisMaxFeeds[axisNum] || 500) * 0.98; // target about 98% of max feed rate
        let counterDecrement = (new Date().getTime() - (this as any).realTimeMovesTimeStart[axisNum]) / 1000 * rtmTargetFeed / 60;
        (this as any).realTimeMovesCounter[axisNum] -= counterDecrement;
        if ((this as any).realTimeMovesCounter[axisNum] < 0) {
            (this as any).realTimeMovesCounter[axisNum] = 0;
        }
        (this as any).realTimeMovesTimeStart[axisNum] = new Date().getTime();
        let maxOvershoot = ((this as any).config.realTimeMovesMaxOvershootFactor || 2) * Math.abs(inc);
        if ((this as any).realTimeMovesCounter[axisNum] > maxOvershoot)
            return false;
        (this as any).realTimeMovesCounter[axisNum] += Math.abs(inc);
        // Send the move
        this.send('G91');
        let gcode = 'G0 ' + (this as any).axisLabels[axisNum].toUpperCase() + inc;
        this.send(gcode);
        this.send('G90');
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'pos' implicitly has an 'any' type.
    async probe(pos, feed = null) {
        if (feed === null || feed === undefined)
            // @ts-expect-error ts-migrate(2322) FIXME: Type '25' is not assignable to type 'null'.
            feed = 25;
        await this.waitSync();
        // Probe toward point
        let gcode = new GcodeLine('G38.2 F' + feed);
        let cpos = this.getPos();
        for (let axisNum = 0; axisNum < pos.length; axisNum++) {
            if ((this as any).usedAxes[axisNum] && typeof pos[axisNum] === 'number' && pos[axisNum] !== cpos[axisNum]) {
                gcode.set((this as any).axisLabels[axisNum], pos[axisNum]);
            }
        }
        if ((gcode as any).words.length < 3)
            throw new XError(XError.INVALID_ARGUMENT, 'Cannot probe toward current position');
        this.send(gcode);
        // Wait for a probe report, or an ack.  If an ack is received before a probe report, send out a param request and wait for the probe report to be returned with that.
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'block' implicitly has an 'any' type.
        const ackHandler = (block) => {
            if (block.str.trim() !== '$#' && this._numInFlightRequests() < 10) { // prevent infinite loops and built on send queues
                this.send('$#');
            }
        };
        (this as any).on('receivedOk', ackHandler);
        try {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '(paramName: any) => boolean' is ... Remove this comment to see the full error message
            await this._waitForEvent('deviceParamUpdate', (paramName) => paramName === 'PRB');
        }
        finally {
            (this as any).removeListener('receivedOk', ackHandler);
        }
        let [tripPos, probeTripped] = (this as any).receivedDeviceParameters.PRB;
        if (!probeTripped) {
            (this as any)._ignoreUnlockedMessage = true;
            try {
                // Assume we're in an alarm state now and reset the alarm
                await this.request('$X');
                // Fetch a status report to ensure that status is updated properly
                await this.fetchUpdateStatusReport();
            }
            finally {
                (this as any)._ignoreUnlockedMessage = false;
            }
            (this as any).timeEstVM.syncStateToMachine({ include: ['mpos'], controller: this });
            throw new XError(XError.PROBE_NOT_TRIPPED, 'Probe was not tripped during probing');
        }
        // If the probe was successful, move back to the position the probe tripped
        await this.move(tripPos);
        // Sync the time estimation vm position to the new pos after probing
        (this as any).timeEstVM.syncStateToMachine({ include: ['mpos'], controller: this });
        return tripPos;
    }
    getStatus() {
        let o = super.getStatus();
        (o as any).comms = {
            sendQueueLength: (this as any).sendQueue.length,
            sendQueueIdxToSend: (this as any).sendQueueIdxToSend,
            sendQueueIdxToReceive: (this as any).sendQueueIdxToReceive
        };
        return o;
    }
}
module.exports = GRBLController;
