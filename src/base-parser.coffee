Stream = require 'stream'

fillArray = (filler, length) -> Array.apply(null, new Array(length)).map(-> fillter)

class Source
	constructor: (@str = '') ->
		@pos = 0
		@recalc()

	append: (str) ->
		@str += str
		@recalc()
		@
	push: (args...) -> @append(args...)

	consume: (length) ->
		part = @str.slice(@pos, @pos + length)
		@pos += length
		@recalc()
		part
	peek: (length) -> @str.slice(@pos, @pos + length)
	current: -> @str.slice(@pos)

	clone: ->
		src = new Source
		src.loadFrom(@)
		src

	loadFrom: (parent) ->
		@str = parent.str
		@pos = parent.pos

	child: ->
		src = new Source @current()
		src.parent = @
		src

	recalc: ->
		@length    = @str.length
		@remaining = @str.length - @pos
		@

M = (matcherGenerator) -> (args...) ->
	rawMatcher = matcherGenerator.apply(@, args)
	callbacks  = []

	matcher = (src) ->
		subSrc = src.child()
		match = rawMatcher.call(@, subSrc)
		match.src ?= subSrc

		if match.matched
			callbacks.forEach (fn) =>
				fn.call(@, match.result, match)

		match
	
	matcher.repeat = (a...) => P.repeat.call(@, matcher, a...)
	matcher.then   = (a...) => P.add.call(@, matcher, a...)
	matcher.or     = (a...) => P.or.call(@, matcher, a...)
	matcher.not    = (a...) => P.not.call(@, matcher, a...)
	matcher.peek   = (a...) => P.lookahead.call(@, matcher, a...)
	matcher.map    = (fn) =>
		prevMatcher = rawMatcher
		rawMatcher = (src) ->
			match = prevMatcher.call(@, src)

			if match.matched
				match.result = fn.call(@, match.result...)

			match

		matcher
	matcher.then = (fn) =>
		callbacks.push fn if typeof fn == 'function'
		matcher

	matcher

P =
	#=P.lookahead=#
	# Consumes nothing
	lookahead: (matcher) -> (src) ->
		subSrc = src.child()
		match = matcher.call(@, subSrc)
		{
			matched: match.matched
			consume: 0
			result: match.result
		}

	#=P.not=#
	# Aliases: N
	# Matches if the specified matcher doesn't match
	not: (matcher) -> (src) ->
		match = matcher(src)

		if match.matched
			{ matched: false }
		else
			{
				matched: true
				consumed: 0
			}

	#=P.test=#
	# Aliases: T
	# Tests if a function returns true
	# The function MUST NOT consume data from the source
	test: (fn) -> (src) ->
		res = fn.call(@, src)
		{
			matched: res,
			consumed: 0,
			result: res
		}

	#=P.string=#
	# Aliases: str, S
	# Matches a string
	string: (str) -> (src) ->
		if typeof str == 'function'
			str = str.call(@)
		
		if src.consume(str.length) == str
			{
				matched: true
				consumed: str.length
				result: [str]
			}
		else
			matched: false

	#=P.regexp=#
	# Aliases: re, R
	# Matches a regular expression
	regexp: (re) -> (src) ->
		re.lastIndex = 0
		match = re.exec(src.current())

		if match
			src.consume(match[0].length)
			{
				matched: true
				consumed: match[0].length
				result: match
			}
		else
			matched: false

	#=P.add=#
	# Aliases: A
	# Combines a bunch of matchers into one
	# For it to match all the matchers need to match one after another
	add: (matchers...) -> (src) ->
		results  = []
		consumed = 0

		for matcher in matchers
			match = matcher.call(@, src)
			if match.matched
				src = match.src
				# Ability to join results that contain a single string
				lastResult = results[results.length - 1]
				if lastResult? and lastResult.length == 1 and typeof(lastResult[0]) == 'string' and
				   match.result.length == 1 and typeof(match.result[0]) == 'string'
					lastResult[0] += match.result[0]
				else
					results.push(match.result)

				consumed += match.consumed
			else
				return { matched: false }

		{
			matched: true
			consumed: consumed
			src: src
			result: results
			# .map (input) ->
			# 	if input? and input.length == 1 and !input.index?
			# 		input[0]
			# 	else
			# 		input
		}

	#=P.or=#
	# Aliases: O
	# Ordered choice of the matchers
	# TODO: Better description
	or: (matchers...) -> (src) ->
		for matcher in matchers
			match = matcher.call(@, src)

			if match.matched
				return match

		{ matched: false }

	#=P.repeat=#
	# Match a matcher at most, exactly or at least num times
	repeat: (matcher, num = 1, expansion = if num == 1 then 1 else 0) -> (src) ->
		results  = []
		consumed = 0
		times    = 0

		while true
			match = matcher.call(@, src)
			if match.matched
				times++
				src = match.src
				if expansion < 0 and results.length >= num # Fail early if it gets too many matches
					console.log "failing early because too many matches: #{times}, #{num}, #{expansion}"
					return { matched: false }

				# Ability to join results that contain a single string
				lastResult = results[results.length - 1]
				if lastResult? and lastResult.length == 1 and typeof(lastResult[0]) == 'string' and
				   match.result.length == 1 and typeof(match.result[0]) == 'string'
					lastResult[0] += match.result[0]
				else
					results.push(match.result)

				consumed += match.consumed
			else if expansion >= 0 and times < num # Fail early if it doesn't get enough matches
				console.log "failing early because not enough matches: #{times}, #{num}, #{expansion}"
				return { matched: false }
			else
				break

		{
			matched: true
			consumed: consumed
			src: src
			result: ((res) ->
				res.times = times
				res
			)(results)
			# (results.map (input) ->
			# 	if input? and input.length == 1 and !input.index?
			# 		input[0]
			# 	else
			# 		input)
		}

# Make the matcherGenerators generate proper matchers
# Adds the repeat, then, or and map functions
for key, matcherGenerator of P
	P[key] = M matcherGenerator

# Aliases
P.O   = P.or
P.str = P.string
P.S   = P.string
P.re  = P.regexp
P.R   = P.regexp
P.A   = P.add
P.T   = P.test
P.N   = P.not

class BaseParser extends Stream.Writable
	constructor: ->
		super()
		@src = new Source

		@stack = []
		@_enterMode 'body'

		@indent = 0

		@on 'finish', =>
			for frame in @stack
				@_leaveMode()

	fillArray: fillArray
	@fillArray: fillArray

	_write: (chunk, encoding, cb) ->
		@src.push chunk.toString 'utf-8'

		oldLength = Infinity
		while @src.remaining < oldLength
			oldLength = @src.remaining

			m = @rule(@src)

			console.log "remaining: '#{m.src.current()}'"

			if m.matched
				@src = m.src
			else
				break


		cb()

		return

	_enterMode: (mode, opts = {}, fn) ->
		oldMode = @mode
		oldOpts = @mOpts
		oldData = @data

		data = {}

		@currentStack = { mode, opts, data }
		@mode         = mode
		@mOpts        = opts
		@data         = data

		@currentStack.callbacks = if typeof fn == 'function' then [ fn ] else []

		@stack.push @currentStack

		@emit 'enter', mode, opts, data, oldMode, oldOpts, oldData
		@emit "enter:#{mode}", mode, opts, data, oldMode, oldOpts, oldData

		@

	_leaveMode: (mode, include = true) ->
		callbacks = []

		while @stack.length > 0 and (!mode? or include or @mode != mode)
			oldStack = @stack.pop()

			@currentStack = @stack[Math.max(@stack.length - 1, 0)]
			@mode         = @currentStack?.mode
			@mOpts        = @currentStack?.opts
			@data         = @currentStack?.data

			callbacks.push([ oldStack, [oldStack.mode, oldStack.opts, oldStack.data, @mode, @mOpts, @data] ])

			break if !mode? or oldStack.mode == mode

		callbacks.forEach (cb) =>
			[ oldStack, args ] = cb

			@emit 'leave', args...
			@emit "leave:#{oldStack.mode}", args...

			oldStack.callbacks.forEach (cb) =>
				cb.apply(@, args)

		@

for key, matcherGenerator of P
	BaseParser::[key] = matcherGenerator
	BaseParser[key]   = matcherGenerator

P.BaseParser = BaseParser
P.Source     = Source

module.exports = P