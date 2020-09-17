const data = require("./data.js");
const c = require("ansi-colors");
const PBar = require("./PBar.js");
const path = require("path");
const {spawn} = require('child_process');
const {parseconf} = require("./helpers.js");
const {
    get_keymod,
    get_crtmod,
    get_csrmod,
} = require("./sslutils.js");

const {
    aglob,
    bombout,
    is_valid_ip,
    isaccessible,
    isdir,
    isfile,
    question,
    warnout,
    fetch_openssl,
} = require("./helpers.js");

function unpack_value(element) {
    const output = (() => {
        if (element instanceof Array) {
            if (element.length > 1) {
                return [...element];
            } else {
                return element[0];
            }
        } else {
            return element;
        }
    })();
    if (typeof output === "string" && output.startsWith('"')) {
        return JSON.parse(output);
    } else {
        return output;
    }
}

async function get_expiry_date(sslcertificatefile) {
    const text = await fetch_openssl([
        "x509",
        "-enddate",
        "-noout",
        "-in",
        sslcertificatefile,
    ]);
    return new Date(text.split("=").pop());
}

async function process_VirtualHost(hosts) {
    const pbar = new PBar(hosts.length);
    for (const host of hosts) {

        const [ipaddr, port] = host.$args.split(":");
        if (ipaddr === "_default_") {
            continue; // skip default config: it will be caught by configtest.
        }
        // TODO - different unpack calls for different expected types.
        const serveradmin = unpack_value(host.ServerAdmin);
        const servername = unpack_value(host.ServerName);
        const serveralias = unpack_value(host.ServerAlias);
        const documentroot = unpack_value(host.DocumentRoot);
        const sslengine = unpack_value(host.SSLEngine);
        const sslprotocol = unpack_value(host.SSLProtocol);
        const sslcacertificatefile = unpack_value(host.SSLCACertificateFile);
        const sslcertificatefile = unpack_value(host.SSLCertificateFile);
        const sslcertificatekeyfile = unpack_value(host.SSLCertificateKeyFile);
        const hostlocation = unpack_value(host.Location);
        const host_warn = warnout({
            type: "virtual host",
            documentroot,
            servername,
            ipaddr,
            port,
        });
        const ssl_warn = warnout({
            type: "virtual host - ssl",
            documentroot,
            servername,
            ipaddr,
            sslengine,
            sslprotocol,
            sslcertificatefile,
            sslcertificatekeyfile,
            sslcacertificatefile,
        });
        const ssl_err = bombout({
            type: "virtual host - ssl",
            documentroot,
            servername,
            ipaddr,
            sslengine,
            sslprotocol,
            sslcertificatefile,
            sslcertificatekeyfile,
            sslcacertificatefile,
        });

        const vhost_key = [servername, port].join(":");
        if (data.vhosts[vhost_key]) {
            host_warn("Virtual host has a duplicate entry: " + JSON.stringify(data.vhosts[vhost_key]), "servername");
        } else {
            data.vhosts[vhost_key] = {
                servername,
                file: data.current_file,
                port,
            };
        }

        pbar.text(servername || ipaddr || '_default_');

        if (!is_valid_ip(ipaddr)) {
            host_warn(`ip address for "${servername}" is not set to ${c.cyan("172.24.32.240")} or ${c.cyan("184.106.64.157")}`, "ipaddr");
        }

        if (typeof sslengine === "string" && sslengine === "on") {

            if (port !== "443") {
                ssl_err(`SSL virtual host has port which is not set to 443`);
            }

            if (typeof sslprotocol === "string") {
                const protocols = sslprotocol.split(" ")
                .filter(w => !w.startsWith("-"))                // only include entries without "-"
                .map(w => w.startsWith("+") ? w.slice(1) : w);  // remove optional leading "+"

                if (protocols.includes("TLSv1.2") === false) {
                    ssl_warn("SSL protocol is not set to SSLProtocol TLSv1.2", "sslprotocol");
                }
            }

            if (typeof sslcacertificatefile !== "string") {
                ssl_warn("No CA certificate file specified for host", "sslcacertificatefile");
            } else {
                if (await isaccessible(sslcacertificatefile) === false) {
                    ssl_err("SSL CA certificate file specified, but inaccessible", "sslcacertificatefile");
                }
                if (await isfile(sslcacertificatefile) === false) {
                    ssl_err("SSL CA certificate file specified, but is not a file", "sslcacertificatefile");
                }
            }

            if (typeof sslcertificatefile !== "string") {
                ssl_err("no certificate file specified for host", "sslcertificatefile");
            }
            if (await isaccessible(sslcertificatefile) === false) {
                ssl_err("SSL certificate is not accessible", "sslcertificatefile");
            }
            if (await isfile(sslcertificatefile) === false) {
                ssl_err("SSL certificate is not a file", "sslcertificatefile");
            }

            if (typeof sslcertificatekeyfile !== "string") {
                ssl_err("SSL Key file not specified for host", "sslcertificatekeyfile");
            }
            if (await isaccessible(sslcertificatekeyfile) === false) {
                ssl_err("SSL key is not accessible", "sslcertificatekeyfile");
            }
            if (await isfile(sslcertificatekeyfile) === false) {
                ssl_err("SSL key is not a file", "sslcertificatekeyfile");
            }

            try {

                const keymod = await get_keymod(sslcertificatekeyfile);
                const crtmod = await get_crtmod(sslcertificatefile);
                // TODO - check csr in system matches what is installed (non-fatal warning, but important to know)
                // const csrmod = await get_csrmod(...);
                const mod_err = bombout({
                    type: "virtual host - ssl mod mismatch",
                    documentroot,
                    servername,
                    ipaddr,
                    sslengine,
                    sslprotocol,
                    sslcertificatefile,
                    sslcertificatekeyfile,
                    hostlocation,
                    keymod,
                    crtmod,
                });

                if (keymod !== crtmod) {
                    mod_err("Key modulus doesn't match certificate", "sslcertificatefile", "sslcertificatekeyfile");
                }

                const expirydate = await get_expiry_date(sslcertificatefile);
                if (expirydate < Date.now()) {
                    warnout({
                        sslcertificatefile,
                        expires: expirydate.toString(),
                        today: (new Date()).toString(),
                    })(`SSL certificate is expired`, "expires");
                }
            } catch(e) {
                ssl_err(`Could not check modulus of ssl files: ${e.message}`, "sslcertificatefile", "sslcertificatekeyfile");
            }

            // TODO: for added protection, use openssl verify option...
            // from here:
            // https://unix.stackexchange.com/questions/16226/how-can-i-verify-ssl-certificates-on-the-command-line
            try {
                if (typeof sslcacertificatefile === "string" && typeof sslcertificatefile === "string") {

                    const result = await fetch_openssl([
                        "verify", "-verbose", "-x509_strict", 
                        "-CAfile", sslcacertificatefile,
                        "-CApath", "/mnt",
                        sslcertificatefile, //"cert_chain.pem" // <- TODO
                    ]);
                } else {
                    ssl_warn("Could not verify certificate for this host because it or the CA cert was unspecified", "sslcacertificatefile");
                }
            } catch(e) {
                const choice = await question(`${e}: would you like to continue? y/N: `);
                if (choice.toLowerCase() !== "y") {
                    process.exit(1);
                }
            }

        }
        pbar.tick();
    }
}

async function process_Include(includes) {
    for (const include of includes) {
        if (path.basename(include).startsWith("*")) {
            const files = await aglob(include);
            for (const file of files) {
                await check_file(file);
            }
        } else {
            await check_file(include);
        }
    }
}

async function process_IncludeOptional(includes) {
    for (const include of includes) {
        const files = await aglob(include);
        for (const file of files) {
            await check_file(file);
        }
    }
}

async function check_file(fname) {
    const [config, _] = await parseconf(fname);
    data.filequeue[fname] = config;
    await process_Include(config.Include || []);
    await process_IncludeOptional(config.IncludeOptional || []);
}

module.exports = {

    check_file,
    async verify_files() {
        for (const [fname, config] of Object.entries(data.filequeue)) {
            data.current_file = fname;
            await process_VirtualHost(config.VirtualHost || []);
        }
    },

};
