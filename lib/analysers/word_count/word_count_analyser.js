var _             = require('lodash'),
    map           = require("through2-map"),
    filter        = require("through2-filter"),
    StringDecoder = require('string_decoder').StringDecoder,
    through2      = require('through2'),
    multipipe     = require('multipipe'),
    LineStream    = require('byline').LineStream;

var textFilters = require('./text_filters'),
    WordsCounter = require('./word_counter');

var decoder = new StringDecoder();

module.exports = function() {
  this.textAnalysisStream = function(filters) {
    var rejectText = textFilters.createRejectFn(filters);
    var counter = new WordsCounter();

    return multipipe(
      new LineStream(),
      filter(function(line) {
        return !rejectText(decoder.write(line).toLowerCase());
      }),
      through2.obj(function(line, enc, callback) {
        var words = decoder.write(line).toLowerCase().split(/\W+/);
        counter.addWords(_.reject(words, rejectText));
        callback();
      }, function(callback) {
        this.push(counter.report());
        callback();
      })
    );
  };
};