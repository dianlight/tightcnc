import Operation from './operation';
import  objtools from 'objtools';
//import commonSchema from 'common-schema';
import TightCNCServer, { JobSourceOptions } from './tightcnc-server';



const jobOptionsSchema = {
    type: 'object',
    properties: {
        filename: { type: String, description: 'Filename of gcode to run' },
        macro: {
            type: String,
            description: 'Name of generator macro to use as gcode source',
            validate: (str: string) => {
                /*
                if (str.indexOf(';') !== -1)
                    throw new commonSchema.FieldError('invalid', 'Cannot supply raw javascript');
                if (!/^generator-/.test(str))
                    throw new commonSchema.FieldError('invalid', 'Macro name must begin with generator-');
                    */
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

    validate(obj: JobSourceOptions) {
        /*
        if (!obj.filename && !obj.macro)
            throw new commonSchema.FieldError('invalid', 'Must supply either filename or macro');
        if (obj.filename && obj.macro)
            throw new commonSchema.FieldError('invalid', 'Cannot supply both filename and macro');
            */
    }
};
class OpStartJob extends Operation {
    /*
    override getParamSchema() {
        return jobOptionsSchema;
    }
    */
    async run(params: JobSourceOptions) {
        let jobOptions = {
            filename: params.filename ? this.tightcnc.getFilename(params.filename, 'data') : undefined,
            macro: params.macro,
            macroParams: params.macroParams,
            gcodeProcessors: params.gcodeProcessors,
            rawFile: params.rawFile
        };
        return await this.tightcnc!.jobManager?.startJob(jobOptions);
    }
}

interface JobOptionsDryRun extends JobSourceOptions {
    outputFilename: string
}
class OpJobDryRun extends Operation {
    /*
    override getParamSchema() {
        return objtools.merge({}, jobOptionsSchema, {
            outputFilename: { type: String, description: 'Save processed gcode from dry run into this file' }
        });
    }
    */

    async run(params: JobOptionsDryRun) {
        let jobOptions = {
            filename: params.filename ? this.tightcnc.getFilename(params.filename, 'data') : undefined,
            macro: params.macro,
            macroParams: params.macroParams,
            gcodeProcessors: params.gcodeProcessors,
            rawFile: params.rawFile
        };
        return await this.tightcnc!.jobManager?.dryRunJob(jobOptions, params.outputFilename ? this.tightcnc?.getFilename(params.outputFilename, 'data') : undefined);
    }
}
export default function registerOperations(tightcnc:TightCNCServer) {
    tightcnc.registerOperation('startJob', OpStartJob);
    tightcnc.registerOperation('jobDryRun', OpJobDryRun);
}
