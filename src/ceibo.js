var Ceibo = {};

!function(module) {
  function merge(target, source) {
    for (var attr in source) {
      target[attr] = source[attr];
    }

    return target;
  }

  /**
   * Extends Ember.typeOf to add the type 'descriptor'
   *
   */
  function typeOf(item) {
    if (item && item.isDescriptor) {
      return 'descriptor';
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

  function TreeBuilder(definition, builders) {
    this.definition = definition;
    this.builders = builders;
  }

  TreeBuilder.prototype = {
    builderFor(value) {
      return this.builders[typeOf(value)] || this.builders['default'];
    },

    build(parentTree) {
      var root = {};

      this.processNode({ root: this.definition }, root);

      var node = root['root'];
      delete node.__parent;

      if (parentTree) {
        // Create parent reference
        defineProperty(node, '__parent', parentTree);
      }

      return node;
    },

    processNode(definition, target, parent) {
      var keys = Object.keys(definition);

      keys.forEach(key => {
        var attr = definition[key],
            builder;

        builder = this.builderFor(attr);
        builder(this, target, key, attr);
      });

      if (parent) {
        // Create parent reference
        defineProperty(target, '__parent', parent);
      }

      return target;
    }
  };

  module.create = function(definition, options) {
    options = options || {};

    var builder = merge(merge({}, this.DEFAULT_BUILDERS), options.builder);

    return new TreeBuilder(definition, builder).build(options.parent);
  };

  module.DEFAULT_BUILDERS = {
    descriptor: buildDescriptor,
    object: buildObject,
    default: buildDefault
  };

  module.defineProperty = defineProperty;
}(Ceibo);
