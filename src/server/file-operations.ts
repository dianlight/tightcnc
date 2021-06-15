import Operation from './operation';
import  fs from 'fs';
import  path from 'path';
import TightCNCServer from './tightcnc-server';
import {addExitCallback} from 'catch-exit';
import { filemanager } from 'blessed';

class OpListFiles extends Operation {
    /*
    override getParamSchema() {
        return {
            dir: {
                type: 'string',
                required: true,
                default: 'data',
                description: 'Name of directory to list'
            }
        };
    }
    */
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let dir = this.tightcnc.getFilename(undefined, params.dir, false, true, true);
        let files = await new Promise<string[]>((resolve, reject) => {
            fs.readdir(dir, (err: any, files: string[] | PromiseLike<string[]>) => {
                if (err)
                    reject(err);
                else
                    resolve(files);
            });
        });
        let retfiles = [];
        for (let file of files) {
            let stat = await new Promise((resolve, reject) => {
                fs.stat(path.join(dir, file), (err, stat) => {
                    if (err)
                        reject(err);
                    else
                        resolve(stat);
                });
            });
            let type;
            if ((stat as any).isDirectory()) {
                type = 'dir';
            }
            else if ((stat as any).isFile() && /(\.gcode|\.nc)$/i.test(file)) {
                type = 'gcode';
            }
            else {
                type = 'other';
            }
            retfiles.push({
                name: file,
                type: type,
                mtime: (stat as any).mtime.toISOString()
            });
        }
        retfiles.sort((a, b) => {
            if (a.mtime > b.mtime)
                return -1;
            if (a.mtime < b.mtime)
                return 1;
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        });
        return retfiles;
    }
}
class OpUploadFile extends Operation {
    /*
    override getParamSchema() {
        return {
            filename: {
                type: String,
                required: true,
                description: 'Remote filename to save file as',
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
                validate: (val) => {
                    if (!(/\.(nc|gcode)$/i.test(val)))
                        throw new commonSchema.FieldError('invalid', 'Filename must end in .nc or .gcode');
                    if (val.indexOf('/') !== -1)
                        throw new commonSchema.FieldError('invalid', 'Subdirectories not supported');
                }
            },
            data: {
                type: String,
                required: true,
                description: 'File data'
            }
        };
    }
    */
    async run(params: {
        filename: string,
        data: string
        makeTmp?:boolean
    }) {
        let fullFilename = this.tightcnc.getFilename(params.filename, 'data', false, true);
        await new Promise<void>((resolve, reject) => {
            fs.writeFile(fullFilename, params.data, (err) => {
                if (err)
                    reject(err);
                else {
                    if (params.makeTmp) {
                        addExitCallback(signal => {
                            console.debug("Removing tmp file", fullFilename)
                            fs.unlinkSync(fullFilename)
                        } )
                    }
                    resolve();
                }
            });
        });
    }
}

export function registerOperations(tightcnc: TightCNCServer) {
    tightcnc.registerOperation('listFiles', OpListFiles);
    tightcnc.registerOperation('uploadFile', OpUploadFile);
}
