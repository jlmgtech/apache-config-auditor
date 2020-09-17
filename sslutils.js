const {fetch_openssl} = require("./helpers.js");
async function get_ssl_result(parameters, errmsg) {
    try {
        return await fetch_openssl(parameters);
    } catch(e) {
        throw new Error(`${errmsg}: ${e}`);
    }
}

module.exports = {

    async get_keymod(keypath) {
        return await get_ssl_result(["rsa", "-noout", "-modulus", "-in", keypath],
            `cannot get key modulus from path "${keypath}"`);
    },

    async get_crtmod(crtpath) {
        return await get_ssl_result(["x509", "-noout", "-modulus", "-in", crtpath],
            `cannot get crt modulus of ${crtpath}`);
    },

    async get_csrmod(csrpath) {
        return await get_ssl_result(["req", "-noout", "-modulus", "-in", csrpath],
            `cannot get csr modulus of ${csrpath}`);
    },

};
