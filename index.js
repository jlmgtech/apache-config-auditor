const c = require("ansi-colors");
const {
    cleanup,
    fetch_configtest,
    with_dir,
} = require("./helpers.js");

const {
    check_file,
    verify_files,
} = require("./processors.js");

const data = require("./data.js");
const os = require("os");

// TODO - break code down into modules
// TODO - test faulty configurations

module.exports = async function main() {

    if (os.userInfo().uid !== 0) {
        data.warnings.push(c.yellow("Not running as root! This report may be incorrect!"));
    }

    return await with_dir('/etc/httpd', async () => {
        try {
            const configtest = await fetch_configtest();
            console.log("apachectl configtest looks OK");
            console.log("recursively finding config files");
            await check_file('conf/httpd.conf');
            console.log(`verifying ${Object.keys(data.filequeue).length} files`);
            await verify_files();
        } catch(e) {
            data.errors.push(c.red("CRITICAL ERROR: " + e));
        }
        console.info("done");
        cleanup(); // closes active readline connections et al
        const success = data.report();
        if (os.userInfo().uid !== 0) {
            console.error("This program should be run as root. Information shown above may be incomplete or incorrect");
        }
        return success;
    });
};
