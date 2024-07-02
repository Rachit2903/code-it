const fs=require("fs");

const idfstr=fs.readFileSync("IDF.txt").toString();
const IDF=idfstr.split("\n");

for(let i=0;i<IDF.length;i++){
    IDF[i]=Number(IDF[i]);
}

module.exports=IDF;