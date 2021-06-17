import  Operation from './operation';
import  TightCNCServer from './tightcnc-server';
import  SerialPort, { PortInfo } from 'serialport';
import { resolve } from 'path/posix';



class OpGetAvailableSerials extends Operation {
    async run(): Promise<PortInfo[]> {
        // console.log("Cerco le serial!!!")

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

class OpShutdown extends Operation {
    async run(): Promise<void> {
        this.tightcnc!.shutdown()
    }

  //  getParamSchema() { return {} }
}

export default function registerOperations(tightcnc: TightCNCServer) {
    tightcnc.registerOperation('getAvailableSerials', OpGetAvailableSerials);
    tightcnc.registerOperation('shutdown', OpShutdown);
}
