import  Operation from './operation';
import  TightCNCServer from './tightcnc-server';
import  SerialPort, { PortInfo } from 'serialport';
//import { resolve } from 'path/posix';
//import { GcodeProcessor } from './new-gcode-processor/GcodeProcessor';
import { JSONSchema7 } from 'json-schema';
import { UISchemaElement } from '@jsonforms/core'



class OpGetAvailableSerials extends Operation {

    override getParamSchema() {
        return {
            $schema: "http://json-schema.org/draft-07/schema#",
            $id: "/getAvailableSerials",
        } as JSONSchema7
    }

    async run(): Promise<PortInfo[]> {
        return new Promise<PortInfo[]>((resolve, reject) => {
            SerialPort.list().then(portInfos => {
                // console.log('Serial PortInfo', portInfos)
                resolve(portInfos)
            })
        })
    }

}

class OpGetAvailableOperations extends Operation {

    override getParamSchema() {
        return {
            $schema: "http://json-schema.org/draft-07/schema#",
            $id: "/getAvailableOperations",
        } as JSONSchema7
    }

    async run(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            resolve(Object.keys(this.tightcnc.operations))
        })
    }

  //  getParamSchema() { return {} }
}


class OpGetAvailableGcodeProcessors extends Operation {

    override getParamSchema() {
        return {
            $schema: "http://json-schema.org/draft-07/schema#",
            $id: "/getAvailableGcodeProcessors",
        } as JSONSchema7
    }

    async run(): Promise<Record<string,{
        schema: JSONSchema7,
        uiSchema: UISchemaElement|void
    }>> {
        return new Promise<Record<string,{
            schema: JSONSchema7,
            uiSchema: UISchemaElement | void
        }>>((resolve, reject) => {
            resolve(Object.keys(this.tightcnc.gcodeProcessors)
                .reduce((prev: Record<string, {
                    schema: JSONSchema7,
                    uiSchema: (UISchemaElement | void) 
                }>, cur: string) => {
                    prev[cur] = {
                        schema: this.tightcnc.gcodeProcessors[cur].getOptionSchema(),
                        uiSchema: this.tightcnc.gcodeProcessors[cur].getOptionUISchema()
                    }
                    return prev;
                }, {} as Record<string, {
                    schema: JSONSchema7,
                    uiSchema: UISchemaElement | void
                }>))
        })
    }

}

/*
class OpShutdown extends Operation {
    async run(): Promise<void> {
        this.tightcnc!.shutdown()
    }

  //  getParamSchema() { return {} }
}
*/

export default function registerOperations(tightcnc: TightCNCServer) {
    tightcnc.registerOperation(/*'getAvailableSerials',*/ OpGetAvailableSerials);
    tightcnc.registerOperation(/*'getAvailableOperations',*/ OpGetAvailableOperations);
    tightcnc.registerOperation(/*'getAvailableGcodeProcessors',*/ OpGetAvailableGcodeProcessors);
//    tightcnc.registerOperation('shutdown', OpShutdown);
}
