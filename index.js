const fs = require("fs").promises;
const c = require("ansi-colors");
const {
    cleanup,
    fetch_configtest,
    isdir,
    isfile,
    with_dir,
} = require("./helpers.js");

const {
    check_file,
    verify_files,
} = require("./processors.js");

const data = require("./data.js");
const os = require("os");

// TODO - break code down into modules
// TODO - naming conventions, follow them

module.exports = async function main(confdir='/etc/httpd') {

    if (os.userInfo().uid !== 0) {
        data.warnings.push(c.yellow("Not running as root! This report may be incorrect!"));
    }

    if (!await isdir(confdir)) {
        throw new Error(c.red(`${confdir} is not a directory! Please specify the apache base directory as an argument.`));
    }

    return await with_dir(confdir, async () => {
        try {
            const configtest = await fetch_configtest();
            let config_file = "";
            console.log("apachectl configtest looks OK");
            console.log("recursively finding config files");
            if (await isfile('conf/httpd.conf')) {
                config_file = 'conf/httpd.conf';
            } else if (await isfile('apache2.conf')) {
                config_file = 'apache2.conf';
            } else {
                throw new Error("Could not find default configuration file 'apache2.conf' or 'conf/httpd.conf'");
            }
            console.log("found config entrypoint '%s'", config_file);

            await check_file(config_file);
            console.log(`verifying ${Object.keys(data.filequeue).length} files`);
            await verify_files();
        } catch(e) {
            throw e;
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
