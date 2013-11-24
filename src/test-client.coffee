domready = require 'domready'
Parser   = require './parser'

domready ->
	dom = require './dom'

	interpolate = (val) ->
		node = dom.text(val)

		# setTimeout ->
		# 	node.text('hehe')
		# , 2000

		node

	###
	`div= 'hmm'`
	should compile to
	###
	template = (__templ_impl) ->
		dom.el('div').append(__templ_impl.interpolate('hmm'))

	p = new Parser

	root = new dom.DocumentFragment
	cur  = root

	# I can use these to add dom elements
	p.on 'enter', (mode, opts) ->
		console.log "entering mode: #{mode}, opts:", opts
	p.on 'leave', (mode, opts, data) ->
		console.log "leaving mode: #{mode}, opts:", opts, 'data:', data

	p.on 'enter:tag', (mode, opts) ->
		console.log "entering tag: #{opts.tagName}"
		el = dom.el opts.tagName
		cur.append el
		cur = el

	p.on 'leave:tag', (mode, opts) ->
		console.log "leaving tag: #{opts.tagName}"
		cur = cur.parent()

	p.on 'leave:code', (mode, opts, data, oldMode, oldOpts) ->
		console.log mode, opts, oldMode, oldOpts
		if oldMode == 'tag' && opts.buffer == true
			cur.append(interpolate(eval(data.code)))

	p.on 'leave:text', (mode, opts, data, oldMode, oldOpts) ->
		if oldMode == 'tag'
			cur.append(interpolate(data.content))

	p.write """
	div= 'hmm '
		span test
	div testing
	"""
	p.end ->
		console.log cur._impl

		root.children().forEach (el) ->
			dom.main.body.append el

	# dom.main.body.append template
	# 	interpolate: interpolate