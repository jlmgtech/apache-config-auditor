const c = require("ansi-colors");
const errors = [];
const warnings = [];

let current_file = "";

module.exports = {
    errors,
    warnings,
    filequeue: {},
    vhosts: {},

    get current_file() {
        return current_file;
    },

    set current_file(val) {
        return current_file = val;
    },

    report() {

        if (warnings.length) {
            console.log(c.yellow(`${warnings.length} warnings: `) + warnings.join("\n"));
        }

        if (errors.length) {
            console.log(c.red(`${errors.length} ERRORS: `) + errors.join("\n"));
        }

        if (errors.length && warnings.length) {
            console.log(c.red(`DONE with ${errors.length} errors and ${warnings.length} warnings`));
        } else if (errors.length) {
            console.log(c.red(`DONE with ${errors.length} errors`));
        } else if (warnings.length) {
            console.log(c.yellow(`DONE with ${warnings.length} warnings`));
        } else {
            console.log(c.green(`DONE with 0 errors and 0 warnings`));
        }
        if (errors.length || warnings.length) {
            console.log(c.cyan("\nsee above for more info"));
        }

        return errors.length + warnings.length;
    },

};
