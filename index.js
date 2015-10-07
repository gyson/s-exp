'use strict';

const assert = require('assert')

module.exports = s
module.exports.s = s
module.exports.default = s

// globally shared by all s-exp
let shared = Object.create(global)

function s(strings) {
    let str = strings.raw[0]
    let env = Object.create(shared)

    for (let i = 1; i < arguments.length; i++) {
        let name = 'anonymous-embedded-' + i
        env[name] = arguments[i]
        str += ' ' + name + ' ' + strings.raw[i]
    }

    return execute(env, parse(`(do ${str})`))
}
//
// // `(+ 1 2 3)` => ['+', 1, 2, 3]
function parse(str) {
    let re = /\(|\)|\[|\]|\{|\}|[a-zA-Z0-9\+\-\*\/\%\$\!\.\?]+|"[^"]*"|'[^']*'/g

    let tokens = []
    let result = re.exec(str)

    while (result !== null) {
        tokens.push(result[0])
        result = re.exec(str)
    }

    let index = 0

    function scan(list) {
        while (index < tokens.length) {
            let token = tokens[index]
            index += 1
            switch (token) {
            case '(':
                list.push(scan([]));
                break;
            case '[':
                list.push(scan(['array']))
                break;
            case '{':
                list.push(scan(['object']))
                break;
            case ')':
            case '}':
            case ']':
                return list
            default:
                list.push(token)
            }
        }
        throw new Error('inbalanced "()", missing ")" or "]" or "}"')
    }

    assert.equal(tokens.shift(), '(') // (do x y z)

    let list = scan([])

    if (index < tokens.length) {
        throw new Error('inbalanced "()", missing "(" or "[" or "{"')
    }

    return list
}

function execute(env, exp) {
    if (Array.isArray(exp)) {
        if (exp.length === 0) {
            return null // or null ?
        }
        let first = execute(env, exp[0])
        if (typeof first === 'function') {
            if (isMeta(first)) {
                return first(env, exp.slice(1))
            } else {
                return first.apply(null, exp.slice(1).map(e => execute(env, e)))
            }
        }
        // (.log console 1 2 3)
        if (typeof exp[0] === 'string' && exp[0][0] === '.') {
            let method = exp[0].substring(1)
            let object = execute(env, exp[1])
            return object[method].apply(object, exp.slice(2).map(e => execute(env, e)))
        }
        console.log(exp)
        throw new Error(first + " is not function or (.method object)")
    }

    // parse null, true, false
    switch (exp) {
    case 'null':  return null;
    case 'true':  return true;
    case 'false': return false;
    }

    // parse number
    let num = Number(exp)
    if (!isNaN(num)) {
        return num
    }

    // parse string
    if (exp[0] === '"' || exp[0] === "'") {
        return exp.substring(1, exp.length - 1)
    }

    // variable
    return env[exp]
}

function createMeta(fn) {
    fn.__macro__ = true
    return fn
}

function isMeta(fn) {
    return !!fn.__macro__
}

Object.assign(shared, {
    'def': createMeta((env, exp) => {
        // (def name abc)
        let val = execute(env, ['do'].concat(exp.slice(1)))
        env[exp[0]] = val
        return val
    }),

    'do': function () {
        return arguments[arguments.length-1]
    },

    // TODO: match arguments length
    // (fn [a b] (+ a b))
    // (fn name [a b] (+ a b))
    // (fn name
    //     ([a] (+ a))
    //     ([a b] (+ a b))
    //     ([a b ...others] (+ a b))) // rest
    'fn': createMeta((env, exp) => {
        // parse name
        if (typeof exp[0] === 'string') {
            env = Object.create(env)
            env[exp[0]] = fn
            exp = exp.slice(1)
        }
        // (fn [a b] (+ a b)) => (fn ([a b] (+ a b)))
        // if (Array.isArray(exp[0]) && exp[0][0] === 'array') {
        //     exp = [exp]
        // }
        function fn() {
            let names = exp[0].slice(1)
            env = Object.create(env)
            for (let i = 0; i < names.length; i++) {
                env[names[i]] = arguments[i]
            }
            return execute(env, ['do'].concat(exp.slice(1)))
        }
        return fn
    }),

    'array': function () {
        return Array.from(arguments)
    },

    'object': function () {
        if (arguments.length % 2 !== 0) {
            throw new Error('args.length of (object ...args) is not even')
        }
        let obj = {}
        for (let i = 0; i < arguments.length; i += 2) {
            obj[arguments[i]] = arguments[i + 1]
        }
        return obj
    },

    'if': createMeta((env, exp) => {
        if (execute(env, exp[0])) {
            return execute(env, exp[1])
        }
        if (exp.length === 3) {
            return execute(env, exp[2])
        } else {
            return null
        }
    }),

    // TODO ?
    // 'macro': createMeta((env, exp) => { }),
    // 'fn-async': createMeta((env, exp) => { }),
    // 'fn-generator': createMeta((env, exp) => { }),

    "=": (x, y) => x === y,

    '!=': (x, y) => x !== y,

    '>': (x, y) => x > y,

    '<': (x, y) => x < y,

    '>=': (x, y) => x >= y,

    '<=': (x, y) => x <= y,

    '+': function (x) {
        return Array.from(arguments).reduce((x, y) => x + y)
    },

    '*': function (x) {
        return Array.from(arguments).reduce((x, y) => x * y)
    },

    '-': function (x) {
        if (arguments.length === 1) { return -x }
        return Array.from(arguments).slice(1).reduce((x, y) => x - y, x)
    },

    '/': function (x) {
        if (arguments.length === 1) { return 1 / x }
        return Array.from(arguments).slice(1).reduce((x, y) => x / y, x)
    },

    '%': function (x) {
        if (arguments.length === 1) { throw new Error() }
        return Array.from(arguments).slice(1).reduce((x, y) => x % y, x)
    },

    'new': function (Class) {
        return new (Function.prototype.bind.apply(Class, Array.from(arguments)))()
        // (Class, ...args) => new Class(...args)
    },

    'throw': (error) => { throw error },

    'typeof': (obj) => typeof obj,

    'get': (obj, prop) => obj[prop],

    'set': (obj, prop, val) => obj[prop] = val,

    'instanceof': (obj, Class) => obj instanceof Class,
})
