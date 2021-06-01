import Operation from './operation';
import fs from 'fs';
import path from 'path';
import  objtools from 'objtools';
import commonSchema from 'common-schema';
import  XError from 'xerror';

const jobOptionsSchema = {
    type: 'object',
    properties: {
        filename: { type: String, description: 'Filename of gcode to run' },
        macro: {
            type: String,
            description: 'Name of generator macro to use as gcode source',
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'str' implicitly has an 'any' type.
            validate: (str) => {
                if (str.indexOf(';') !== -1)
                    throw new commonSchema.FieldError('invalid', 'Cannot supply raw javascript');
                if (!/^generator-/.test(str))
                    throw new commonSchema.FieldError('invalid', 'Macro name must begin with generator-');
            }
        },
        macroParams: {
            type: 'mixed',
            description: 'Macro parameters, if macro is used'
        },
        rawFile: { type: Boolean, default: false, description: 'Do not process the gcode in the file at all.  Also disables stats.' },
        gcodeProcessors: [
            {
                name: { type: String, description: 'Name of gcode processor', required: true },
                options: { type: 'mixed', description: 'Options to pass to the gcode processor', default: {} },
                order: { type: 'number', description: 'Optional order number for gcode processor position in chain' }
            }
        ]
    },
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'obj' implicitly has an 'any' type.
    validate(obj) {
        if (!obj.filename && !obj.macro)
            throw new commonSchema.FieldError('invalid', 'Must supply either filename or macro');
        if (obj.filename && obj.macro)
            throw new commonSchema.FieldError('invalid', 'Cannot supply both filename and macro');
    }
};
class OpStartJob extends Operation {
    getParamSchema() {
        return jobOptionsSchema;
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let jobOptions = {
            filename: params.filename ? (this as any).tightcnc.getFilename(params.filename, 'data') : undefined,
            macro: params.macro,
            macroParams: params.macroParams,
            gcodeProcessors: params.gcodeProcessors,
            rawFile: params.rawFile
        };
        return await (this as any).tightcnc.jobManager.startJob(jobOptions);
    }
}
class OpJobDryRun extends Operation {
    getParamSchema() {
        return objtools.merge({}, jobOptionsSchema, {
            outputFilename: { type: String, description: 'Save processed gcode from dry run into this file' }
        });
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let jobOptions = {
            filename: params.filename ? (this as any).tightcnc.getFilename(params.filename, 'data') : undefined,
            macro: params.macro,
            macroParams: params.macroParams,
            gcodeProcessors: params.gcodeProcessors,
            rawFile: params.rawFile
        };
        return await (this as any).tightcnc.jobManager.dryRunJob(jobOptions, params.outputFilename ? (this as any).tightcnc.getFilename(params.outputFilename, 'data') : null);
    }
}
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
export default function registerOperations(tightcnc) {
    tightcnc.registerOperation('startJob', OpStartJob);
    tightcnc.registerOperation('jobDryRun', OpJobDryRun);
}
