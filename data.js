const c = require("ansi-colors");
let current_file = "";

const store = {
    errors: [],
    warnings: [],
    filequeue: {},
    vhosts: {},

    get current_file() {
        return current_file;
    },

    set current_file(val) {
        return current_file = val;
    },

    report() {

        //if (store.warnings.length) {
        //    console.log(c.yellow(`${store.warnings.length} warnings: `) + store.warnings.join("\n"));
        //}

        if (store.errors.length) {
            console.log(c.red(`${store.errors.length} ERRORS: `) + store.errors.join("\n"));
        }

        if (store.errors.length && store.warnings.length) {
            console.log(c.red(`DONE with ${store.errors.length} errors and ${store.warnings.length} warnings`));
        } else if (store.errors.length) {
            console.log(c.red(`DONE with ${store.errors.length} errors`));
        } else if (store.warnings.length) {
            console.log(c.yellow(`DONE with ${store.warnings.length} warnings`));
        } else {
            console.log(c.green(`DONE with 0 errors and 0 warnings`));
        }
        if (store.errors.length || store.warnings.length) {
            console.log(c.cyan("\nsee above for more info"));
        }

        const success = store.errors.length === 0;
        store.errors = [];
        store.warnings = [];
        store.filequeue = {};
        store.vhosts = {};
        return success;
    },

};

module.exports = store;
