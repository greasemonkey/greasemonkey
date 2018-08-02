'use strict';
describe('bg/updater', () => {
  before(() => sinon.stub(UserScriptRegistry, 'scriptsToRunAt'));
  after(() => UserScriptRegistry.scriptsToRunAt.restore());

  describe('pickNextScriptAutoUpdate', () => {
    it('returns a single script', async () => {
      UserScriptRegistry.scriptsToRunAt.returns([{
        'downloadUrl': 'http://example.com/anything.user.js',
        'uuid': '0b6c8047-8c9b-4bbe-bf82-f4e376e284a0',
      }]);
      chrome.storage.local.get.callsArgWith(1, {});
      let [nextUuid, _] = await _pickNextScriptAutoUpdate();
      assert.equal(nextUuid, '0b6c8047-8c9b-4bbe-bf82-f4e376e284a0');
    });

    it('returns the proper script from among two', async () => {
      UserScriptRegistry.scriptsToRunAt.returns([{
        'downloadUrl': 'http://example.com/anything1.user.js',
        'uuid': '7289270f-c30d-41e5-932c-560d81315565',
      },{
        'downloadUrl': 'http://example.com/anything2.user.js',
        'uuid': '46a3926d-f64e-4800-a915-4afbe44da4fc',
      }]);
      chrome.storage.local.get.callsArgWith(1, {
        'updateNextAt.7289270f-c30d-41e5-932c-560d81315565': 1,
        'updateNextAt.46a3926d-f64e-4800-a915-4afbe44da4fc': 2,
      });
      let [nextUuid, _] = await _pickNextScriptAutoUpdate();
      assert.equal(nextUuid, '7289270f-c30d-41e5-932c-560d81315565');
    });

    it('skips a local script', (done) => {
      UserScriptRegistry.scriptsToRunAt.returns([{
        // no downloadUrl here!
        'uuid': '6e23d732-9a17-4a23-9c3a-5203d76065d7'
      }]);
      _pickNextScriptAutoUpdate()
          .catch(e => {
            assert.equal(e.message, 'no scripts to update');
            done();
          });
    });

    it('skips an edited script', (done) => {
      UserScriptRegistry.scriptsToRunAt.returns([{
        'downloadUrl': 'http://example.com/anything.user.js',
        'hasBeenEdited': true,
        'uuid': '7dfe3d57-a1d3-47f6-b90c-b92534c98d2d'
      }]);
      _pickNextScriptAutoUpdate()
          .catch(e => {
            assert.equal(e.message, 'no scripts to update');
            done();
          });
    });

    it('throws with no scripts', (done) => {
      UserScriptRegistry.scriptsToRunAt.returns([{}]);
      _pickNextScriptAutoUpdate()
          .catch(e => {
            assert.equal(e.message, 'no scripts to update');
            done();
          });
    });
  });
});
