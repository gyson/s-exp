'use strict';

const s = require('./index')
const assert = require('assert')

describe('s-exp', () => {
    it('should be able to call function', () => s`
        (def sum ${(a, b) => a + b})
        (.equal ${assert} (sum 1 2) 3)
    `)

    // it('should support macro')
    // it('should support for loop')
    // it('should support function destructuring')
    // it('should support (try (catch [e Error] ))')
    // it('should support async function')
    // it('should support generator function')

    it('should support def', () => s`
        (def a 1)
        (def b 2)
        (.equal ${assert} (+ a b) 3)
    `)

    it('should support (+ a b)', () => s`
        (.equal ${assert} (+ 1) 1)
        (.equal ${assert} (+ 1 2) 3)
        (.equal ${assert} (+ 1 2 3) 6)
    `)

    it('should support (- a b)', () => s`
        (.equal ${assert} (- 1) -1)
        (.equal ${assert} (- 2 1) 1)
        (.equal ${assert} (- 3 1 1) 1)
    `)

    it('should support (* a b)', () => s`
        (.equal ${assert} (* 1) 1)
        (.equal ${assert} (* 2 2) 4)
        (.equal ${assert} (* 2 2 2) 8)
    `)

    it('should support (/ a b)', () => s`
        (.equal ${assert} (/ 2) 0.5)
        (.equal ${assert} (/ 2 2) 1)
        (.equal ${assert} (/ 8 2 2) 2)
    `)

    it('should support (new Class ...args)', () => s`
        (def arr (new Array 2))
        (.ok ${assert} (instanceof arr Array))
        (.equal ${assert} (get arr "length") 2)

        (def map (new Map [[1 1] [2 2] [3 3]]))
        (.ok ${assert} (instanceof map Map))
        (.equal ${assert} (.get map 1) 1)
        (.equal ${assert} (.get map 2) 2)
        (.equal ${assert} (.get map 3) 3)

        (def Sum ${class {
            constructor(a, b, c) {
                this.sum = a + b + c
            }
        }})
        (.equal ${assert} (get (new Sum 1 1 1) "sum") 3)

        (def promise (new Promise (fn [resolve] (resolve 123))))
        (.then promise (fn [res] (.equal ${assert} res 123)))
    `)
})
