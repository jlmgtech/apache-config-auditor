const c = require("ansi-colors");
const progress = require("progress");
const data = require("./data.js");

class PBar {
    constructor(len=10) {
        this.bar = new progress(':bar ' +
            c.cyan(':percent ') +
            ':etas ' +
            c.red(':numerr errors ') +
            c.yellow(':numwarn warnings ') +
            ':fname ' +
            c.grey(':mesg'), {
            complete: c.cyan('█'),
            incomplete: c.cyan('░'),
            width: 40,
            total: len,
            clear: true, // clear after done
        });
    }

    text(mesg) {
        this.bar.tick(0, {
            mesg,
            fname: data.current_file,
            numerr: data.errors.length,
            numwarn: data.warnings.length,
        });
    }

    tick() {
        this.bar.tick();
    }
}

module.exports = PBar;
