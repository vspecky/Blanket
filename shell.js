const readline = require("readline");
const parse = require("./Blanket.js");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = () => {
    return new Promise((resolve, reject) => {
        rl.question("Blanket >>| ", res => {
            console.log("\n", parse(res), "\n");
            resolve();
        });
    });
};

const main = async () => {
    while (true) await prompt();
};

main();
