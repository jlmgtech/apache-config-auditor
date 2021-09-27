#!/usr/bin/env node

const auditConfig = require("../index.js");
console.log("auditing apache config...");

(async function main() {
    await auditConfig();
})();
