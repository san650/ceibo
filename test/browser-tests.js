const { module, test } = window.QUnit;
const { Ceibo } = window;

module('Browser', function() {
  test('returns a copy of the keys', function(assert) {
    var tree = Ceibo.create({ key: 'value' });

    assert.equal(tree.key, 'value');
  });

  test('evaluates a descriptor', function(assert) {
    var tree = Ceibo.create({
      key: {
        isDescriptor: true,
        get: function() {
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
          get: function() {
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

    assert.equal(Ceibo.parent(tree.key).key.anotherKey, 'value');
  });

  test('overrides how strings are built', function(assert) {
    var tree = Ceibo.create(
      { key: "value" },
      {
        builder: {
          string: function(node, blueprintKey, value, defaultBuilder) {
            return defaultBuilder(node, blueprintKey, 'cuack ' + value, defaultBuilder);
          }
        }
      }
    );

    assert.equal(tree.key, 'cuack value');
  });

  test('support value in descriptors', function(assert) {
    function dynamic(definition) {
      return {
        isDescriptor: true,
        value: function(index) {
          var copy = {};

          Object.keys(definition).forEach(function(attr) {
            copy[attr] = index + ' ' + definition[attr];
          });

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
      get: function() {
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
    function buildObject(node, blueprintKey, blueprint) {
      var value = {
        foo: 'generated property'
      };

      // Create child component
      Ceibo.defineProperty(node, blueprintKey, value);

      // Do the recursion automatically
      return [value, blueprint];
    }

    var tree = Ceibo.create(
      {
        key: { anotherKey: 'value' }
      },
      {
        builder: {
          object: buildObject
        }
      }
    );

    assert.equal(tree.foo, 'generated property');
    assert.equal(tree.key.anotherKey, 'value');
    assert.equal(tree.key.foo, 'generated property');
  });

  test('descriptors can access current tree by default', function(assert) {
    var tree = Ceibo.create({
      foo: {
        isDescriptor: true,

        get: function() {
          return 'The answer to life, the universe and everything is ' + this.bar;
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

        get: function() {
          return 'bar';
        },

        setup: function(target, keyName) {
          Ceibo.defineProperty(target, keyName.toUpperCase(), 'generated property');
        }
      }
    });

    assert.equal(tree.FOO, 'generated property');
  });

  test('.create asigns parent tree', function(assert) {
    var parentTree = Ceibo.create({ foo: { qux: 'another value' }, bar: 'a value' });
    var tree1 = Ceibo.create({ baz: {} }, { parent: parentTree });
    var tree2 = Ceibo.create({ baz: {} }, { parent: parentTree.foo });

    assert.equal(Ceibo.parent(Ceibo.parent(tree1.baz)).bar, 'a value');
    assert.equal(Ceibo.parent(tree2).qux, 'another value');
  });

  test(".create doesn't assigns a parent tree to the root", function(assert) {
    var tree = Ceibo.create({ foo: 'a value' });

    assert.ok(!Ceibo.parent(tree));
  });

  test(".parent returns undefined when node doesn't have parent or doesn't exists", function(assert) {
    var node = undefined;

    assert.ok(!Ceibo.parent(node));
  });

  test(".parent doesn't generates enumerable attribute", function(assert) {
    var tree = Ceibo.create({ foo: { bar: "a value" } });

    assert.equal(Object.keys(tree.foo).length, 1);
  });

  test("descriptor's .get function receives the key as argument", function(assert) {
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

    assert.equal(root.foo, 'foo');
    assert.equal(root.bar, 'bar');
  });

  test('descriptor can access all the keys from root-to-leaf path', function(assert) {
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

    assert.deepEqual(tree.foo.bar.baz.qux, ['root', 'foo', 'bar', 'baz', 'qux']);
  });
});