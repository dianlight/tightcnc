import  Operation from './operation';
import  TightCNCServer from './tightcnc-server';
import  SerialPort, { PortInfo } from 'serialport';
import { resolve } from 'path/posix';
import { GcodeProcessor } from './new-gcode-processor/GcodeProcessor';



class OpGetAvailableSerials extends Operation {

    async run(): Promise<PortInfo[]> {

        // FIXME: Need to use configured controlle to check custom bindings
        return new Promise<PortInfo[]>((resolve, reject) => {
            SerialPort.list().then(portInfos => {
                // console.log('Serial PortInfo', portInfos)
                resolve(portInfos)
            })
        })
    }

  //  getParamSchema() { return {} }
}

class OpGetAvailableOperations extends Operation {
    async run(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            resolve(Object.keys(this.tightcnc.operations))
        })
    }

  //  getParamSchema() { return {} }
}

class OpGetAvailableGcodeProcessors extends Operation {
    async run(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            resolve(Object.keys(this.tightcnc.gcodeProcessors))
        })
    }

  //  getParamSchema() { return {} }
}

class OpShutdown extends Operation {
    async run(): Promise<void> {
        this.tightcnc!.shutdown()
    }

  //  getParamSchema() { return {} }
}

export default function registerOperations(tightcnc: TightCNCServer) {
    tightcnc.registerOperation('getAvailableSerials', OpGetAvailableSerials);
    tightcnc.registerOperation('getAvailableOperations', OpGetAvailableOperations);
    tightcnc.registerOperation('getAvailableGcodeProcessors', OpGetAvailableGcodeProcessors);
    tightcnc.registerOperation('shutdown', OpShutdown);
}
