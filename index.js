!function() {
  function merge(target, source) {
    for (var attr in source) {
      if (typeof source[attr] !== 'undefined') {
        target[attr] = source[attr];
      }
    }

    return target;
  }

  /**
   * Extends typeof to add the type 'descriptor'
   *
   */
  function typeOf(item) {
    if (item && item.isDescriptor) {
      return 'descriptor';
    }

    if (item === null) {
      return 'null';
    }

    return typeof(item);
  }

  function defineProperty(target, keyName, value, getter) {
    var options = {
      configurable: true,
      enumerable: true,
    };

    if (typeOf(getter) !== 'undefined') {
      options.get = getter;
    } else {
      options.writable = false;
      options.value = value;
    }

    Object.defineProperty(target, keyName, options);
  }

  function buildDescriptor(treeBuilder, target, key, attr) {
    if (typeof attr.setup === 'function') {
      attr.setup(target, key);
    }

    defineProperty(target, key, attr.value, attr.get);
  }

  function buildObject(treeBuilder, target, key, attr) {
    var object = {};

    // Create child component
    defineProperty(target, key, object);

    // Recursion
    treeBuilder.processNode(attr, object, target);
  }

  function buildDefault(treeBuilder, target, key, attr) {
    defineProperty(target, key, attr);
  }

  function setParent(target, parentTree) {
    // We want to delete the parent node if we set null or undefine. Also, this
    // workarounds an issue in phantomjs where we cannot use defineProperty to
    // redefine a property.
    // See. https://github.com/ariya/phantomjs/issues/11856
    delete target['__parentTreeNode'];

    if (parentTree) {
      Object.defineProperty(target, '__parentTreeNode', { value: parentTree, configurable: true, enumerable: false });
    }
  }

  function parent(object) {
    // Be carefull: typeof(null) === 'object'

    if (typeof object === 'object' && object !== null) {
      return object['__parentTreeNode'];
    }
  }

  function TreeBuilder(definition, builders) {
    this.definition = definition;
    this.builders = builders;
  }

  TreeBuilder.prototype = {
    builderFor: function(value) {
      return this.builders[typeOf(value)] || this.builders['default'];
    },

    build: function(parentTree) {
      var root = {},
        node;

      this.processNode({ root: this.definition }, root);

      node = root['root'];
      setParent(node, parentTree);

      return node;
    },

    processNode: function(definition, target, parent) {
      var keys = Object.keys(definition),
          that = this;

      keys.forEach(function(key) {
        var attr = definition[key],
          builder;

        builder = that.builderFor(attr);
        builder(that, target, key, attr);
      });

      setParent(target, parent);

      return target;
    }
  };

  var DEFAULT_BUILDERS = {
    descriptor: buildDescriptor,
    object: buildObject,
    default: buildDefault
  };

  var Ceibo = {
    defineProperty: defineProperty,

    create: function(definition, options) {
      options = options || {};

      var builder = merge(merge({}, DEFAULT_BUILDERS), options.builder);

      return new TreeBuilder(definition, builder).build(options.parent);
    },

    parent: function(node) {
      return parent(node);
    }
  };

  if (typeof define === 'function') {
    define('ceibo', ['exports'], function(__exports__) {
      'use strict';
      __exports__.Ceibo = Ceibo;
      __exports__.default = Ceibo;
    });
  } else {
    window.Ceibo = Ceibo;
  }
}();
