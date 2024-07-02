const fs=require("fs");

const titlestr=fs.readFileSync("problem-titles.txt").toString();

const titles=titlestr.split("\n");

module.exports=titles;