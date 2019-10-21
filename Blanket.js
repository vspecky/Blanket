const OPERATORS = {
    "+": "ADD_OP",
    "-": "SUB_OP",
    "*": "MULT_OP",
    "/": "DIV_OP",
    "^": "POW_OP"
};

const COMPARATORS = {
    "=": "ASS_OP",
    "==": "COMP_EQ",
    ">=": "COMP_GTE",
    "<=": "COMP_LTE",
    "<": "COMP_LT",
    ">": "COMP_GT",
    "!=": "COMP_NEQ"
};

const KEYWORDS = ["sclr", "and", "or", "not", "if", "then", "elif", "else"];

/**
 * Token Class for the Lexer
 *
 * @class Token
 */
class Token {
    /**
     * Creates an instance of Token.
     * @param {Object} { type, value }
     * @memberof Token
     */
    constructor({ type, value = null, posStart = null, posEnd = null }) {
        this.type = type;
        this.value = value;
        this.posStart = posStart;
        this.posEnd = posEnd;
    }

    /**
     * Checks if the provided type/value match the token type/value
     *
     * @param {TokenType} type
     * @param {TokenValue} value
     * @returns True or False
     * @memberof Token
     */
    matches(type, value) {
        return this.type === type && this.value === value;
    }
}

/**
 * Main Error Class
 *
 * @class BlanketErr
 */
class BlanketErr {
    /**
     *Creates an instance of BlanketErr.
     * @param {Object} { type, message, linePos, colPos }
     * @memberof BlanketErr
     */
    constructor({ type, message, posStart, posEnd }) {
        this.type = type;
        this.message = message;
        this.posStart = posStart;
        this.posEnd = posEnd;
    }

    /**
     * Function to return the error type, message and position where
     * it originated.
     *
     * @returns Error String
     * @memberof BlanketErr
     */
    log() {
        return `${this.type}: ${this.message} (${this.posStart.line}:${this.posStart.col - 1})`;
    }
}

/**
 * Invalid Token Error Class.
 *
 * @class InvalidTokenErr
 * @extends {BlanketErr}
 */
class InvalidTokenErr extends BlanketErr {
    /**
     * Creates an instance of InvalidTokenErr.
     * @param {ErrorMsg} message
     * @param {LineNo.} linePos
     * @param {ColNo.} colPos
     * @memberof InvalidTokenErr
     */
    constructor({ message, posStart, posEnd }) {
        super({ type: "Invalid Token", message, posStart, posEnd });
    }
}

/**
 * Syntax Error Class.
 *
 * @class SyntaxError
 * @extends {BlanketErr}
 */
class SyntaxError extends BlanketErr {
    /**
     * Creates an instance of SyntaxError.
     * @param {Object} { message, linePos, colPos }
     * @memberof SyntaxError
     */
    constructor({ message, posStart, posEnd }) {
        super({ type: "Syntax Error", message, posStart, posEnd });
    }
}

/**
 * Runtime Error Class.
 *
 * @class RuntimeError
 * @extends {BlanketErr}
 */
class RuntimeError extends BlanketErr {
    /**
     * Creates an instance of RuntimeError.
     * @param {Object} { message, linePos, colPos }
     * @memberof RuntimeError
     */
    constructor({ message, posStart, posEnd, context }) {
        super({ type: "Runtime Error", message, posStart, posEnd });
        this.context = context;
    }

    /**
     * Logs the runtime error.
     *
     * @memberof RuntimeError
     */
    log() {
        let result = this.generateTraceback();
        result += `${this.type}: ${this.message} (${this.posStart.line}:${this.posStart.col})`;
        return result;
    }

    /**
     * Generates the traceback for the runtime error.
     *
     * @memberof RuntimeError
     */
    generateTraceback() {
        let result = "";
        let pos = this.posStart;
        let ctx = this.context;

        while (ctx) {
            result = `${ctx.displayName}\n` + result;
            pos = ctx.parentEntryPos;
            ctx = ctx.parent;
        }

        return `Traceback\n${result}`;
    }
}

/**
 * Class for tracking the file position in the Lexer.
 *
 * @class PositionTracker
 */
class PositionTracker {
    /**
     * Creates an instance of PositionTracker.
     * @param {number} [idx=0]
     * @param {number} [col=1]
     * @param {number} [line=1]
     * @param {string} [filename=""]
     * @param {string} [code=""]
     * @memberof PositionTracker
     */
    constructor(idx = 0, col = 1, line = 1, filename = "", code = "") {
        this.idx = idx;
        this.col = col;
        this.line = line;
        this.filename = filename;
        this.code = code;
    }

    /**
     * Advances the position
     *
     * @param {Character} current
     * @memberof PositionTracker
     */
    advance(current = null) {
        this.idx++;
        this.col++;

        if (current === "\n") {
            this.line++;
            this.col = 1;
        }
    }

    /**
     * returns a copy of the PositionTracker
     *
     * @returns new PositionTracker
     * @memberof PositionTracker
     */
    copy() {
        return new PositionTracker(this.idx, this.col, this.line, this.filename, this.code);
    }
}

/**
 * Main Lexer for Blanket.
 *
 * @class Lexer
 */
class BlanketLexer {
    /**
     * Creates an instance of Lexer.
     * @param {Code String} code
     * @memberof Lexer
     */
    constructor(file, code) {
        this.file = file;
        this.code = code;
        this.pos = new PositionTracker(0, 1, 1, this.file, this.code);
    }

    /**
     * Returns the current value being read.
     *
     * @returns Current Value
     * @memberof Lexer
     */
    current() {
        return this.code.charAt(this.pos.idx);
    }

    /**
     * Returns current value and removes it from the stream.
     *
     * @returns Current Value
     * @memberof Lexer
     */
    consume() {
        const current = this.code.charAt(this.pos.idx);
        this.pos.advance(current);
        return current;
    }

    /**
     * Checker for digits.
     *
     * @returns True or False
     * @memberof Lexer
     */
    isDigit() {
        return /[0-9]/i.test(this.current());
    }

    /**
     * Checker for Idents
     *
     * @returns True or False
     * @memberof Lexer
     */
    isChar() {
        return /[a-z]/i.test(this.current());
    }

    /**
     * Checker for Operators.
     *
     * @returns True or False
     * @memberof Lexer
     */
    isOperator() {
        return "+-*/^".includes(this.current());
    }

    /**
     * Checker for Comparisons.
     *
     * @returns True or False
     * @memberof BlanketLexer
     */
    isComparator() {
        return "><=!".includes(this.current());
    }

    /**
     * Checker for Parentheses.
     *
     * @returns True or False
     * @memberof Lexer
     */
    isParen() {
        return "()".includes(this.current());
    }

    /**
     * Checker for Whitespaces.
     *
     * @returns True or False
     * @memberof Lexer
     */
    isWhitespace() {
        return " \t\r\n".includes(this.current());
    }

    /**
     * Checker for the end of the stream.
     *
     * @returns True or False
     * @memberof Lexer
     */
    isEndOfFile() {
        return this.pos.idx >= this.code.length;
    }

    /**
     * Traverses through whitespace.
     *
     * @memberof Lexer
     */
    omitWhitespace() {
        while (this.isWhitespace()) {
            this.consume();
        }
    }

    /**
     * Reads a Number in the stream.
     *
     * @returns Number Token (Error if Invalid Number)
     * @memberof Lexer
     */
    readNum() {
        let numStr = "";
        let dotCount = 0;
        const pos = this.pos.copy();

        while (this.isDigit() || this.current() === ".") {
            if (this.current() == ".") {
                dotCount++;
                if (dotCount == 2) {
                    throw new InvalidTokenErr({
                        message: "Bad Float",
                        posStart: this.pos,
                        posEnd: this.pos
                    }).log();
                }
            }

            numStr += this.consume();
        }

        if (dotCount === 0) return new Token({ type: "INT", value: parseInt(numStr), posStart: pos, posEnd: this.pos });
        else return new Token({ type: "FLOAT", value: parseFloat(numStr), posStart: pos, posEnd: this.pos });
    }

    /**
     * Reads an identifier in the stream.
     *
     * @returns Ident Token
     * @memberof Lexer
     */
    readIdent() {
        let charStr = "";
        const pos = this.pos.copy();
        while (this.isChar()) charStr += this.consume();
        if (KEYWORDS.includes(charStr)) return new Token({ type: "KEYW", value: charStr, posStart: pos, posEnd: this.pos });
        else return new Token({ type: "IDENT", value: charStr, posStart: pos, posEnd: this.pos });
    }

    /**
     * Reads a comparator in the stream.
     *
     * @returns Comparator Token
     * @memberof BlanketLexer
     */
    readComparator() {
        const pos = this.pos.copy();
        let current = this.consume();
        if (this.isComparator()) current += this.consume();

        if (Object.keys(COMPARATORS).includes(current)) {
            return new Token({ type: COMPARATORS[current], value: current, posStart: pos, posEnd: this.pos });
        } else
            throw new InvalidTokenErr({
                message: "Bad Comparator",
                posStart: pos,
                posEnd: this.pos
            }).log();
    }

    /**
     * Gets a single token based on the type of data detected.
     *
     * @returns Token
     * @memberof Lexer
     */
    getToken() {
        if (this.isWhitespace()) this.omitWhitespace();
        if (this.isDigit()) return this.readNum();
        else if (this.isChar()) return this.readIdent();
        else if (this.isOperator())
            return new Token({ type: OPERATORS[this.current()], value: this.consume(), posStart: this.pos, posEnd: this.pos });
        else if (this.isParen())
            return new Token({ type: `${this.current() == "(" ? "LPAREN" : "RPAREN"}`, value: this.consume(), posStart: this.pos, posEnd: this.pos });
        else if (this.isComparator()) return this.readComparator();
        else
            throw new InvalidTokenErr({
                message: `Unrecognized Character ${this.current()}`,
                linePos: this.pos.line,
                colPos: this.pos.col
            }).log();
    }

    /**
     * Tokenizes the entire stream.
     *
     * @returns Token Stream
     * @memberof Lexer
     */
    tokenizeAll() {
        const tokens = [];
        while (!this.isEndOfFile()) {
            tokens.push(this.getToken());
        }

        tokens.push(new Token({ type: "EOF", value: null, posStart: this.pos }));

        return tokens;
    }
}

/**
 * Error Handler for BlanketParser
 *
 * @class ParseErrHandler
 */
class ParseErrHandler {
    /**
     * Creates an instance of ParseErrHandler.
     * @memberof ParseErrHandler
     */
    constructor() {
        this.error = null;
        this.node = null;
        this.consCount = 0;
    }

    /**
     * Registers a consume action.
     *
     * @memberof ParseErrHandler
     */
    regConsume() {
        this.consCount++;
    }

    /**
     * Registers an action in the Parser.
     *
     * @param {ParseNode} res
     * @returns res/res.node
     * @memberof ParseErrHandler
     */
    register(res) {
        this.consCount += res.consCount;
        if (res instanceof ParseErrHandler) {
            if (res.error) this.error = res.error;
            return res.node;
        }
    }

    /**
     * Called when an action is successful in the parser.
     *
     * @param {ParseNode} node
     * @returns ParseErrHandler instance
     * @memberof ParseErrHandler
     */
    success(node) {
        this.node = node;
        return this;
    }

    /**
     * Registers a failure and updates the error.
     *
     * @param {BlanketError} error
     * @returns ParseErrHandler instance
     * @memberof ParseErrHandler
     */
    failure(error) {
        if (!this.error || !this.consCount) this.error = error;
        return this;
    }
}

/**
 * Creates a Number Node to be used in the parser.
 *
 * @class NumNode
 */
class NumNode {
    /**
     * Creates an instance of NumNode.
     * @param {NumberToken} tok
     * @memberof NumNode
     */
    constructor({ type, value, posStart, posEnd }) {
        this.type = type;
        this.value = value;
        this.posStart = posStart;
        this.posEnd = posEnd;
    }
}

/**
 * Scalar Access Node Class.
 *
 * @class SclrAccNode
 */
class SclrAccNode {
    /**
     * Creates an instance of SclrAccNode.
     * @param {Token} tok
     * @memberof SclrAccNode
     */
    constructor(tok) {
        this.sclrName = tok.value;
        this.posStart = tok.posStart;
        this.posEnd = tok.posEnd;
    }
}

/**
 * Scalar Assign Node Class.
 *
 * @class SclrAssNode
 */
class SclrAssNode {
    /**
     * Creates an instance of SclrAssNode.
     * @param {Token} name
     * @param {BinaryExpression} expr
     * @memberof SclrAssNode
     */
    constructor(name, expr) {
        this.nameToken = name;
        this.valNode = expr;
        this.posStart = name.posStart;
        this.posEnd = expr.posEnd;
    }
}

/**
 * Creates a Unary Node.
 *
 * @class UnaryNode
 */
class UnaryNode {
    /**
     * Creates an instance of UnaryNode.
     * @param {OperatorToken} opTok
     * @param {NumNode} node
     * @memberof UnaryNode
     */
    constructor(opTok, node) {
        this.opNode = opTok;
        this.numNode = node;
        this.posStart = opTok.posStart;
        this.posEnd = node.posEnd;
    }
}

/**
 * Creates an operator node.
 *
 * @class OpNode
 */
class OpNode {
    /**
     * Creates an instance of OpNode.
     * @param {OperatorToken} { type, value }
     * @memberof OpNode
     */
    constructor({ type, value, posStart }) {
        this.type = type;
        this.value = value;
        this.posStart = posStart;
    }
}

/**
 * Creates a binary operation node with precedence taken into consideration.
 *
 * @class BinaryNode
 */
class BinaryNode {
    /**
     * Creates an instance of BinaryNode.
     * @param {LeftTreeNode} leftNode
     * @param {Operator} operator
     * @param {RightTreeNode} rightNode
     * @memberof BinaryNode
     */
    constructor(leftNode, operator, rightNode) {
        this.leftNode = leftNode;
        this.operator = operator;
        this.rightNode = rightNode;
        this.posStart = leftNode.posStart;
        this.posEnd = rightNode.posEnd;
    }
}

/**
 * If/Elif/Else statements Class.
 *
 * @class IfNode
 */
class IfNode {
    /**
     * Creates an instance of IfNode.
     * @param {If/Elif Cases} cases
     * @param {Else Case} [elseCase=null]
     * @memberof IfNode
     */
    constructor(cases, elseCase = null) {
        this.cases = cases;
        this.elseCase = elseCase;
        this.posStart = this.cases[0][0].posStart;
        this.posEnd = (this.elseCase || this.cases[this.cases.length - 1][1]).posEnd;
    }
}

/**
 * Main Parser for Blanket.
 *
 * @class BlanketParser
 */
class BlanketParser {
    /**
     * Creates an instance of BlanketParser.
     * @param {TokenStream} tokens
     * @memberof BlanketParser
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.tokIdx = 0;
        this.precedence = {
            "*": 2,
            "/": 2,
            "+": 1,
            "-": 1
        };
        this.currentTok = tokens[0];
    }

    /**
     * Returns the current token.
     *
     * @returns {Token}
     * @memberof BlanketParser
     */
    current() {
        return this.currentTok;
    }

    /**
     * Returns the current token and removes it from the stream.
     *
     * @returns Current Token
     * @memberof BlanketParser
     */
    consume() {
        ++this.tokIdx;
        if (this.tokIdx < this.tokens.length) this.currentTok = this.tokens[this.tokIdx];
        return this.currentTok;
    }

    /**
     *
     *
     * @returns Next Token
     * @memberof BlanketParser
     */
    next() {
        return this.tokens[this.tokIdx + 1];
    }

    /**
     * Gets an if/elif/else expression.
     *
     * @returns
     * @memberof BlanketParser
     */
    ifExpression() {
        const res = new ParseErrHandler();
        const cases = [];
        let elseCase = null;

        if (!this.current().matches("KEYW", "if"))
            return res.failure(
                new SyntaxError({
                    message: "Expected an 'if'",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );

        res.regConsume();
        this.consume();

        const condition = res.register(this.getExpression());
        if (res.error) return res;

        if (!this.current().matches("KEYW", "then"))
            return res.failure(
                new SyntaxError({
                    message: "Expected a 'then'",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );

        res.regConsume();
        this.consume();

        const expression = res.register(this.getExpression());
        if (res.error) return res;

        cases.push([condition, expression]);

        while (this.current().matches("KEYW", "then")) {
            res.regConsume();
            this.consume();

            const condition = res.register(this.getExpression());
            if (res.error) return res;

            if (!this.current().matches("KEYW", "then"))
                return res.failure(
                    new SyntaxError({
                        message: "Expected a 'then'",
                        posStart: this.current().posStart,
                        posEnd: this.current().posEnd
                    })
                );

            res.regConsume();
            this.consume();

            const expression = res.register(this.getExpression());
            if (res.error) return res;
            cases.push([condition, expression]);
        }

        if (this.current().matches("KEYW", "else")) {
            res.regConsume();
            this.consume();

            elseCase = res.register(this.getExpression());
            if (res.error) return res;
        }

        return res.success(new IfNode(cases, elseCase));
    }

    /**
     * Parses an atomic expression and returns the respective node.
     *
     * @returns
     * @memberof BlanketParser
     */
    parseAtom() {
        const res = new ParseErrHandler();
        const tok = this.current();

        if (["INT", "FLOAT"].includes(tok.type)) {
            res.regConsume();
            this.consume();
            return res.success(new NumNode(tok));
        } else if (tok.type === "IDENT") {
            res.regConsume();
            this.consume();
            return res.success(new SclrAccNode(tok));
        } else if (tok.type === "LPAREN") {
            res.regConsume();
            this.consume();
            const expr = res.register(this.getExpression());
            if (res.error) return res;

            if (this.current().type === "RPAREN") {
                res.regConsume();
                this.consume();
                return res.success(expr);
            } else return console.log("Error");
        } else if (tok.matches("KEYW", "if")) {
            const ifExpr = res.register(this.ifExpression());
            if (res.error) return res;
            return res.success(ifExpr);
        } else
            return res.failure(
                new InvalidTokenErr({
                    message: "Expected an Integer/Float/Identifier/Operator",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );
    }

    /**
     * Parses power expressions.
     *
     * @returns Binary Node/Tree
     * @memberof BlanketParser
     */
    getExponentials() {
        return this.makeBinaryTree(this.parseAtom, ["POW_OP"], this.parseNumNode);
    }

    /**
     * Parses a Number Token.
     *
     * @returns Number Node
     * @memberof BlanketParser
     */
    parseNumNode() {
        const res = new ParseErrHandler();
        const tok = this.current();

        if (["ADD_OP", "SUB_OP"].includes(tok.type)) {
            res.regConsume();
            this.consume();
            const factor = res.register(this.parseNumNode());
            if (res.error) return res;
            return res.success(new UnaryNode(new OpNode(tok), factor));
        }

        return this.getExponentials();
    }

    /**
     * Gets a term (A term consists of 2+ numbers getting multiplied/divided with each other)
     *
     * @returns Binary Node/Tree
     * @memberof BlanketParser
     */
    getTerm() {
        return this.makeBinaryTree(this.parseNumNode, ["MULT_OP", "DIV_OP"]);
    }

    /**
     * Parses an Identifier.
     *
     * @returns ScalarNode
     * @memberof BlanketParser
     */
    getIdent() {
        const res = new ParseErrHandler();

        if (this.current().type !== "IDENT") {
            return res.failure(
                new SyntaxError({
                    message: "Expected Identifier",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );
        }

        const varName = this.current();
        res.regConsume();
        this.consume();

        if (this.current().value !== "=") {
            return res.failure(
                new SyntaxError({
                    message: "Expected '='",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );
        }

        res.regConsume();
        this.consume();
        const expr = res.register(this.getExpression());

        if (res.error) return res;
        else return res.success(new SclrAssNode(varName, expr));
    }

    /**
     * Parses an Arithmetic Expression
     *
     * @returns Binary Node/Tree
     * @memberof BlanketParser
     */
    getArithmetic() {
        return this.makeBinaryTree(this.getTerm, ["ADD_OP", "SUB_OP"]);
    }

    /**
     * Parses Comparators.
     *
     * @returns (BinaryNode/Tree)/UnaryNode
     * @memberof BlanketParser
     */
    getComparison() {
        const res = new ParseErrHandler();

        if (this.current().matches("KEYW", "not")) {
            const opTok = this.current();

            res.regConsume();
            this.consume();

            const node = res.register(this.getComparison());
            if (res.error) return res;
            else return res.success(new UnaryNode(opTok, node));
        }

        const node = res.register(this.makeBinaryTree(this.getArithmetic, Object.values(COMPARATORS)));

        if (res.error)
            return res.failure(
                new InvalidTokenErr({
                    message: "Expected an Integer/Float/Identifier/Operator/Comparator",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );

        return res.success(node);
    }

    /**
     * Gets an entire expression Binary Tree while considering operator precedence.
     *
     * @returns Binary Node/Tree
     * @memberof BlanketParser
     */
    getExpression() {
        const res = new ParseErrHandler();

        if (this.current().matches("KEYW", "sclr")) {
            res.regConsume();
            this.consume();
            return this.getIdent();
        }

        const node = res.register(this.makeBinaryTree(this.getComparison, ["KEYW, or", "KEYW, and"]));

        if (res.error)
            return res.failure(
                new InvalidTokenErr({
                    message: "Expected an Integer/Float/Identifier/Operator/'sclr'",
                    posStart: this.current().posStart,
                    posEnd: this.current().posEnd
                })
            );

        return res.success(node);
    }

    /**
     * Takes in a function and an array of operators and returns a binary tree.
     *
     * @param {Function} func
     * @param {Array} ops
     * @returns Binary Tree
     * @memberof BlanketParser
     */
    makeBinaryTree(funcA, ops, funcB = null) {
        if (funcB == null) funcB = funcA;

        const res = new ParseErrHandler();
        let leftNode = res.register(funcA.bind(this)());
        if (res.error) return res;

        while (ops.includes(this.current().type) || ops.includes(`${this.current().type}, ${this.current().value}`)) {
            const operator = this.current();
            res.regConsume();
            this.consume();
            const rightNode = res.register(funcB.bind(this)());
            if (res.error) return res;
            leftNode = new BinaryNode(leftNode, new OpNode(operator), rightNode);
        }

        return res.success(leftNode);
    }

    /**
     * Parses the Token Stream.
     *
     * @returns Parse Result
     * @memberof BlanketParser
     */
    parseTokens() {
        const result = this.getExpression();
        if (result.error && this.current().type !== "EOF") {
            return result.failure(
                new SyntaxError({
                    message: "Bad Expression",
                    posStart: this.current().posStart,
                    posEnd: this.current().posStart
                })
            );
        }

        return result;
    }
}

/**
 * Runtime Error Handler Class.
 *
 * @class RTErrHandler
 */
class RTErrHandler {
    /**
     * Creates an instance of RTErrHandler.
     * @memberof RTErrHandler
     */
    constructor() {
        this.value = null;
        this.error = null;
    }

    /**
     * Registers an action in the interpreter.
     *
     * @param {IntrpAction} res
     * @returns res/res.value
     * @memberof RTErrHandler
     */
    register(res) {
        if (res instanceof RTErrHandler) {
            if (res.error) this.error = res.error;
            return res.value;
        }

        return res;
    }

    /**
     * Called when an interpretation is successful.
     *
     * @param {IntrpValue} value
     * @memberof RTErrHandler
     */
    success(value) {
        this.value = value;
        return this;
    }

    /**
     * Called when an interpretation has failed.
     *
     * @param {IntrpValue} error
     * @memberof RTErrHandler
     */
    failure(error) {
        this.error = error;
        return this;
    }
}

/**
 * Intepreter Number Class
 *
 * @class IntrpNumber
 */
class IntrpNumber {
    /**
     * Creates an instance of IntrpNumber.
     * @param {NumberNode} value
     * @memberof IntrpNumber
     */
    constructor(value) {
        this.value = value;
        this.posStart = null;
        this.posEnd = null;
        this.context = null;
    }

    /**
     * Sets the position of the number.
     *
     * @param {StartPos} [posStart=null]
     * @param {EndPos} [posEnd=null]
     * @memberof IntrpNumber
     */
    setPos(posStart = null, posEnd = null) {
        this.posStart = posStart;
        this.posEnd = posEnd;
        return this;
    }

    /**
     * Sets the context of the number.
     *
     * @param {Context} [context=null]
     * @returns
     * @memberof IntrpNumber
     */
    setContext(context = null) {
        this.context = context;
        return this;
    }

    /**
     * Adds two NumberNode values.
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    addedTo(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(this.value + other.value).setContext(this.context), null];
    }

    /**
     * Subtracts two NumberNode values.
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    subbedBy(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(this.value - other.value).setContext(this.context), null];
    }

    /**
     * Multiplies two NumberNode values.
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    multedBy(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(this.value * other.value).setContext(this.context), null];
    }

    /**
     * Raises a NumberNode to the power of another.
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    powerTo(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Math.pow(this.value, other.value)).setContext(this.context), null];
    }

    /**
     * Divides two NumberNode values.
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    dividedBy(other) {
        if (other instanceof IntrpNumber) {
            if (other.value === 0)
                return [
                    null,
                    new RuntimeError({
                        message: "Division by zero",
                        posStart: other.posStart,
                        posEnd: other.posEnd,
                        context: this.context
                    })
                ];
            else return [new IntrpNumber(this.value / other.value).setContext(this.context), null];
        }
    }

    /**
     * '>' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    getCompGT(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value > other.value)).setContext(this.context), null];
    }

    /**
     * '>=' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    getCompGTE(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value >= other.value)).setContext(this.context), null];
    }

    /**
     * '<' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    getCompST(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value < other.value)).setContext(this.context), null];
    }

    /**
     * '<=' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    getCompSTE(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value <= other.value)).setContext(this.context), null];
    }

    /**
     * '==' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    getCompEQ(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value === other.value)).setContext(this.context), null];
    }

    /**
     * '!=' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    getCompNEQ(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value !== other.value)).setContext(this.context), null];
    }

    /**
     * '||' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber Instance
     * @memberof IntrpNumber
     */
    ORedBy(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(this.value || other.value).setContext(this.context), null];
    }

    /**
     * '&&' Comparator
     *
     * @param {IntrpNumber} other
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    ANDedBy(other) {
        if (other instanceof IntrpNumber) return [new IntrpNumber(Number(this.value && other.value)).setContext(this.context), null];
    }

    /**
     * Inverts this.value to a boolean number.
     *
     * @returns IntrpNumber Instance
     * @memberof IntrpNumber
     */
    notted() {
        return [new IntrpNumber(Number(!this.value)), null];
    }

    /**
     * Returns a copy of IntrpNumber.
     *
     * @returns IntrpNumber instance
     * @memberof IntrpNumber
     */
    copy() {
        const copy = new IntrpNumber(this.value);
        copy.setPos(this.posStart, this.posEnd);
        copy.setContext(this.context);
        return copy;
    }
}

/**
 * BlanketInterpreter Context Class.
 *
 * @class Context
 */
class Context {
    /**
     * Creates an instance of Context.
     * @param {Context} displayName
     * @param {ContextParent} [parent=null]
     * @param {EntryPos} [parentEntryPos=null]
     * @memberof Context
     */
    constructor(displayName, parent = null, parentEntryPos = null) {
        this.displayName = displayName;
        this.parent = parent;
        this.parentEntryPos = parentEntryPos;
        this.symbolTable = null;
    }
}

/**
 * Symbol Table Class for Idents.
 *
 * @class SymbolTable
 */
class SymbolTable {
    /**
     * Creates an instance of SymbolTable.
     * @memberof SymbolTable
     */
    constructor() {
        this.symbols = {};
        this.parent = null;
    }

    /**
     * Gets a value from the table by its Ident.
     *
     * @param {IdentName} name
     * @returns Ident Value
     * @memberof SymbolTable
     */
    get(name) {
        const value = this.symbols[name];

        if (!value && this.parent) return this.parent.get(name);
        else return value;
    }

    /**
     * Sets an Ident in the table alongside its value.
     *
     * @param {IdentName} name
     * @param {IdentValue} [value=null]
     * @memberof SymbolTable
     */
    set(name, value = null) {
        this.symbols[name] = value;
    }

    /**
     * Removes an Ident from the table.
     *
     * @param {IdentName} name
     * @memberof SymbolTable
     */
    remove(name) {
        delete this.symbols[name];
    }
}

/**
 * Main Interpreter Class.
 *
 * @class BlanketInterpreter
 */
class BlanketInterpreter {
    /**
     * Used to visit a node.
     *
     * @param {ParseNode} node
     * @returns Interpretation method invocation based on the node.
     * @memberof BlanketInterpreter
     */
    visit(node, context) {
        const methodName = `visit${node.constructor.name}`;
        return this[methodName] ? this[methodName](node, context) : this.noVisitMethod(node);
    }

    /**
     * Throws an exception on detection of an invalid node.
     *
     * @param {ParseNode} node
     * @memberof BlanketInterpreter
     */
    noVisitMethod(node) {
        throw `No visit${node.constructor.name} method defined.`;
    }

    /**
     * Visits a number node and creates an interpreter instance for it.
     *
     * @param {ParseNode} node
     * @returns IntrpNumber instance
     * @memberof BlanketInterpreter
     */
    visitNumNode(node, context) {
        return new RTErrHandler().success(new IntrpNumber(node.value).setContext(context).setPos(node.posStart, node.posEnd));
    }

    /**
     * Traverses and interprets a binary tree and returns the result.
     *
     * @param {ParseNode} node
     * @returns Expression Resolution
     * @memberof BlanketInterpreter
     */
    visitBinaryNode(node, context) {
        const res = new RTErrHandler();
        const leftNode = res.register(this.visit(node.leftNode, context));
        if (res.error) return res;
        const rightNode = res.register(this.visit(node.rightNode, context));
        if (res.error) return res;
        let result = Number;
        let error = null;

        if (node.operator.value === "+") [result, error] = leftNode.addedTo(rightNode);
        else if (node.operator.value === "-") [result, error] = leftNode.subbedBy(rightNode);
        else if (node.operator.value === "*") [result, error] = leftNode.multedBy(rightNode);
        else if (node.operator.value === "/") [result, error] = leftNode.dividedBy(rightNode);
        else if (node.operator.value === "^") [result, error] = leftNode.powerTo(rightNode);
        else if (node.operator.value === ">") [result, error] = leftNode.getCompGT(rightNode);
        else if (node.operator.value === "<") [result, error] = leftNode.getCompST(rightNode);
        else if (node.operator.value === ">=") [result, error] = leftNode.getCompGTE(rightNode);
        else if (node.operator.value === "<=") [result, error] = leftNode.getCompSTE(rightNode);
        else if (node.operator.value === "!=") [result, error] = leftNode.getCompNEQ(rightNode);
        else if (node.operator.value === "==") [result, error] = leftNode.getCompEQ(rightNode);
        else if (node.operator.value === "and") [result, error] = leftNode.ANDedBy(rightNode);
        else if (node.operator.value === "or") [result, error] = leftNode.ORedBy(rightNode);

        if (error) return res.failure(error);
        else return res.success(result.setPos(node.posStart, node.posEnd));
    }

    /**
     * Interprets the value of a unary node and returns it.
     *
     * @param {ParseNode} node
     * @returns IntrpNumber instance
     * @memberof BlanketInterpreter
     */
    visitUnaryNode(node, context) {
        const res = new RTErrHandler();
        let number = res.register(this.visit(node.numNode, context));
        if (res.error) return res;
        let error = null;

        if (node.opNode.value === "-") [number, error] = number.multedBy(new IntrpNumber(-1));
        else if (node.opNode.value === "not") [number, error] = number.notted();

        if (error) return res.failure(error);
        else return res.success(number.setPos(node.numNode.posStart, node.numNode.posEnd));
    }

    /**
     * Accesses an Ident from the SymbolTable and gets its value.
     *
     * @param {SclrAccNode} node
     * @param {Context} context
     * @returns Value of Ident
     * @memberof BlanketInterpreter
     */
    visitSclrAccNode(node, context) {
        const res = new RTErrHandler();
        const sclrName = node.sclrName;
        let value = context.symbolTable.get(sclrName);

        if (!value)
            return res.failure(
                new RuntimeError({
                    message: `${sclrName} is not defined`,
                    posStart: node.posStart,
                    posEnd: node.posEnd,
                    context: context
                })
            );

        value = value.copy().setPos(node.posStart, node.posEnd);
        return res.success(value);
    }

    /**
     * Assigns a Ident to the Symbol Table and a value to the Ident.
     *
     * @param {SclrAssNode} node
     * @param {Context} context
     * @memberof BlanketInterpreter
     */
    visitSclrAssNode(node, context) {
        const res = new RTErrHandler();
        const sclrName = node.nameToken.value;
        const value = res.register(this.visit(node.valNode, context));

        if (res.error) return res;

        context.symbolTable.set(sclrName, value);
        return res.success(value);
    }

    /**
     * Interprets an if/then/else statement
     *
     * @param {IfNode} node
     * @param {Context} context
     * @returns if/then/else result
     * @memberof BlanketInterpreter
     */
    visitIfNode(node, context) {
        const res = new RTErrHandler();

        for (let [condition, expression] of node.cases) {
            const condValue = res.register(this.visit(condition, context));
            if (res.error) return res;

            if (condValue) {
                const exprValue = res.register(this.visit(expression, context));
                if (res.error) return res;
                else return res.success(exprValue);
            }
        }

        if (node.elseCase) {
            const elseValue = res.register(this.visit(node.elseCase, context));
            if (res.error) return res;
            else return res.success(elseValue);
        }

        return res.success(null);
    }
}

const globalSymTable = new SymbolTable();
globalSymTable.set("null", new IntrpNumber(0));
globalSymTable.set("true", new IntrpNumber(1));
globalSymTable.set("false", new IntrpNumber(0));

/**
 * Main function that takes in the code and returns the parse result.
 *
 * @param {InputStream} code
 * @returns Parse Result
 */
function ParseCode(code) {
    const lexed = new BlanketLexer(null, code).tokenizeAll();
    // return lexed;
    const parsed = new BlanketParser(lexed).parseTokens();
    if (parsed.error) return parsed.error.log();
    // return parsed;

    const context = new Context("<StdBlanket>");
    context.symbolTable = globalSymTable;
    const IntrpRes = new BlanketInterpreter().visit(parsed.node, context);

    return IntrpRes.value ? IntrpRes.value : IntrpRes.error.log();
}

module.exports = ParseCode;
