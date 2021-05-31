import { APIRouter, JSONRPCInterface } from 'yaar';
import express from 'express';
import littleconf from 'littleconf';
import TightCNCServer from './tightcnc-server';
import { createSchema, Schema } from 'common-schema';
import XError  from 'xerror';

const config = littleconf.getConfig()

async function startServer() {

	const router = new APIRouter();
	const app = express();
	app.use(router.getExpressRouter());
	router.version(1).addInterface(new JSONRPCInterface({
		includeErrorStack: true
	}));

	let tightcnc = new TightCNCServer(config);
	await tightcnc.initServer();

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'ctx' implicitly has an 'any' type.
	function authMiddleware(ctx) {
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

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'operationName' implicitly has an 'any' ... Remove this comment to see the full error message
	function registerOperationAPICall(operationName, operation) {
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
	}

	for (let operationName in tightcnc.operations) {
		registerOperationAPICall(operationName, tightcnc.operations[operationName]);
	}

	let serverPort = config.serverPort || 2363;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'err' implicitly has an 'any' type.
	app.listen(serverPort, (err) => {
		if (err) {
			console.error('Error listening on port ' + serverPort + ': ' + err);
			return;
		}
		console.log('Listening on port ' + serverPort);
	});

}

startServer()
	.catch((err) => {
		console.error(err);
		console.error(err.stack);
	});

