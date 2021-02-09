const Ceibo = require('../');
const QUnit = require('qunit');
const { test } = QUnit;

QUnit.module('commonjs', function() {
    test('it works', function(assert) {
        var tree = Ceibo.create({ key: 'value' });

        assert.equal(tree.key, 'value');
    });
});
