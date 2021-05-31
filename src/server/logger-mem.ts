class LoggerMem {
    constructor(config = {}) {
        (this as any).linesToKeep = (config as any).size || 5000;
        (this as any).shiftBatchSize = (config as any).shiftBatchSize || Math.ceil((this as any).linesToKeep / 10);
        (this as any).lines = [];
        (this as any).nextNum = 1;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'type' implicitly has an 'any' type.
    log(type, msg) {
        if (msg === undefined) {
            // single argument given - log raw line
            msg = type;
        }
        else {
            // 2 arguments given, a type and a message
            if (typeof msg !== 'string')
                msg = JSON.stringify(msg);
            if (type === 'send')
                msg = '> ' + msg;
            else if (type === 'receive')
                msg = '< ' + msg;
            else
                msg = '@ ' + msg;
            msg = msg.trim();
        }
        (this as any).lines.push([(this as any).nextNum, msg]);
        (this as any).nextNum++;
        if ((this as any).lines.length >= (this as any).linesToKeep + (this as any).shiftBatchSize) {
            (this as any).lines = (this as any).lines.slice((this as any).lines.length - (this as any).linesToKeep);
        }
    }
    clear() {
        (this as any).lines = [];
        (this as any).nextNum = 1;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'start' implicitly has an 'any' type.
    section(start, end, limit) {
        if (start === null || start === undefined)
            start = 0;
        if (start < 0)
            start = (this as any).nextNum + start;
        if (start > (this as any).nextNum) {
            // Assume that server has restarted and client hasn't caught up.  Return the desired number of lines, up to the end of our buffer.
            if (end === null || end === undefined) {
                if (!limit)
                    return (this as any).lines;
                else
                    return (this as any).lines.slice(-limit);
            }
            else if (end <= start) {
                return [];
            }
            else {
                let numRequested = end - start;
                if (limit && limit < numRequested)
                    numRequested = limit;
                let startIdx = (this as any).lines.length - numRequested;
                if (startIdx < 0)
                    startIdx = 0;
                return (this as any).lines.slice(startIdx);
            }
        }
        if (start === (this as any).nextNum || !(this as any).lines.length)
            return [];
        let linesStartNum = (this as any).lines[0][0];
        if (start < linesStartNum)
            start = linesStartNum;
        if (end === null || end === undefined)
            end = (this as any).nextNum;
        if (end < 0)
            end = (this as any).nextNum + end;
        if (end > (this as any).nextNum)
            end = (this as any).nextNum;
        if (end <= start)
            return [];
        let startIdx = start - linesStartNum;
        let endIdx = end - linesStartNum;
        if (limit && endIdx - startIdx > limit)
            startIdx = endIdx - limit;
        return (this as any).lines.slice(startIdx, endIdx);
    }
}
module.exports = LoggerMem;
