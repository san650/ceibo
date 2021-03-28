function merge() {
  var target = arguments[0];
  var sources = Array.prototype.slice.call(arguments, 1);
  var source;

  for(var i = 0; i < sources.length; i++) {
    source = sources[i];

    if (!source) {
      continue;
    }

    for(var attr in source) {
      if (typeof source[attr] !== 'undefined') {
        target[attr] = source[attr];
      }
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

/**
 * Default `Descriptor` builder
 *
 * @param {TreeNode} node - parent node
 * @param {String} blueprintKey - key to build
 * @param {Descriptor} descriptor - descriptor to build
 * @param {Function} defaultBuilder - default function to build this type of node
 *
 * @return undefined
 */
function buildDescriptor(node, blueprintKey, descriptor /*, descriptorBuilder*/) {
  if (typeof descriptor.setup === 'function') {
    descriptor.setup(node, blueprintKey);
  }

  if (descriptor.value) {
    defineProperty(node, blueprintKey, descriptor.value);
  } else {
    defineProperty(node, blueprintKey, undefined, function() {
      return descriptor.get.call(this, blueprintKey);
    });
  }
}

/**
 * Default `Object` builder
 *
 * @param {TreeNode} node - parent node
 * @param {String} blueprintKey - key to build
 * @param {Object} blueprint - blueprint to build
 * @param {Function} defaultBuilder - default function to build this type of node
 *
 * @return {Array} [node, blueprint] to build
 */
function buildObject(node, blueprintKey, blueprint /*, defaultBuilder*/) {
  var value = {};

  // Create child component
  defineProperty(node, blueprintKey, value);

  // Set meta to object
  setMeta(value, blueprintKey);

  return [value, blueprint];
}

/**
 * Default builder
 *
 * @param {TreeNode} node - parent node
 * @param {String} blueprintKey - key to build
 * @param {Any} value - value to build
 * @param {Function} defaultBuilder - default function to build this type of node
 *
 * @return undefined
 */
function buildDefault(node, blueprintKey, value /*, defaultBuilder*/) {
  defineProperty(node, blueprintKey, value);
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

function setMeta(target, key) {
  Object.defineProperty(target, '__meta', {
    value: {
      key: key,
      type: 'node'
    },
    configurable: false,
    enumerable: false
  });
}

function meta(object) {
  // Be carefull: typeof(null) === 'object'
  if (typeof object === 'object' && object !== null) {
    return object['__meta'];
  }
}

function TreeBuilder(blueprint, builders) {
  this.blueprint = blueprint;
  this.builders = builders;
}

TreeBuilder.prototype = {
  builderFor: function(value) {
    return this.builders[typeOf(value)] || this.builders['default'];
  },

  build: function(parentTree) {
    var root = {},
      node;

    this.processNode({ root: this.blueprint }, root);

    node = root['root'];
    setParent(node, parentTree);

    return node;
  },

  processNode: function(blueprintNode, target, parent) {
    var keys = Object.keys(blueprintNode),
        that = this;

    keys.forEach(function(key) {
      var blueprintAttribute = blueprintNode[key],
          builder,
          defaultBuilder,
          result;

      builder = that.builderFor(blueprintAttribute);
      defaultBuilder = builderFor(blueprintAttribute);

      if (result = builder(target, key, blueprintAttribute, defaultBuilder)) {
        that.processNode(result[1], result[0], target);
      }
    });

    setParent(target, parent);

    return target;
  }
};

function builderFor(value) {
  return DEFAULT_BUILDERS[typeOf(value)] || DEFAULT_BUILDERS['default'];
}

const DEFAULT_BUILDERS = {
  descriptor: buildDescriptor,
  object: buildObject,
  default: buildDefault
};

const Ceibo = {
  defineProperty: defineProperty,

  create: function(blueprint, options) {
    options = options || {};

    var builder = merge({}, DEFAULT_BUILDERS, options.builder);

    return new TreeBuilder(blueprint, builder).build(options.parent);
  },

  parent: function(node) {
    return parent(node);
  },

  meta: function(node) {
    return meta(node);
  }
};

export default Ceibo;