import Ceibo from '../index';

describe('Ceibo', () => {
  test('returns a copy of the keys', () => {
    var tree = Ceibo.create({ key: 'value' });

    expect(tree.key).toEqual('value');
  });

  test('evaluates a descriptor', () => {
    var tree = Ceibo.create({
      key: {
        isDescriptor: true,
        get: function() {
          return 'value';
        }
      }
    });

    expect(tree.key).toEqual('value');
  });

  test('process definition recursively', () => {
    var tree = Ceibo.create({
      key: {
        anotherKey: 'value'
      }
    });

    expect(tree.key.anotherKey).toEqual('value');
  });

  test('process descriptors recursively', () => {
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

    expect(tree.key.anotherKey).toEqual('value');
  });

  test('parent node is accessible', () => {
    var tree = Ceibo.create({
      key: {
        anotherKey: 'value'
      }
    });

    expect(Ceibo.parent(tree.key).key.anotherKey).toEqual('value');
  });

  test('overrides how strings are built', () => {
    var tree = Ceibo.create(
      { key: "value" },
      {
        builder: {
          string: function(node, blueprintKey, value, defaultBuilder) {
            return defaultBuilder(node, blueprintKey, 'cuack ' + value);
          }
        }
      }
    );

    expect(tree.key).toEqual('cuack value');
  });

  test('support value in descriptors', () => {
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

    expect(tree.key(1).anotherKey).toEqual('1 value');
    expect(tree.key(2).anotherKey).toEqual('2 value');
  });

  test('allows dynamic segments to process descriptors', () => {
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

    expect(tree.key(1).anotherKey).toEqual('value');
  });

  test('allows to insert custom keys to objects', () => {
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

    expect(tree.foo).toEqual('generated property');
    expect(tree.key.anotherKey).toEqual('value');
    expect(tree.key.foo).toEqual('generated property');
  });

  test('descriptors can access current tree by default', () => {
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

    expect(tree.foo).toEqual(
      'The answer to life, the universe and everything is 42'
    );
  });

  test('descriptors can mutate tree on build', () => {
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

    expect(tree.FOO).toEqual('generated property');
  });

  test('.create - assigns parent tree', () => {
    var parentTree = Ceibo.create({ foo: { qux: 'another value' }, bar: 'a value' });
    var tree1 = Ceibo.create({ baz: {} }, { parent: parentTree });
    var tree2 = Ceibo.create({ baz: {} }, { parent: parentTree.foo });

    expect(Ceibo.parent(Ceibo.parent(tree1.baz)).bar).toEqual('a value');
    expect(Ceibo.parent(tree2).qux).toEqual('another value');
  });

  test(".create - doesn't assign a parent tree to the root", () => {
    var tree = Ceibo.create({ foo: 'a value' });

    expect(Ceibo.parent(tree)).toBeFalsy();
  });

  test(".parent - returns undefined when node doesn't have parent or doesn't exists", () => {
    var node = undefined;

    expect(Ceibo.parent(node)).toBeFalsy();
  });

  test(".parent - doesn't generate enumerable attribute", () => {
    var tree = Ceibo.create({ foo: { bar: "a value" } });

    expect(Object.keys(tree.foo).length).toEqual(1);
  });

  test("descriptor's .get function receives the key as argument", () => {
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

    expect(root.foo).toEqual('foo');
    expect(root.bar).toEqual('bar');
  });

  test('descriptor can access all the keys from root-to-leaf path', () => {
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

    expect(tree.foo.bar.baz.qux).toEqual(['root', 'foo', 'bar', 'baz', 'qux']);
  });
});
