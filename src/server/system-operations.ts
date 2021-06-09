import  Operation from './operation';
import  TightCNCServer from './tightcnc-server';
import  SerialPort, { PortInfo } from 'serialport';



class OpGetAvailableSerials extends Operation {
    async run(): Promise<PortInfo[]> {
        // FIXME: Need to use configured controlle to check custom bindings
        return SerialPort.list()
    }

    getParamSchema() { return {} }
}

class OpShutdown extends Operation {
    async run(): Promise<void> {
        this.tightcnc!.shutdown()
    }

    getParamSchema() { return {} }
}

export default function registerOperations(tightcnc: TightCNCServer) {
    tightcnc.registerOperation('getAvailableSerials', OpGetAvailableSerials);
}
