import objtools from 'objtools';
import XError from 'xerror';
import zstreams from 'zstreams';
const GcodeProcessor = require('../../lib/gcode-processor');
//import fs from 'fs';
//import path from 'path';
import JobState from './job-state';
import TightCNCServer from './tightcnc-server';
export default class JobManager {

    currentJob?:any;

    constructor(public tightcnc:TightCNCServer) {
    }
    initialize() {
    }
    getStatus(job?:any) {
        if (!job)
            job = this.currentJob;
        if (!job)
            return null;
        // Fetch the status from each gcode processor
        let gcodeProcessorStatuses = undefined;
        if (job.gcodeProcessors) {
            gcodeProcessorStatuses = {};
            for (let key in job.gcodeProcessors) {
                let s = job.gcodeProcessors[key].getStatus();
                if (s) {
                    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    gcodeProcessorStatuses[key] = s;
                }
            }
        }
        // Calculate main stats and progress
        let progress = undefined;
        let stats = this._mainJobStats(gcodeProcessorStatuses);
        (stats as any).predictedTime = stats.time;
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'final-job-vm' does not exist on type '{}... Remove this comment to see the full error message
        let finalVMStatus = gcodeProcessorStatuses && gcodeProcessorStatuses['final-job-vm'];
        if (finalVMStatus && (finalVMStatus as any).updateTime && !job.dryRun) {
            let curTime = new Date((finalVMStatus as any).updateTime);
            (stats as any).updateTime = curTime.toISOString();
            stats.time = (curTime.getTime() - new Date(job.startTime).getTime()) / 1000;
            // create job progress object
            if (job.dryRunResults && job.dryRunResults.stats && job.dryRunResults.stats.time) {
                let estTotalTime = job.dryRunResults.stats.time;
                if (stats.lineCount >= 300) { // don't adjust based on current time unless enough lines have been processed to compensate for stream buffering
                    estTotalTime *= (curTime.getTime() - new Date(job.startTime).getTime()) / 1000 / (stats as any).predictedTime;
                }
                progress = {
                    timeRunning: stats.time,
                    estTotalTime: estTotalTime,
                    estTimeRemaining: Math.max(estTotalTime - stats.time, 0),
                    percentComplete: Math.min(stats.time / (estTotalTime || 1) * 100, 100)
                };
            }
        }
        // Return status
        return {
            state: (job.waitList && job.waitList.length && job.state === 'running') ? 'waiting' : job.state,
            jobOptions: job.jobOptions,
            dryRunResults: job.dryRunResults,
            startTime: job.startTime,
            error: job.state === 'error' ? job.error.toString() : null,
            gcodeProcessors: gcodeProcessorStatuses,
            stats: stats,
            progress: progress,
            waits: job.waitList
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gcodeProcessorStats' implicitly has an ... Remove this comment to see the full error message
    _mainJobStats(gcodeProcessorStats) {
        if (!gcodeProcessorStats || !gcodeProcessorStats['final-job-vm'])
            return { time: 0, line: 0, lineCount: 0 };
        return {
            time: gcodeProcessorStats['final-job-vm'].totalTime,
            line: gcodeProcessorStats['final-job-vm'].line,
            lineCount: gcodeProcessorStats['final-job-vm'].lineCounter
        };
    }
    /**
     * Start running a job on the machine.
     *
     * @method startJob
     * @param {Object} jobOptions
     *   @param {String} jobOptions.filename - The input gcode file for the job.
     *   @param {Mixed} jobOptions.macro - Instead of filename, get the gcode from a generator macro
     *   @param {Object} jobOptions.macroParams - Parameters for the macro if running job from macro
     *   @param {Object[]} jobOptions.gcodeProcessors - The set of gcode processors to apply, in order, along with
     *     options for each.
     *     @param {String} options.gcodeProcessors.#.name - Name of gcode processor.
     *     @param {Object} options.gcodeProcessors.#.options - Additional options to pass to gcode processor constructor.
     *     @param {Number} options.gcodeProcessors.#.order - Optional order number
     *   @param {Boolean} [options.rawFile=false] - If true, pass the file unaltered to the controller, without running
     *     any gcode processors.  (Will disable status reports)
     */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'jobOptions' implicitly has an 'any' typ... Remove this comment to see the full error message
    async startJob(jobOptions) {
        this.tightcnc.debug('Begin startJob');
        // @ts-expect-error ts-migrate(7034) FIXME: Variable 'job' implicitly has type 'any' in some l... Remove this comment to see the full error message
        let job = null;
        // First do a dry run of the job to fetch overall stats
        let dryRunResults = await this.dryRunJob(jobOptions);
        // Set up the gcode processors for this job
        let origJobOptions = jobOptions;
        jobOptions = objtools.deepCopy(jobOptions);
        if (jobOptions.filename)
            jobOptions.filename = this.tightcnc.getFilename(jobOptions.filename, 'data', true);
        if (jobOptions.rawFile) {
            delete jobOptions.gcodeProcessors;
        }
        else {
            // add default gcode vm processor to enable basic status updates automatically
            if (!jobOptions.gcodeProcessors)
                jobOptions.gcodeProcessors = [];
            jobOptions.gcodeProcessors.push({
                name: 'gcodevm',
                options: {
                    id: 'final-job-vm',
                    updateOnHook: 'executed'
                },
                order: 1000000
            });
        }
        // Check to ensure current job isn't running and that the controller is ready
        if (this.currentJob && this.currentJob.state !== 'complete' && this.currentJob.state !== 'cancelled' && this.currentJob.state !== 'error') {
            throw new XError(XError.INTERNAL_ERROR, 'Cannot start job with another job running.');
        }
        if (!this.tightcnc.controller!.ready) {
            throw new XError(XError.INTERNAL_ERROR, 'Controller not ready.');
        }
        // Create the current job object
        this.currentJob = new JobState({
            state: 'initializing',
            jobOptions: origJobOptions,
            dryRunResults: dryRunResults,
            startTime: new Date().toISOString()
        });
        job = this.currentJob;
        // Clear the message log
        this.tightcnc.messageLog?.clear();
        this.tightcnc.messageLog?.log('Job started.');
        // Wait for the controller to stop moving
        this.tightcnc.debug('startJob waitSync');
        await this.tightcnc.controller?.waitSync();
        // Note that if the following few lines have any await's in between them, it could result
        // in certain errors from gcode processors breaking things, since errors are handled through
        // Controller#sendStream().
        // Build the processor chain
        this.tightcnc.debug('startJob getGcodeSourceStream');
        let source = this.tightcnc.getGcodeSourceStream({
            filename: jobOptions.filename,
            macro: jobOptions.macro,
            macroParams: jobOptions.macroParams,
            gcodeProcessors: jobOptions.gcodeProcessors,
            rawStrings: jobOptions.rawFile,
            job: job
        });
        job.sourceStream = source;
        job.emitJobStart();
        // Pipe it to the controller, asynchronously
        this.tightcnc.debug('startJob pipe stream');
        this.tightcnc.controller?.sendStream(source)
            .then(() => {
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
            job.state = 'complete';
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
            job.emitJobComplete();
        })
            .catch((err) => {
            if (err.code === XError.CANCELLED) {
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.state = 'cancelled';
            }
            else {
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.state = 'error';
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.error = err;
                console.error('Job error: ' + err);
                console.error(err.stack);
            }
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
            job.emitJobError(err);
        });
        // Wait until the processorChainReady event (or chainerror event) fires on source (indicating any preprocessing is done)
        this.tightcnc.debug('startJob wait for processorChainReady');
        await new Promise<void>((resolve, reject) => {
            let finished = false;
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter '_chain' implicitly has an 'any' type.
            source.on('processorChainReady', (_chain, chainById) => {
                if (finished)
                    return;
                finished = true;
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.gcodeProcessors = chainById;
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.startTime = new Date().toISOString();
                resolve();
            });
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
            source.on('chainerror', (err) => {
                if (finished)
                    return;
                finished = true;
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.state = 'error';
                // @ts-expect-error ts-migrate(7005) FIXME: Variable 'job' implicitly has an 'any' type.
                job.error = err;
                reject(err);
            });
        });
        job.state = 'running';
        this.tightcnc.debug('End startJob');
        return this.getStatus(job);
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'jobOptions' implicitly has an 'any' typ... Remove this comment to see the full error message
    async dryRunJob(jobOptions, outputFile?:string) {
        this.tightcnc.debug('Begin dryRunJob');
        let origJobOptions = jobOptions;
        jobOptions = objtools.deepCopy(jobOptions);
        if (jobOptions.filename)
            jobOptions.filename = this.tightcnc.getFilename(jobOptions.filename, 'data', true);
        if (outputFile)
            outputFile = this.tightcnc.getFilename(outputFile, 'data', true);
        if (jobOptions.rawFile) {
            delete jobOptions.gcodeProcessors;
        }
        else {
            // add default gcode vm processor to enable basic status updates automatically
            if (!jobOptions.gcodeProcessors)
                jobOptions.gcodeProcessors = [];
            jobOptions.gcodeProcessors.push({
                name: 'gcodevm',
                options: {
                    id: 'final-job-vm'
                },
                order: 1000000
            });
        }
        let job = new JobState({
            state: 'initializing',
            jobOptions: origJobOptions,
            startTime: new Date().toISOString(),
            dryRun: true
        });
        // Do dry run to get overall stats
        this.tightcnc.debug('Dry run getGcodeSourceStream');
        let source = this.tightcnc.getGcodeSourceStream({
            filename: jobOptions.filename,
            macro: jobOptions.macro,
            macroParams: jobOptions.macroParams,
            gcodeProcessors: jobOptions.gcodeProcessors,
            rawStrings: jobOptions.rawFile,
            dryRun: true,
            job: job
        });
        let origSource = source;
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'gline' implicitly has an 'any' type.
        source = source.through((gline) => {
            // call hooks on each line (since there's no real controller to do it)
            (GcodeProcessor as any).callLineHooks(gline);
            return gline;
        });
        job.sourceStream = source;
        job.state = 'running';
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter '_chain' implicitly has an 'any' type.
        origSource.on('processorChainReady', (_chain, chainById) => {
            job.gcodeProcessors = chainById;
        });
        this.tightcnc.debug('Dry run stream');
        if (outputFile) {
            await source
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'chunk' implicitly has an 'any' type.
                .throughData((chunk) => {
                if (typeof chunk === 'string')
                    return chunk + '\n';
                else
                    return chunk.toString() + '\n';
            })
                .intoFile(outputFile);
        }
        else {
            await source.pipe(new zstreams.BlackholeStream({ objectMode: true })).intoPromise();
        }
        job.state = 'complete';
        if (!job.gcodeProcessors)
            job.gcodeProcessors = origSource.gcodeProcessorChainById || {};
        // Get the job stats
        this.tightcnc.debug('Dry run get stats');
        /*let gpcStatuses = {};
        let gpc = origSource.gcodeProcessorChainById || {};
        for (let key in gpc) {
            let s = gpc[key].getStatus();
            if (s) {
                gpcStatuses[key] = s;
            }
        }*/
        let ret = this.getStatus(job);
        this.tightcnc.debug('End dryRunJob');
        /*return {
            jobOptions: origJobOptions,
            stats: this._mainJobStats(gpcStatuses),
            gcodeProcessors: gpcStatuses
        };*/
        return ret;
    }
}