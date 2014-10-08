P = require './base-parser'

class Parser extends P.BaseParser
	constructor: ->
		super()

		@_enterMode 'body'

		@on 'enter:code', (mode, opts, data) ->
			data.code         = ''
			data.bracketStack = []

		@on 'enter:text', (mode, opts, data) ->
			data.content = ''

		@indentLevel = 0

	rule: @O(
		# Body Mode
		@A(@T(-> @mode == 'body'), @O(
			# @R(/^\-/).then(->
			# 	@_enterMode 'code', singleLine: true, buffer: false
			# ),
			@R(/^([\w\-]+)/).then((res) ->
				@_enterMode 'tag', tagName: res[1]
			)
		)),

		# Tag Mode
		@A(@T(-> @mode == 'tag'), @O(
			# @S('(').then(->
			# 	@_enterMode 'args'
			# ),

			# This is args mode
			# @A(@T(-> @parenLevel == 1)), @R(/^\(/)).then(->
			# 	@_leaveMode()
			# ),

			@R(/^=/).then(->
				@_enterMode 'code', singleLine: true, buffer: true, ->
					@indentLevel++
					@_enterMode 'body'
			),

			@R(/^ +/).then(->
				@_enterMode 'text', singleLine: true, ->
					@indentLevel++
					@_enterMode 'body'
			)
		)),

		# Text Mode
		@A(@T(-> @mode == 'text'), @O(
			@R(/^[\w \t]+/).then((res) ->
				@data.content += res[0]
			)
		)),

		# Coding Mode
		@A(@T(-> @mode == 'code'), @O(
			@R(/^[\t ]+/).then((res) ->
				@data.code += res[0]
			),

			@A(@T(-> !@mOpts.str?), @R(/^['"]/)).then((res) ->
				@data.code += res[1][0]
				@data.str  = res[1][0]
			),

			@A(@T(-> @mOpts.str?.length == 1), @S(-> @mOpts.str)).then((res) ->
				@data.code += res[1][0]
				delete @data.str
			),

			@R(/^(?:[\w\d]+|\\(?:[\w'"]|[0-9]+))/).then((res) ->
				@data.code += res[0]
			)
		)),

		# Indentation
		@A(@R(/^[\n\r]+/), @O(
			@A(@T(-> @indentStr?), @S(-> @indentStr)),
			@A(@T(-> !@indentStr?), @R(/^(?:\t| +)/)).then((res) ->
				@indentStr = res[1][0]
			)
		).repeat(0, 1), @R(/^[^\t ]/).peek()).then((res) ->
			@_leaveMode 'tag', false

			console.log 'new line:', res, @indentLevel

			if res[1].length < @indentLevel
				console.log 'deindent'
				@_leaveMode 'tag'
				@_leaveMode 'tag'

			@indentLevel = res[1].length
		)
	)

module.exports = Parser