module('Unit');

test('returns a copy of the keys', function(assert) {
  var tree = Ceibo.create({ key: 'value' });

  assert.equal(tree.key, 'value');
});

test('evaluates a descriptor', function(assert) {
  var tree = Ceibo.create({
    key: {
      isDescriptor: true,
      get() {
        return 'value';
      }
    }
  });

  assert.equal(tree.key, 'value');
});

test('process definition recursively', function(assert) {
  var tree = Ceibo.create({
    key: {
      anotherKey: 'value'
    }
  });

  assert.equal(tree.key.anotherKey, 'value');
});

test('process descriptors recursively', function(assert) {
  var tree = Ceibo.create({
    key: {
      anotherKey: {
        isDescriptor: true,
        get() {
          return 'value';
        }
      }
    }
  });

  assert.equal(tree.key.anotherKey, 'value');
});

test('parent node is accessible', function(assert) {
  var tree = Ceibo.create({
    key: {
      anotherKey: 'value'
    }
  });

  assert.equal(tree.key.__parent.key.anotherKey, 'value');
});

test('overrides how strings are built', function(assert) {
  var tree = Ceibo.create({
    key: "value"
  }, {
    string: function(builder, target, key, value) {
      target[key] = `cuack ${value}`;
    }
  });

  assert.equal(tree.key, 'cuack value');
});

test('support value in descriptors', function(assert) {
  function dynamic(definition) {
    return {
      isDescriptor: true,
      value: function(index) {
        var copy = {};

        for (var attr in definition) {
          copy[attr] = `${index} ${definition[attr]}`;
        }

        return copy;
      }
    };
  }

  var tree = Ceibo.create({
    key: dynamic({
      anotherKey: 'value'
    })
  });

  assert.equal(tree.key(1).anotherKey, '1 value');
  assert.equal(tree.key(2).anotherKey, '2 value');
});

test('allows dynamic segments to process descriptors', function(assert) {
  function dynamic(definition) {
    return {
      isDescriptor: true,
      value: function() {
        return Ceibo.create(definition);
      }
    };
  }

  var descriptor = {
    isDescriptor: true,
    get() {
      return 'value';
    }
  };

  var tree = Ceibo.create({
    key: dynamic({
      anotherKey: descriptor
    })
  });

  assert.equal(tree.key(1).anotherKey, 'value');
});

test('allows to insert custom keys to objects', function(assert) {
  function buildObject(treeBuilder, target, key, value) {
    var childNode = {
      foo: 'generated property'
    };

    // Create child component
    Ceibo.defineProperty(target, key, childNode);

    // Recursion
    treeBuilder.processNode(value, childNode, target);
  }

  var tree = Ceibo.create({
    key: {
      anotherKey: 'value'
    }
  }, { object: buildObject });

  assert.equal(tree.foo, 'generated property');
  assert.equal(tree.key.anotherKey, 'value');
  assert.equal(tree.key.foo, 'generated property');
});

test('descriptors can access current tree by default', function(assert) {
  var tree = Ceibo.create({
    foo: {
      isDescriptor: true,

      get() {
        return `The answer to life, the universe and everything is ${this.bar}`;
      }
    },

    bar: {
      isDescriptor: true,

      value: 42
    }
  });

  assert.equal(
    tree.foo,
    'The answer to life, the universe and everything is 42'
  );
});

test('descriptors can mutate tree on build', function(assert) {
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

  assert.equal(tree.FOO, 'generated property');
});
