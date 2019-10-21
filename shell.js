const readline = require("readline");
const parse = require("./Blanket.js");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = () => {
    return new Promise((resolve, reject) => {
        rl.question("Blanket >>| ", res => {
            const result = parse(res);
            if (result.error) console.log("\n", result.error.log(), "\n");
            else console.log("\n", result.value, "\n");
            resolve();
        });
    });
};

const main = async () => {
    while (true) await prompt();
};

main();
