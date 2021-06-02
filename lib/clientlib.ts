import XError from 'xerror';
import axios from 'axios'
export default class TightCNCClient {
    config: any;

    constructor(config: any) {
        this.config = config;
    }

    async op(opname: any, params = {}) {
        let url = this.config.host + ':' + (this.config.port || this.config.serverPort || 2363) + '/v1/jsonrpc';
        let requestData = {
            method: opname,
            params: params
        };
        let response = await axios.post<string>(url,JSON.stringify(requestData),{
            headers: {
                Authorization: 'Key ' + this.config.authKey,
                'Content-type': 'application/json'
            }
        });
        const jsonresponse = JSON.parse(response.data);
        if (jsonresponse.error !== '') {
            throw XError.fromObject(jsonresponse.error);
        }
        return jsonresponse.result;
    }
}