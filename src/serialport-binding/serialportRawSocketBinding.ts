import AbstractBinding from "@serialport/binding-abstract"
import { OpenOptions, PortInfo } from "serialport"
import net from 'net'

export default class SerialportRawSocketBinding extends AbstractBinding {

    socket?: net.Socket;
    _buffer: Buffer[] = []
    options?: OpenOptions

    public isOpen = false;


    constructor(private opt: OpenOptions) {
        super(opt)
    }

    static async list(): Promise<PortInfo[]>{
        //console.log('L>')
        return Promise.resolve([])
    }
  
    /**
     * Opens a connection to the serial port referenced by the path. Promise resolves after the port
     * is opened, configured and ready for use.
     * @param {string} path the path or com port to open
     * @param {openOptions} options openOptions for the serialport
     * @returns {Promise} Resolves after the port is opened and configured.
     */
    async open(path: string, options: OpenOptions): Promise<void> {
        this.options = options
        return new Promise<void>((resolve, reject) => {
            const url = new URL(path)
            if (url.protocol !== 'socket:') return reject(new Error("Only socket://<server>:<port> path are supported"))
            this.socket = net.createConnection(
                parseInt(url.port),
                url.hostname,
                () => {
                    //console.log("Connesso!")
                    this.isOpen = true
                    resolve()
                }
            )
            //this.socket.on('connect', () => {
            //    console.log("Connection open!")
            //})
            this.socket.on('timeout', () => {
                console.log("Timeout!")
              //  reject(new Error("Connection Timeout"))
            })
            this.socket.on('error', (err) => {
                //console.error(err)
                reject(err)
            })
            this.socket.on("data", (data) => {
               // console.log("<-",data.toString())
                this._buffer.push(data)
            })
        })
    }

    /**
     * Closes an open port
     */
    async close(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.socket) return reject(new Error('no socket to close!'))
            return super.close().then(() => {
                this.socket?.end(() => {
                    this.socket = undefined;
                    this.isOpen = false;
                    resolve()
                })
            });
        })
    }

    /**
     * Request a number of bytes from the SerialPort. This function is similar to Node's
     * [`fs.read`](http://nodejs.org/api/fs.html#fs_fs_read_fd_buffer_offset_length_position_callback)
     * except it will always return at least one byte.
  
     * The in progress reads must error when the port is closed with an error object that has the
     * property `canceled` equal to `true`. Any other error will cause a disconnection.
  
     * @param {buffer} buffer Accepts a [`Buffer`](http://nodejs.org/api/buffer.html) object.
     * @param {integer} offset The offset in the buffer to start writing at.
     * @param {integer} length Specifies the maximum number of bytes to read.
     * @returns {Promise} Resolves with the number of bytes read after a read operation.
     */
    async read(buffer: Buffer, offset: number, length: number): Promise<{ bytesRead: number, buffer: Buffer }> {
        return new Promise((resolve, reject) => {
            if (!this.socket)return reject(new Error("Socket closed!"))
            const reader = () => {
                if (this._buffer.length == 0) {
                    setTimeout(reader, 1000)
                } else {
                    if (this._buffer[0].length <= length) {
                        const nextBuffer = this._buffer.splice(0, 1)[0]
                        nextBuffer.copy(buffer, offset, 0)
                        return resolve({
                            bytesRead: nextBuffer.length,
                            buffer: buffer
                        })
                    } else {
                        const nextBuffer = this._buffer[0]
                        nextBuffer.copy(buffer, offset, 0, length)
                        this._buffer[0] = this._buffer[0].slice(length)
                        return resolve({
                            bytesRead: length,
                            buffer: buffer
                        })
                    }
                }
            }
            reader()
        })
    }

    /**
     * Write bytes to the SerialPort. Only called when there is no pending write operation.
  
     * The in-progress writes must error when the port is closed, with an error object that has the
     * property `canceled` equal to `true`. Any other error will cause a disconnection.
  
     * @param {buffer} buffer - Accepts a [`Buffer`](http://nodejs.org/api/buffer.html) object.
     * @returns {Promise} Resolves after the data is passed to the operating system for writing.
     */
    async write(buffer: Buffer): Promise<void> {
        //console.log("->",buffer.toString())
        return new Promise((resolve, reject) => {
            if (!this.socket)return reject(new Error("Socket is closed!"))
            if (this.socket.write(buffer)) {
                resolve()
            } else {
                reject(new Error("Unable to write to socket!"))
            }
        })
    }

    /**
     * Changes connection settings on an open port. Only `baudRate` is supported.
     * @returns {Promise} Resolves once the port's baud rate changes.
     */
    async update(options: { baudRate: number }): Promise<void> {
        //console.log('U->',options)
        return Promise.resolve()
    }

    /**
     * Set control flags on an open port.
     * @param {object=} options All options are operating system default when the port is opened.
     * Every flag is set on each call to the provided or default values. All options are always provided.
     * @param {Boolean} [options.brk=false] flag for brk
     * @param {Boolean} [options.cts=false] flag for cts
     * @param {Boolean} [options.dsr=false] flag for dsr
     * @param {Boolean} [options.dtr=true] flag for dtr
     * @param {Boolean} [options.rts=true] flag for rts
     * @returns {Promise} Resolves once the port's flags are set.
     */
    async set(options: { brk: boolean, cts: boolean, dst: boolean, dtr: boolean, rts: boolean }): Promise<void> {
        //console.log('S>',options)
        return Promise.resolve()
    }

    /**
     * Get the control flags (CTS, DSR, DCD) on the open port.
     * @returns {Promise} Resolves with the retrieved flags.
     */
    async get(): Promise<{
        cts: boolean;
        dsr: boolean;
        dcd: boolean;
    }> { /* Flags */
        //console.log('<-G ')
        return Promise.resolve({
            cts: false,
            dsr: false,
            dcd: false
        })
    }

    /**
     * Get the OS reported baud rate for the open port. Used mostly for debugging custom baud rates.
     */
    async getBaudRate(): Promise<number> {
       return Promise.resolve(this.opt.baudRate?this.opt.baudRate:0)
    }

    /**
     * Flush (discard) data received but not read, and written but not transmitted.
     * @returns {Promise} Resolves once the flush operation finishes.
     */
    async flush(): Promise<void> {
        //console.log('F')
        this._buffer = []
        return Promise.resolve()
    }

    /**
     * Drain waits until all output data is transmitted to the serial port. An in-progress write
     * should be completed before this returns.
     * @returns {Promise} Resolves once the drain operation finishes.
     */
    async drain(): Promise<void> {
        //console.log('D')
        return Promise.resolve()

    }
}