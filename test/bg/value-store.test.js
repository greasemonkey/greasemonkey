'use strict';
describe('bg/value-store', () => {
  let storeName = 'gmTests';

  function cleanup() { return ValueStore.deleteStore(storeName); }
  beforeEach(cleanup);
  // Cleanup the stores one more time.
  after(cleanup);

  it('can set and retrieve a value', () => {
    let testKey = 'gmFoo';
    let testValue = 'gmValue';

    return ValueStore.setValue(storeName, testKey, testValue)
        .then(isSet => {
          assert.equal(isSet, true, 'Failed to set value');
          return ValueStore.getValue(storeName, testKey);
        }).then(value => {
          assert.equal(value, testValue, 'Failed to get value');
        });
  });

  it('can delete a value', () => {
    let testKey = 'gmBar';
    let testValue = 'gmValue';

    return ValueStore.setValue(storeName, testKey, testValue)
        .then(isSet => {
          assert.equal(isSet, true, 'Failed to set value');
          return ValueStore.deleteValue(storeName, testKey);
        }).then(isDeleted => {
          assert.equal(isDeleted, true, 'Failed to delete value');
          return ValueStore.getValue(storeName, testKey);
        }).then(value => {
          assert.isUndefined(value, 'Value has a result, was not deleted');
        });
  }).timeout(5000);

  it('can list all keys', () => {
    let testKeys = ['gmBaz1', 'gmBaz2', 'gmBaz3'];
    let testValue = 'gmValue';
    let setPromises = [
      ValueStore.setValue(storeName, testKeys[0], testValue),
      ValueStore.setValue(storeName, testKeys[1], testValue),
      ValueStore.setValue(storeName, testKeys[2], testValue),
    ];

    return Promise.all(setPromises)
        .then(isSets => {
          expect(isSets, 'Failed to set values')
              .to.have.members([true, true, true]);
          return ValueStore.listValues(storeName);
        }).then(storeKeys => {
          expect(storeKeys, 'Listed keys do not match provided keys')
              .to.have.members(testKeys);
        });
  });
});
