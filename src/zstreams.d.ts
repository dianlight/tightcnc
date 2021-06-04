declare module 'zstreams' {

    import * as stream from 'stream'

    export interface Options {
        objectMode?: boolean,
        readableObjectMode?: boolean,
        writableObjectMode?: boolean,
        highWaterMark?: number,
        readableHighWaterMark?:number
        writableHighWaterMark?:number

        transform?: () => void
        flush?: () => void
    }

    class ZTransform extends stream.Transform {
        constructor(options?: Options )
    }

    class SplitStream extends ZTransform {
//        constructor(options?: Options)
        constructor(delimeter?: RegExp, options?: Options)
    }

    class ZWritable extends stream.Transform {
        constructor(options?:Options)
    }

    class ZRedable extends stream.Readable {
        constructor(options?: Options)
        // Data to Data, Synchronous
        throughSync(fn:(chunk: any, encoding?: string) => any)

        // Data to Object, Synchronous
        throughObjSync(fn:(chunk:any, encoding:string)=>any) 


        // Object to Data, Synchronous
        throughDataSync(fn: (object: any) => any)
        
        // Data to Data, Asynchronous
        through(fn:(chunk:any, encoding?:string, cb:(a:null,resultData:any)=>void)=>void)


        // With a promise
        through(fn:(object: any)=>any|Promise<any>)


        // Data to Object, Asynchronous
        throughObj(fn:(chunk:any, encoding?:string, cb:(a:null,resultData:any)=>void)=>void)

        // Object to Data, Asynchronous
        throughDataSync(fn:(objectany, cb:(a:null,resultData:any)=>void)=>void)
    }

    class ZPassThrough extends stream.PassThrough {
        constructor(options?:Options)
    }

    class ThroughStream extends ZTransform {
        constructor( fn:(chunk,enc,cb)=>any ,options?:Options)
    }

    class BlackholeStream extends ZWritable {
        constructor( options?: Options)
    }

    export default class ZStreams extends stream.Stream{
        constructor(stream: ReadableStream)

        static Transform: typeof ZTransform
        static SplitStream: typeof SplitStream
        static PassThrough: typeof ZPassThrough
        static Readable: typeof ZRedable

        static fromArray(array: Array, options?: Options)
        static fromFile(path: string, options?: Options)

        static ThroughStream: typeof ThroughStream
        static BlackholeStream: typeof BlackholeStream


        

    }

}
