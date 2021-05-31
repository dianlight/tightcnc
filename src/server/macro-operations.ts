// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Operation'... Remove this comment to see the full error message
const Operation = require('./operation');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'path'.
const path = require('path');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'commonSche... Remove this comment to see the full error message
const commonSchema = require('common-schema');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'XError'.
const XError = require('xerror');
class OpListMacros extends Operation {
    getParamSchema() {
        return {};
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        let list = await (this as any).tightcnc.macros.listAllMacros();
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
        list.sort((a, b) => {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        });
        return list;
    }
}
class OpRunMacro extends Operation {
    getParamSchema() {
        return {
            macro: {
                type: 'string',
                required: true,
                description: 'Name of macro to run',
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'val' implicitly has an 'any' type.
                validate: (val) => {
                    if (val.indexOf(';') !== -1)
                        throw new commonSchema.FieldError('invalid', 'Raw javascript not allowed from client');
                }
            },
            params: {
                type: 'mixed',
                default: {}
            },
            waitSync: {
                type: 'boolean',
                default: true,
                description: 'Whether to wait until all pushed gcode runs'
            }
        };
    }
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'params' implicitly has an 'any' type.
    async run(params) {
        (this as any).checkReady();
        await (this as any).tightcnc.runMacro(params.macro, params.params, { waitSync: params.waitSync });
        return { success: true };
    }
}
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tightcnc' implicitly has an 'any' type.
function registerOperations(tightcnc) {
    tightcnc.registerOperation('listMacros', OpListMacros);
    tightcnc.registerOperation('runMacro', OpRunMacro);
}
module.exports = registerOperations;
