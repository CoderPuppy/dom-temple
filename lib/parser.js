// Generated by CoffeeScript 1.6.3
(function() {
  var P, Parser,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  P = require('./base-parser');

  Parser = (function(_super) {
    __extends(Parser, _super);

    function Parser() {
      Parser.__super__.constructor.call(this);
      this._enterMode('body');
      this.on('enter:code', function(mode, opts, data) {
        data.code = '';
        return data.bracketStack = [];
      });
      this.on('enter:text', function(mode, opts, data) {
        return data.content = '';
      });
      this.indentLevel = 0;
    }

    Parser.prototype.rule = Parser.O(Parser.A(Parser.T(function() {
      return this.mode === 'body';
    }), Parser.O(Parser.R(/^([\w\-]+)/).then(function(res) {
      return this._enterMode('tag', {
        tagName: res[1]
      });
    }))), Parser.A(Parser.T(function() {
      return this.mode === 'tag';
    }), Parser.O(Parser.R(/^=/).then(function() {
      return this._enterMode('code', {
        singleLine: true,
        buffer: true
      }, function() {
        this.indentLevel++;
        return this._enterMode('body');
      });
    }), Parser.R(/^ +/).then(function() {
      return this._enterMode('text', {
        singleLine: true
      }, function() {
        this.indentLevel++;
        return this._enterMode('body');
      });
    }))), Parser.A(Parser.T(function() {
      return this.mode === 'text';
    }), Parser.O(Parser.R(/^[\w \t]+/).then(function(res) {
      return this.data.content += res[0];
    }))), Parser.A(Parser.T(function() {
      return this.mode === 'code';
    }), Parser.O(Parser.R(/^[\t ]+/).then(function(res) {
      return this.data.code += res[0];
    }), Parser.A(Parser.T(function() {
      return this.mOpts.str == null;
    }), Parser.R(/^['"]/)).then(function(res) {
      this.data.code += res[1][0];
      return this.data.str = res[1][0];
    }), Parser.A(Parser.T(function() {
      var _ref;
      return ((_ref = this.mOpts.str) != null ? _ref.length : void 0) === 1;
    }), Parser.S(function() {
      return this.mOpts.str;
    })).then(function(res) {
      this.data.code += res[1][0];
      return delete this.data.str;
    }), Parser.R(/^(?:[\w\d]+|\\(?:[\w'"]|[0-9]+))/).then(function(res) {
      return this.data.code += res[0];
    }))), Parser.A(Parser.R(/^[\n\r]+/), Parser.O(Parser.A(Parser.T(function() {
      return this.indentStr != null;
    }), Parser.S(function() {
      return this.indentStr;
    })), Parser.A(Parser.T(function() {
      return this.indentStr == null;
    }), Parser.R(/^(?:\t| +)/)).then(function(res) {
      return this.indentStr = res[1][0];
    })).repeat(0, 1), Parser.R(/^[^\t ]/).peek()).then(function(res) {
      this._leaveMode('tag', false);
      console.log('new line:', res, this.indentLevel);
      if (res[1].length < this.indentLevel) {
        console.log('deindent');
        this._leaveMode('tag');
        this._leaveMode('tag');
      }
      return this.indentLevel = res[1].length;
    }));

    return Parser;

  })(P.BaseParser);

  module.exports = Parser;

}).call(this);
