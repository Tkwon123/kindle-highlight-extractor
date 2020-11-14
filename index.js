console.log(process.cwd());
const cloudFunctions = require("./dist");

Object.keys(cloudFunctions).forEach((key) => {
  exports[key] = cloudFunctions[key];
});
