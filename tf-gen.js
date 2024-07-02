const fs=require("fs");
const path=require("path");
const {removeStopwords}=require("stopword");
const removePunctuation =require("remove-punctuation")
const N=3023;
let documents=[];
for(let i=1;i<=N;i++){
    const str1=path.join(__dirname,"Problems");
    const str=path.join(str1,`problem_text_${i}.txt`);
    const question=fs.readFileSync(str).toString();
    documents.push(question);
}

let docKeywords=[];
for(let i=0;i<N;i++){
    const lines=documents[i].split("\n");
    const docWords=[];
    lines.forEach((line)=>{
        const temp1=line.split(" ");
        temp1.forEach((e)=>{
            e=e.split("\r");
            if(e[0].length) docWords.push(e[0]);
        })
    })

    const newString=removeStopwords(docWords);
    newString.sort();
    const temp=[];
    for(let j=0;j<newString.length;j++){
        newString[j] = newString[j].toLowerCase();
        newString[j]=removePunctuation(newString[j]);
        if(newString[j]!=="") temp.push(newString[j]);
    }

    docKeywords.push(temp);
}

for(let i=0;i<N;i++){
    const len=docKeywords[i].length;
    fs.appendFileSync("length.txt",len+"\n");
}

let keywords=[];
for(let i=0;i<N;i++){
    docKeywords[i].forEach((keyword)=>{
        if(keywords.indexOf(keyword)==-1){
            keywords.push(keyword)
        }
    })
}

keywords.sort();

let W=keywords.length;
keywords.forEach((k)=>{
    fs.appendFileSync("keywords.txt",k+"\n");
})

let TF=new Array(N);
for(let i=0;i<N;i++){
    TF[i]=new Array(W).fill(0);
    let map=new Map();

    docKeywords[i].forEach((key)=>{
       return map.set(key,0);
    })

    docKeywords[i].forEach((key)=>{
        let cnt=map.get(key);
        cnt++;
        map.set(key,cnt);
    })

    docKeywords[i].forEach((key)=>{
        const ind=keywords.indexOf(key);
        if(ind!=-1){
            TF[i][ind]=map.get(key);
        }
    })
}

for(let i=0;i<N;i++){
    for(let j=0;j<W;j++){
        if(TF[i][j]!=0){
            fs.appendFileSync("TF.txt",i+" "+j+" "+TF[i][j]+"\n");
        }
    }
}

let IDF=new Array(W);
for(let i=0;i<W;i++){
    let cnt=0;
    for(let j=0;j<N;j++){
        if(TF[j][i]!=0){
            cnt++;
        }
    }
    if(cnt!==0){
        IDF[i] =Math.log((N-cnt+0.5)/(cnt+0.5) + 1) + 1;
    }
}

IDF.forEach((word)=>{
    fs.appendFileSync("IDF.txt",word + "\n");
})

