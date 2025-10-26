/**
 * Merge multiple objects into the first object. Merges from left to write.
 * It skips objects' attributes that are undefined.
 *
 */
function merge() {
  let target = arguments[0];
  let sources = Array.prototype.slice.call(arguments, 1);
  let source;

  for(let i = 0; i < sources.length; i++) {
    source = sources[i];

    if (!source) {
      continue;
    }

    for(let attr in source) {
      if (typeof source[attr] !== 'undefined') {
        target[attr] = source[attr];
      }
    }
  }

  return target;
}

/**
 * Extends typeof to add the type 'descriptor' and the type 'null'
 *
 */
function typeOf(item) {
  if (item && item.isDescriptor) {
    return 'descriptor';
  }

  // Be carefull: typeof(null) === 'object' but we want to avoid that.
  if (item === null) {
    return 'null';
  }

  return typeof(item);
}

function defineProperty(target, keyName, value, getter) {
  let options = {
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
 *
 * @return undefined
 */
function buildDescriptor(node, blueprintKey, descriptor) {
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
 *
 * @return {Array} [node, blueprint] to build
 */
function buildObject(node, blueprintKey, blueprint) {
  let value = {};

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
 *
 * @return undefined
 */
function buildDefault(node, blueprintKey, value) {
  defineProperty(node, blueprintKey, value);
}

const parentKey = Symbol("parent");

function setParent(target, parentTree) {
  // We want to delete the parent node if we set it to null or undefine.
  delete target[parentKey];

  if (parentTree) {
    Object.defineProperty(target, parentKey, {
      value: parentTree,
      configurable: true,
      enumerable: false
    });
  }
}

function parent(object) {
  if (typeOf(object) === 'object') {
    return object[parentKey];
  }
}

const metaKey = Symbol("meta");

function setMeta(target, key) {
  Object.defineProperty(target, metaKey, {
    value: {
      key: key,
      type: 'node'
    },
    configurable: false,
    enumerable: false
  });
}

function meta(object) {
  if (typeOf(object) === 'object') {
    return object[metaKey];
  }
}

class TreeBuilder {
  constructor(blueprint, builders) {
    this.blueprint = blueprint;
    this.builders = builders;
  }

  builderFor(value) {
    return this.builders[typeOf(value)] || this.builders['default'];
  }

  build(parentTree) {
    let root = {},
      node;

    this.processNode({ root: this.blueprint }, root);

    node = root['root'];
    setParent(node, parentTree);

    return node;
  }

  processNode(blueprintNode, target, parent) {
    let keys = Object.keys(blueprintNode);

    keys.forEach((key) => {
      let blueprintAttribute = blueprintNode[key],
        builder,
        defaultBuilder,
        result;

      builder = this.builderFor(blueprintAttribute);
      defaultBuilder = defaultBuilderFor(blueprintAttribute);

      // If the builder returns a [children, blueprint] then do the recursion on value
      // This is used to traverse all the children of the object.
      if (result = builder(target, key, blueprintAttribute, defaultBuilder)) {
        this.processNode(result[1], result[0], target);
      }
    });

    setParent(target, parent);

    return target;
  }
}

function defaultBuilderFor(value) {
  return DEFAULT_BUILDERS[typeOf(value)] || DEFAULT_BUILDERS['default'];
}

const DEFAULT_BUILDERS = {
  descriptor: buildDescriptor,
  object: buildObject,
  default: buildDefault
};

export default Ceibo = {
  defineProperty: defineProperty,

  create: function(blueprint, options) {
    options = options || {};

    let builders = merge({}, DEFAULT_BUILDERS, options.builder);

    return new TreeBuilder(blueprint, builders).build(options.parent);
  },

  parent: function(node) {
    return parent(node);
  },

  meta: function(node) {
    return meta(node);
  }
};
