const express = require("express")

//modules for read files and set directory paths
const fs = require("fs");
const path = require("path");

require("dotenv").config();
const PORT = process.env.PORT;

//module to remove stopwords
const { removeStopwords } = require("stopword");

//module to remove punctuation
const removePunctuation = require("remove-punctuation");

//module to convert numbers to words
var converter = require("number-to-words");

//module to convert words to numbers
const wordToNum = require("word-to-numbers");

//module for removing grammar and returning root word eg: added=> add
var lemmatize = require('wink-lemmatizer');

//module for spellcheck
const natural = require("natural");

//module to check string similarity
const { sorensenDice } = require("string-similarity-alg");

//template engine
const ejs = require("ejs")

//<---- Reading The precomuted arrays from txt files ---->

//Reading the IDF array
const IDF = require("./idf.js")
//Reading the keywords array
const keywords = require("./keywords.js")
//Reading the length of each ques doc
const length = require("./length.js")
//Reading the TF array
const TF = require("./TF.js");
//Reading the titles
const titles = require("./titles.js");
//reading urls 
const urls = require("./urls.js");

const N = 3023;
const W = keywords.length
const avgdl = 134.12533068783068;

// starting the server
const app = express();

//function to capitalize string
Object.defineProperty(String.prototype, "capitalize", {
    value: function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    },
    enumerable: false,
});

//set ejs as our view engine
app.set("view engine", "ejs");

// path to the public assests folder
app.use(express.static(path.join(__dirname, "/public")));

//creating a dictionary for all our keywords for spellcheck
const spellcheck = new natural.Spellcheck(keywords);

//GET route to home page 
app.get("/", (req, res) => {
    res.render("index");
})


//GET route to perform our search
app.get("/search", (req, res) => {
    const query = req.query.query;
    const oldString = query.split(" ");
    const newString = removeStopwords(oldString);
    newString.sort();

    let queryKeywords = [];

    //seperate numbers from our query string using regex
    let getNum = query.match(/\d+/g);
    //convert these numbers into words and push them in are querykeywords
    if (getNum) {
        getNum.forEach((num) => {
            queryKeywords.push(num);
            let numstr = converter.toWords(Number(num));
            queryKeywords.push(numstr);
            let numKeys = numstr.split("-");

            numKeys.forEach((key) => {
                let spacesplit = key.split(" ");
                if (numKeys.length > 1) queryKeywords.push(key);
                if (spacesplit.length > 1) {
                    spacesplit.forEach((key) => {
                        queryKeywords.push(key);
                    })
                }
            })
        })
    }

    for (let i = 0; i < newString.length; i++) {
        //push the orignal keywords in query
        newString[i] = newString[i].toLowerCase();
        newString[i] = removePunctuation(newString[i]);
        if (newString[i] != "") queryKeywords.push(newString[i]);

        //camelcasing
        var letr = newString[i].match(/[a-zA-Z]+/g);
        if (letr) {
            letr.forEach((w) => {
                queryKeywords.push(removePunctuation(w.toLowerCase()));
            })
        }

        //words to numbers
        let x = wordToNum(newString[i]);
        if (x != newString[i]) {
            queryKeywords.push(x);
        }
    }

    //grammar and spellcheck
    let queryKeywordsNew = queryKeywords;
    queryKeywords.forEach((key) => {
        let key1 = key;
        let key2 = lemmatize.verb(key1);
        queryKeywordsNew.push(key2);

        let spellkey1 = spellcheck.getCorrections(key1);
        let spellkey2 = spellcheck.getCorrections(key2);

        if (spellkey1.indexOf(key1) == -1) {
            spellkey1.forEach((k) => {
                queryKeywordsNew.push(k);
                queryKeywords.push(lemmatize.verb(k));
            })
        }
        if (spellkey2.indexOf(key2) == -1) {
            spellkey2.forEach((k) => {
                queryKeywordsNew.push(k);
                queryKeywords.push(lemmatize.verb(k));
            })
        }

    })
    //updating the querykeywords array
    queryKeywords = queryKeywordsNew;

    //now we need to filter out those keywords which are present in our dataset
    let temp = [];
    for (let i = 0; i < queryKeywords.length; i++) {
        if (keywords.indexOf(queryKeywords[i]) != -1) {
            temp.push(queryKeywords[i]);
        }
    }
    queryKeywords = temp;
    queryKeywords.sort();

    //getting unique query keywords
    let temp1 = [];
    for (let i = 0; i < queryKeywords.length; i++) {
        if (temp1.indexOf(queryKeywords[i]) == -1) {
            temp1.push(queryKeywords[i]);
        }
    }
    queryKeywords = temp1;

    //getting id of every query keyword
    let qid = [];
    queryKeywords.forEach((key) => {
        qid.push(keywords.indexOf(key));
    })

    //<-------  BM25 Algo ---------->

    //similarity score of each doc with the input query string
    let arr = [];

    for (let i = 0; i < N; i++) {
        let s = 0;
        qid.forEach((key) => {
            const idfkey = IDF[key];
            let tf = 0;
            // console.log(TF[i]);
            // console.log(i);
            for (let k = 0; k < TF[i].length; k++) {
                if (TF[i][k].id == key) {
                    tf = TF[i][k].val;
                    break;
                }
            }
            const tfkey = tf;
            const x = tfkey * (1.2 + 1);
            const y = tfkey + 1.2 * (1 - 0.75 + 0.75 * (length[i] / avgdl));
            let BM25 = (x / y) * idfkey;
            s += BM25;

        })

        //title similarity
        const titlsim = sorensenDice.compare(titles[i], query.toLowerCase());
        s *= titlsim;
        arr.push({
            id: i,
            sim: s,
        })
    }

    //sorting according to the score
    arr.sort((a, b) => b.sim - a.sim);

    let response = [];
    let nonZero = 0;

    for (let i = 0; i < 10; i++) {
        if (arr[i].sim != 0) nonZero++;
        const str = path.join(__dirname, "Problems");
        const str1 = path.join(str, `problem_text_${arr[i].id + 1}.txt`);
        let question = fs.readFileSync(str1).toString().split("\n");
        let n = question.length;
        let problem = "";

        if (arr[i].id <= 1773) {
            problem = question[0].split("ListShare")[1] + " ";
            if (n > 1) problem += question[1];
        } else {
            problem = question[0] + " ";
            if (n > 1) problem += question[1];
        }
        response.push({
            id: arr[i].id,
            title: titles[arr[i].id],
            problem: problem,
        });
    }

    // console.log(response);

    // res.locals.titles = response;
    setTimeout(() => {
        if (nonZero) res.json(response);
        else res.json([]);
    }, 1000);
})


//GET route for question page
app.get("/question/:id", (req, res) => {
    const id = Number(req.params.id);
    const str = path.join(__dirname, "Problems");
    const str1 = path.join(str, `problem_text_${id + 1}.txt`);
    let text = fs.readFileSync(str1).toString();
    if (id <= 1773) {
        text = text.split("ListShare");
        text = text[1];
    }

    var find = "\n";
    var re = new RegExp(find, "g");

    text = text.replace(find, "g");

    let title = titles[id];
    // console.log(title);
    title = title.split("-");
    let temp = "";
    for (let i = 0; i < title.length; i++) {
        temp += title[i] + " ";
    }
    title = temp;
    // console.log(title);
    title = title.capitalize();
    let type = 0;
    if (id < 1774) type = "Leetcode";
    else if (id < 2214) type = "Interview Bit";
    else type = "Techdelight";
    const questionObject = {
        title,
        link: urls[id],
        value: text,
        type,
    };

    res.locals.questionObject = questionObject;
    res.locals.questionTitle = titles[id];
    res.locals.questionUrl = urls[id];
    res.render("question");
})


app.listen(PORT, () => {
    console.log("server running on port 3000");
})