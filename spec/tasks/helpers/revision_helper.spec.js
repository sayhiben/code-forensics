/*global require_src*/
var stream = require('stream'),
    map    = require("through2-map"),
    moment = require('moment');

var RevisionHelper = require_src('tasks/helpers/revision_helper'),
    vcs            = require_src('vcs');

describe('RevisionHelper', function() {
  var mockVcs, subject, analyser;

  beforeEach(function() {
    mockVcs = jasmine.createSpyObj('vcs_adapter', ['revisions', 'showRevisionStream']);
    spyOn(vcs, 'client').and.returnValue(mockVcs);
    analyser = {
      sourceAnalysisStream: jasmine.createSpy('sourceAnalysisStream')
      .and.callFake(function() {
        return map.obj(function(obj) {
          return { result: obj.analysis + '-result' };
        });
      })
    };

    subject = new RevisionHelper({
      repository: 'test_repository',
      parameters: { targetFile: '/test/file' },
      dateRange: 'date-range'
    });
  });

  describe('.revisionAnalysisStream()', function() {
    it('creates a vcs client object with the context parameters', function() {
      expect(vcs.client).toHaveBeenCalledWith('test_repository');
    });

    describe('when no revisions exist', function() {
      beforeEach(function() {
        mockVcs.revisions.and.returnValue([]);
      });

      it('throws an error', function() {
        expect(function() {
          subject.revisionAnalysisStream(analyser);
        }).toThrowError('No revisions data found');
      });
    });

    describe('when revisions exist', function() {
      beforeEach(function() {
        mockVcs.revisions.and.returnValue([
          { revisionId: '123', date: '2010-01-01T00:00:00.000Z' },
          { revisionId: '456', date: '2010-01-05T00:00:00.000Z' }
        ]);
      });

      it('returns the stream aggregate of all the revisions', function(done) {
        var revisionStream1 = new stream.PassThrough({ objectMode: true });
        var revisionStream2 = new stream.PassThrough({ objectMode: true });
        mockVcs.showRevisionStream.and.returnValues(revisionStream1, revisionStream2);

        var data = [];
        subject.revisionAnalysisStream(analyser)
        .on('data', function(obj) { data.push(obj); })
        .on('end', function() {
          expect(mockVcs.revisions).toHaveBeenCalledWith('/test/file', 'date-range');
          expect(mockVcs.showRevisionStream).toHaveBeenCalledWith('123', '/test/file');
          expect(mockVcs.showRevisionStream).toHaveBeenCalledWith('456', '/test/file');
          expect(data).toEqual([
            { revision: '123', date: moment('2010-01-01T00:00:00.000Z'), result: 'test-analysis1-result' },
            { revision: '456', date: moment('2010-01-05T00:00:00.000Z'), result: 'test-analysis2-result' }
          ]);
          done();
        });

        revisionStream1.write({ analysis: 'test-analysis1' });
        revisionStream1.end();
        revisionStream2.write({ analysis: 'test-analysis2' });
        revisionStream2.end();
      });
    });
  });
});
