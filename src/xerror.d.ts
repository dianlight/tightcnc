declare module 'xerror' {
    interface RegisterOption {
        [key: string]: unknown,
        // default error message to use with this error code
        message?: string,
        // the http response code to map from this error code
        http?: number,
        // you can add other custom fields as well
        aliasOf?: string
    }
    
    export default class XError {

        static [key: string]: string

        static NOT_FOUND: string
        static ACCESS_DENIED: string
        static INVALID_ARGUMENT: string
        static CANCELLED: string
        static INTERNAL_ERROR: string
        static UNSUPPORTED_OPERATION: string
        static PROBE_NOT_TRIPPED: string
        static COMM_ERROR: string
        static MACHINE_ERROR: string
        static PARSE_ERROR: string
        static SAFETY_INTERLOCK: string
        static LIMIT_HIT: string
        static PROBE_INITIAL_STATE: string
        static BAD_REQUEST: string

        code: string; //  The string error code, like internal_error
        message: string; // - Human-readable error message
        data?: unknown; //  - Object containing extra data about the error
        privateData?: unknown; // - Object containing sensitive data about the error
        cause?: Error | XError; // - XError or Error instance that triggered this error
        stack?: string; // - Stack trace of where this error is constructed

        constructor(message: string)
        constructor(cause: Error | XError)
        constructor(message: string, cause?: Error | XError)
        constructor(code: string, message?: string,  data?: unknown, privateData?: unknown, cause?: Error | XError)
        
        static wrap(cause: Error | XError): XError;
    
        static registerErrorCode(code: string, options: RegisterOption ): void;
        
        static registerErrorCodes(codes:{
            [key: string]: RegisterOption
        }): void;
        
        static getErrorCode(code: string): string;
 
        static listErrorCodes(): string[];

        static isXError(error: Error | XError): boolean;

        static fromObject(object: any): XError;
    }
}