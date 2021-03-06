// Generated by CoffeeScript 1.6.3
(function() {
  var BaseParser, M, P, Source, Stream, fillArray, key, matcherGenerator,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Stream = require('stream');

  fillArray = function(filler, length) {
    return Array.apply(null, new Array(length)).map(function() {
      return fillter;
    });
  };

  Source = (function() {
    function Source(str) {
      this.str = str != null ? str : '';
      this.pos = 0;
      this.recalc();
    }

    Source.prototype.append = function(str) {
      this.str += str;
      this.recalc();
      return this;
    };

    Source.prototype.push = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.append.apply(this, args);
    };

    Source.prototype.consume = function(length) {
      var part;
      part = this.str.slice(this.pos, this.pos + length);
      this.pos += length;
      this.recalc();
      return part;
    };

    Source.prototype.peek = function(length) {
      return this.str.slice(this.pos, this.pos + length);
    };

    Source.prototype.current = function() {
      return this.str.slice(this.pos);
    };

    Source.prototype.clone = function() {
      var src;
      src = new Source;
      src.loadFrom(this);
      return src;
    };

    Source.prototype.loadFrom = function(parent) {
      this.str = parent.str;
      return this.pos = parent.pos;
    };

    Source.prototype.child = function() {
      var src;
      src = new Source(this.current());
      src.parent = this;
      return src;
    };

    Source.prototype.recalc = function() {
      this.length = this.str.length;
      this.remaining = this.str.length - this.pos;
      return this;
    };

    return Source;

  })();

  M = function(matcherGenerator) {
    return function() {
      var args, callbacks, matcher, rawMatcher,
        _this = this;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      rawMatcher = matcherGenerator.apply(this, args);
      callbacks = [];
      matcher = function(src) {
        var match, subSrc,
          _this = this;
        subSrc = src.child();
        match = rawMatcher.call(this, subSrc);
        if (match.src == null) {
          match.src = subSrc;
        }
        if (match.matched) {
          callbacks.forEach(function(fn) {
            return fn.call(_this, match.result, match);
          });
        }
        return match;
      };
      matcher.repeat = function() {
        var a, _ref;
        a = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref = P.repeat).call.apply(_ref, [_this, matcher].concat(__slice.call(a)));
      };
      matcher.then = function() {
        var a, _ref;
        a = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref = P.add).call.apply(_ref, [_this, matcher].concat(__slice.call(a)));
      };
      matcher.or = function() {
        var a, _ref;
        a = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref = P.or).call.apply(_ref, [_this, matcher].concat(__slice.call(a)));
      };
      matcher.not = function() {
        var a, _ref;
        a = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref = P.not).call.apply(_ref, [_this, matcher].concat(__slice.call(a)));
      };
      matcher.peek = function() {
        var a, _ref;
        a = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref = P.lookahead).call.apply(_ref, [_this, matcher].concat(__slice.call(a)));
      };
      matcher.map = function(fn) {
        var prevMatcher;
        prevMatcher = rawMatcher;
        rawMatcher = function(src) {
          var match;
          match = prevMatcher.call(this, src);
          if (match.matched) {
            match.result = fn.call.apply(fn, [this].concat(__slice.call(match.result)));
          }
          return match;
        };
        return matcher;
      };
      matcher.then = function(fn) {
        if (typeof fn === 'function') {
          callbacks.push(fn);
        }
        return matcher;
      };
      return matcher;
    };
  };

  P = {
    lookahead: function(matcher) {
      return function(src) {
        var match, subSrc;
        subSrc = src.child();
        match = matcher.call(this, subSrc);
        return {
          matched: match.matched,
          consume: 0,
          result: match.result
        };
      };
    },
    not: function(matcher) {
      return function(src) {
        var match;
        match = matcher(src);
        if (match.matched) {
          return {
            matched: false
          };
        } else {
          return {
            matched: true,
            consumed: 0
          };
        }
      };
    },
    test: function(fn) {
      return function(src) {
        var res;
        res = fn.call(this, src);
        return {
          matched: res,
          consumed: 0,
          result: res
        };
      };
    },
    string: function(str) {
      return function(src) {
        if (typeof str === 'function') {
          str = str.call(this);
        }
        if (src.consume(str.length) === str) {
          return {
            matched: true,
            consumed: str.length,
            result: [str]
          };
        } else {
          return {
            matched: false
          };
        }
      };
    },
    regexp: function(re) {
      return function(src) {
        var match;
        re.lastIndex = 0;
        match = re.exec(src.current());
        if (match) {
          src.consume(match[0].length);
          return {
            matched: true,
            consumed: match[0].length,
            result: match
          };
        } else {
          return {
            matched: false
          };
        }
      };
    },
    add: function() {
      var matchers;
      matchers = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return function(src) {
        var consumed, lastResult, match, matcher, results, _i, _len;
        results = [];
        consumed = 0;
        for (_i = 0, _len = matchers.length; _i < _len; _i++) {
          matcher = matchers[_i];
          match = matcher.call(this, src);
          if (match.matched) {
            src = match.src;
            lastResult = results[results.length - 1];
            if ((lastResult != null) && lastResult.length === 1 && typeof lastResult[0] === 'string' && match.result.length === 1 && typeof match.result[0] === 'string') {
              lastResult[0] += match.result[0];
            } else {
              results.push(match.result);
            }
            consumed += match.consumed;
          } else {
            return {
              matched: false
            };
          }
        }
        return {
          matched: true,
          consumed: consumed,
          src: src,
          result: results
        };
      };
    },
    or: function() {
      var matchers;
      matchers = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return function(src) {
        var match, matcher, _i, _len;
        for (_i = 0, _len = matchers.length; _i < _len; _i++) {
          matcher = matchers[_i];
          match = matcher.call(this, src);
          if (match.matched) {
            return match;
          }
        }
        return {
          matched: false
        };
      };
    },
    repeat: function(matcher, num, expansion) {
      if (num == null) {
        num = 1;
      }
      if (expansion == null) {
        expansion = num === 1 ? 1 : 0;
      }
      return function(src) {
        var consumed, lastResult, match, results, times;
        results = [];
        consumed = 0;
        times = 0;
        while (true) {
          match = matcher.call(this, src);
          if (match.matched) {
            times++;
            src = match.src;
            if (expansion < 0 && results.length >= num) {
              console.log("failing early because too many matches: " + times + ", " + num + ", " + expansion);
              return {
                matched: false
              };
            }
            lastResult = results[results.length - 1];
            if ((lastResult != null) && lastResult.length === 1 && typeof lastResult[0] === 'string' && match.result.length === 1 && typeof match.result[0] === 'string') {
              lastResult[0] += match.result[0];
            } else {
              results.push(match.result);
            }
            consumed += match.consumed;
          } else if (expansion >= 0 && times < num) {
            console.log("failing early because not enough matches: " + times + ", " + num + ", " + expansion);
            return {
              matched: false
            };
          } else {
            break;
          }
        }
        return {
          matched: true,
          consumed: consumed,
          src: src,
          result: (function(res) {
            res.times = times;
            return res;
          })(results)
        };
      };
    }
  };

  for (key in P) {
    matcherGenerator = P[key];
    P[key] = M(matcherGenerator);
  }

  P.O = P.or;

  P.str = P.string;

  P.S = P.string;

  P.re = P.regexp;

  P.R = P.regexp;

  P.A = P.add;

  P.T = P.test;

  P.N = P.not;

  BaseParser = (function(_super) {
    __extends(BaseParser, _super);

    function BaseParser() {
      var _this = this;
      BaseParser.__super__.constructor.call(this);
      this.src = new Source;
      this.stack = [];
      this._enterMode('body');
      this.indent = 0;
      this.on('finish', function() {
        var frame, _i, _len, _ref, _results;
        _ref = _this.stack;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          frame = _ref[_i];
          _results.push(_this._leaveMode());
        }
        return _results;
      });
    }

    BaseParser.prototype.fillArray = fillArray;

    BaseParser.fillArray = fillArray;

    BaseParser.prototype._write = function(chunk, encoding, cb) {
      var m, oldLength;
      this.src.push(chunk.toString('utf-8'));
      oldLength = Infinity;
      while (this.src.remaining < oldLength) {
        oldLength = this.src.remaining;
        m = this.rule(this.src);
        console.log("remaining: '" + (m.src.current()) + "'");
        if (m.matched) {
          this.src = m.src;
        } else {
          break;
        }
      }
      cb();
    };

    BaseParser.prototype._enterMode = function(mode, opts, fn) {
      var data, oldData, oldMode, oldOpts;
      if (opts == null) {
        opts = {};
      }
      oldMode = this.mode;
      oldOpts = this.mOpts;
      oldData = this.data;
      data = {};
      this.currentStack = {
        mode: mode,
        opts: opts,
        data: data
      };
      this.mode = mode;
      this.mOpts = opts;
      this.data = data;
      this.currentStack.callbacks = typeof fn === 'function' ? [fn] : [];
      this.stack.push(this.currentStack);
      this.emit('enter', mode, opts, data, oldMode, oldOpts, oldData);
      this.emit("enter:" + mode, mode, opts, data, oldMode, oldOpts, oldData);
      return this;
    };

    BaseParser.prototype._leaveMode = function(mode, include) {
      var callbacks, oldStack, _ref, _ref1, _ref2,
        _this = this;
      if (include == null) {
        include = true;
      }
      callbacks = [];
      while (this.stack.length > 0 && ((mode == null) || include || this.mode !== mode)) {
        oldStack = this.stack.pop();
        this.currentStack = this.stack[Math.max(this.stack.length - 1, 0)];
        this.mode = (_ref = this.currentStack) != null ? _ref.mode : void 0;
        this.mOpts = (_ref1 = this.currentStack) != null ? _ref1.opts : void 0;
        this.data = (_ref2 = this.currentStack) != null ? _ref2.data : void 0;
        callbacks.push([oldStack, [oldStack.mode, oldStack.opts, oldStack.data, this.mode, this.mOpts, this.data]]);
        if ((mode == null) || oldStack.mode === mode) {
          break;
        }
      }
      callbacks.forEach(function(cb) {
        var args;
        oldStack = cb[0], args = cb[1];
        _this.emit.apply(_this, ['leave'].concat(__slice.call(args)));
        _this.emit.apply(_this, ["leave:" + oldStack.mode].concat(__slice.call(args)));
        return oldStack.callbacks.forEach(function(cb) {
          return cb.apply(_this, args);
        });
      });
      return this;
    };

    return BaseParser;

  })(Stream.Writable);

  for (key in P) {
    matcherGenerator = P[key];
    BaseParser.prototype[key] = matcherGenerator;
    BaseParser[key] = matcherGenerator;
  }

  P.BaseParser = BaseParser;

  P.Source = Source;

  module.exports = P;

}).call(this);
