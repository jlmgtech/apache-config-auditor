#!/usr/bin/env node

const auditConfig = require("../index.js");
console.log("auditing apache config...");

(async function main() {
    const [config_path] = process.argv.slice(2);
    await auditConfig(config_path);
})();
