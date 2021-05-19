const {spawn} = require('child_process');
const c = require("ansi-colors");
const apacheconf = require('apacheconf');
const fs = require("fs");
const glob = require("glob");
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const data = require("./data.js");

function reportify(color, obj, depth=0, highlights=[]) {
    const tabs = Array(depth).fill("\t").join("");
    let output = [];
    if (Object(obj) === obj) {
        for (const [k, v] of Object.entries(obj)) {
            const text = `${tabs}${k}:\t${reportify(color, v, depth+1, highlights)}\n`;
            const msg = (highlights.includes(k)) ? color(text) : text;
            output.push(msg);
        }
    } else {
        if (typeof obj === "undefined") {
            output.push(c.grey("<undefined>"));
        } else {
            output.push(JSON.stringify(obj));
        }
    }
    return output.join("");
}


module.exports = {

    is_valid_ip(ipaddr) {
        return ["172.24.32.240", "184.106.64.157"].includes(ipaddr);
    },

    delay(ms) {
        return new Promise((res, rej) => {
            setTimeout(res, ms);
        });
    },

    question(msg) {
        return new Promise((resolve, reject) => {
            rl.question(msg, (rsp) => resolve(rsp));
        });
    },

    cleanup() {
        rl.close();
    },

    bombout(info) {
        info.file = data.current_file;
        return function(msg, ...highlights) {
            data.errors.push(`${msg}:\n${reportify(c.red, info, 1, highlights)}`);
        }
    },

    warnout(info) {
        info.file = data.current_file;
        return function(msg, ...highlights) {
            data.warnings.push(`${msg}:\n${reportify(c.yellow, info, 1, highlights)}`);
        }
    },

    isdir(fname) {
        return new Promise((resolve, reject) => {
            fs.lstat(fname, function(err, stat) {
                if (err) {
                    resolve(false);
                } else {
                    resolve(stat.isDirectory());
                }
            });
        });
    },

    isfile(fname) {
        return new Promise((resolve, reject) => {
            fs.lstat(fname, function(err, stat) {
                if (err) {
                    resolve(false);
                } else {
                    resolve(stat.isFile());
                }
            });
        });
    },

    isaccessible(fname) {
        return new Promise((resolve, reject) => {
            if (typeof fname !== "string") {
                reject("isaccessible did not receive a valid fname: must be a string");
            } else {
                fs.access(fname, fs.F_OK, function(err) {
                    resolve(!err);
                });
            }
        });
    },

    parseconf(fname) {
        return new Promise((resolve, reject) => {
            apacheconf(fname, (err, config, parser) => {
                if (err) {
                    reject(err);
                }
                resolve([config, parser]);
            });
        });
    },

    aglob(fpath, options) {
        return new Promise((resolve, reject) => {
            glob(fpath, options, (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(files);
            });
        });
    },

    async with_dir(new_dir, fn) {
        const old_dir = process.cwd();
        console.info(`changing into "${new_dir}"`);
        process.chdir(new_dir);
        try {
            return await fn();
        } catch(e) {
            throw e;
        } finally {
            process.chdir(old_dir);
        }
    },

    fetch_configtest() {
        return new Promise((resolve, reject) => {
            const stderr = [];
            const configtest = spawn('/usr/sbin/apachectl', ['configtest']);
            configtest.stderr.on('data', data => stderr.push(data));
            configtest.on('close', (code) => {
                if (code === 0) {
                    resolve(stderr.join(""));
                } else {
                    data.errors.push(stderr.join(""));
                    reject(new Error(`apache configtest failed with code ${code}: stderr -> ${stderr.join("")}`));
                }
            });
        });
    },

    fetch_openssl(...args) {
        return new Promise((resolve, reject) => {
            const stdout = [];
            const stderr = [];
            const openssl = spawn('openssl', ...args);
            openssl.stdout.on('data', data => stdout.push(data));
            openssl.stderr.on('data', data => stderr.push(data));
            openssl.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.join(""));
                } else {
                    reject(`openssl failed with code ${code}: output -> ${stdout.join("")}, ${stderr.join("")}`);
                }
            });
        });
    },

};
