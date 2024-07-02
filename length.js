const fs=require("fs");

const lengthStr=fs.readFileSync("length.txt").toString();
const length=lengthStr.split("\n");

for(let i=0;i<length.length;i++){
    length[i]=Number(length[i]);
}

module.exports=length;