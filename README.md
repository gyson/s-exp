## s-exp

JavaScript with S Expression powered by tagged template string.

### Why

For fun.

### Rrerequisite

Node 4.x or babeljs.

### Installation

```
$ npm install s-exp
```

### Usage

```js
const s = require('s-exp')
const assert = require('assert')

s`  
    (def a 1)
    (def b 2)

    (.equal ${assert} (+ a b) 3)

    (def sleep (fn [time]
                   (new Promise (fn [resolve]
                                    (setTimeout resolve time)))))
`
```
