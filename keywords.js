const fs=require("fs");
const { Module } = require("module");

const keystr=fs.readFileSync("keywords.txt").toString();
const keywords=keystr.split("\n");
module.exports=keywords;