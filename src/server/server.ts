//import { APIRouter, JSONRPCInterface } from 'yaar';
import express from 'express';
import littleconf from 'littleconf';
import TightCNCServer from './tightcnc-server';
//import { createSchema, Schema } from 'common-schema';
//import XError  from 'xerror';
import { createJSONRPCErrorResponse, JSONRPC, JSONRPCID, JSONRPCMethod, JSONRPCRequest, JSONRPCResponse, JSONRPCResponsePromise, JSONRPCServer } from 'json-rpc-2.0';
import Operation from './operation';

const config = littleconf.getConfig()


async function startServer() {

	// const router = new APIRouter();
	const server = new JSONRPCServer();
	const app = express();
	app.use(express.json({}));
	/*
	app.use(router.getExpressRouter());
	router.version(1).addInterface(new JSONRPCInterface({
		includeErrorStack: true
	}));
	*/


	let tightcnc = new TightCNCServer(config);
	await tightcnc.initServer();

	app.post("/v1/jsonrpc", (req, res) => {
		console.debug("Request!",req)
		const jsonRPCRequest = req.body;
		let authHeader = req.header('Authorization');
		if (!authHeader) {
			res.sendStatus(403);
		} else {
			let parts = authHeader.split(' ');
			if (parts.length > 2) parts[1] = parts.slice(1).join(' ');
			let authType = parts[0].toLowerCase();
			let authString = parts[1];

			if (authType === 'key') {
				if (config.authKey && authString === config.authKey) {
					// server.receive takes an optional second parameter.
					// The parameter will be injected to the JSON-RPC method as the second parameter.
					server.receive(jsonRPCRequest).then((jsonRPCResponse) => {
						if (jsonRPCResponse) {
						res.json(jsonRPCResponse);
						} else {
						res.sendStatus(204);
						}
					});
				  } else {
					res.sendStatus(401)
				}
			} else {
				res.status(406).send('Unsupported authorization type: ' + authType);
			}
		}
	});

	app.all('*', (req, res, next) => {
		console.error('Unknown request ', req)
		next()
	})
	
/*
	function authMiddleware(ctx:any) {
		let authHeader = ctx.req.header('Authorization');
		if (!authHeader) throw new XError(XError.ACCESS_DENIED, 'Authorization header is required.');

		let parts = authHeader.split(' ');
		if (parts.length > 2) parts[1] = parts.slice(1).join(' ');
		let authType = parts[0].toLowerCase();
		let authString = parts[1];

		if (authType === 'key') {
			if (config.authKey && authString === config.authKey) {
				return;
			} else {
				throw new XError(XError.ACCESS_DENIED, 'Incorrect authentication key.');
			}
		} else {
			throw new XError(XError.ACCESS_DENIED, 'Unsupported authorization type: ' + authType);
		}
	}
*/
	
	function registerOperationAPICall(operationName: string, operation: any) {

		const mapResultToJSONRPCResponse = (
			id: JSONRPCID | undefined,
			result: any
		  ): JSONRPCResponse | null => {
			if (id !== undefined) {
			  return {
				jsonrpc: JSONRPC,
				id,
				result: result === undefined ? null : result,
			  };
			} else {
			  return null;
			}
		};
		
		const mapErrorToJSONRPCResponse = (
			id: JSONRPCID | undefined,
			error: any
		  ): JSONRPCResponse | null => {
			if (id !== undefined) {
			  return createJSONRPCErrorResponse(
				id,
				0 /*DefaultErrorCode*/,
				(error && error.message) || "An unexpected error occurred"
			  );
			} else {
			  return null;
			}
		};
		

		function toJSONRPCObject(
			object: Operation
		): JSONRPCMethod {
			return (request: JSONRPCRequest): JSONRPCResponsePromise => {
				let response = object.run(request.params);
				return Promise.resolve(response).then(
					(result: any) => mapResultToJSONRPCResponse(request.id, result),
					(error: any) => {
					console.warn(
						`JSON-RPC method ${request.method} responded an error`,
						error
					);
					return mapErrorToJSONRPCResponse(request.id, error);
					}
				);
			};
		}
		server.addMethodAdvanced(operationName, toJSONRPCObject(operation))
		/*
		let paramSchema = operation.getParamSchema();
		if (paramSchema && !Schema.isSchema(paramSchema)) paramSchema = createSchema(paramSchema);
		router.register(
			{
				method: operationName,
				schema: paramSchema
			},
			authMiddleware,
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'ctx' implicitly has an 'any' type.
			async (ctx) => {
				let result = await tightcnc.runOperation(operationName, ctx.params);
				//let result = await operation.run(ctx.params);
				if (!result) result = { success: true };
				return result;
			}
		);
		*/
	}

	for (let operationName in tightcnc.operations) {
		registerOperationAPICall(operationName, tightcnc.operations[operationName]);
	}

	let serverPort = config.serverPort || 2363;
	app.listen(serverPort, () => {
		console.log('Listening on port ' + serverPort);
	});

}

startServer()
	.catch((err) => {
		console.error(err);
		console.error(err.stack);
	});
