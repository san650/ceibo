# Ceibo

![Latest version](https://img.shields.io/npm/v/ceibo.svg)

JavaScript micro library to model trees that evaluate arbitrary code when
accessing its nodes.

The tree is modeled as a plain JavaScript object where each node has an
arbitrary getter function. This allows to have a representation of a tree where
a subtree is generated on the fly when a node is accessed.

## Examples

Let's start by doing the most simple case, the identity case:

```js
var root = Ceibo.create({
  foo: {
    bar: 'baz';
  }
});

console.log(root.foo.bar); // "baz"
```

You can create special node types called _descriptors_ that allow you to respond
to node access:

```js
var root = Ceibo.create({
  foo: {
    isDescriptor: true,

    get() {
      return 'bar';
    }
  }
});

console.log(root.foo); // "bar"
```

As you can see, a _descriptor_ is a JavaScript object that has a `isDescriptor`
attribute.

You can define a `get` method or you can declare a `value` attribute, then the
value attribute is going to be used as is:

```js
var root = Ceibo.create({
  foo: {
    isDescriptor: true,

    value(answer) {
      return `The answer to life, the universe and everything is ${answer}`;
    }
  }
});

console.log(root.foo('42')); // "The answer to life, the universe and everything is 42"
```

_descriptors_ can inspect and mutate the target object by defining a `setup`
method:

```js
var tree = Ceibo.create({
  foo: {
    isDescriptor: true,

    get() {
      return 'bar';
    },

    setup(target, keyName) {
      Ceibo.defineProperty(target, keyName.toUpperCase(), 'generated property');
    }
  }
});

console.log(tree.foo); // "bar"
console.log(tree.FOO); // "generated property"
```

Note that Ceibo trees are read-only, so you cannot reassign attributes:

```js
var root = Ceibo.create({
  foo: 'bar';
});

root.foo = 'baz'; // => throws an error!
```

You can redefine how each value type is processed when the Ceibo tree is
created:

```js

function buildString(node, blueprintKey, value, defaultBuilder) {
  return defaultBuilder(node, blueprintKey, `Cuack ${value}`);
}

var root = Ceibo.create(
  {
    foo: 'first value'
  },
  {
    builder: {
      string: buildString
    }
  }
);

console.log(root.foo); // "Cuack first value"
```

Redefine how plain objects are processed to generate custom attributes:

```js

function buildObject(node, blueprintKey, blueprint /*, defaultBuilder */) {
  var value = {
    generatedProperty: 'generated property'
  };

  // define current key and assign the new object
  Ceibo.defineProperty(node, blueprintKey, value);

  // continue to build the tree recursively
  return [value, blueprint];
}

var root = Ceibo.create(
  {
    foo: {
      bar: 'baz'
    }
  },
  {
    builder: {
      object: buildObject
    }
  }
);

console.log(tree.generatedProperty); // "generated property"
console.log(tree.foo.generatedProperty); // "generated property"
console.log(tree.foo.bar); // "baz"
```

You can navigate to parent nodes

```js
var tree = Ceibo.create({
  foo: {
    bar: {
      baz: 'a value'
    }
  }
});

console.log(Ceibo.parent(tree.foo.bar).bar.baz); // "a value"
```

You can assign custom parents to trees

```js
var parentTree = Ceibo.create({ foo: 'value' });
var childTree = Ceibo.create({ bar: 'another value' }, { parent: parentTree });

console.log(Ceibo.parent(childTree).foo); // "value"
```

Descriptor's `get` function receive the `key` when evaluated

```js
var descriptor = {
  isDescriptor: true,

  get: function(key) {
    return key;
  }
};

var root = Ceibo.create({
  foo: descriptor,
  bar: descriptor
});

console.log(root.foo); // "foo"
console.log(root.bar); // "bar"
```

Ceibo's nodes store some meta data, you can access said meta data using
`Ceibo.meta` function.

```js
var descriptor = {
  isDescriptor: true,

  get: function(key) {
    var keys = [key];
    var node = this;
    var meta;

    do {
      meta = Ceibo.meta(node);

      keys.unshift(meta.key);
    } while(node = Ceibo.parent(node));

    return keys;
  }
};

var tree = Ceibo.create({
  foo: {
    bar: {
      baz: {
        qux: descriptor
      }
    }
  }
});

console.log(tree.foo.bar.baz.qux); // ['root', 'foo', 'bar', 'baz', 'qux']
```

## Project's health

[![Build Status](https://travis-ci.org/san650/ceibo.svg?branch=master)](https://travis-ci.org/san650/ceibo)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/2b555391e4ec43e997c1ae60e7f39907)](https://www.codacy.com/app/san650/ceibo)

## License

Ceibo is licensed under the MIT license.

See [LICENSE](./LICENSE) for the full license text.
