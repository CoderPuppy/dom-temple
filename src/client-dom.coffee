class Node
	constructor: (@_impl) ->
	outerHtml: (val) ->
		if val?
			@_impl.outerHtml = val
			@
		else
			@_impl.outerHTML

	text: (text) ->
		if text?
			@_impl.textContent = text
			@
		else
			@_impl.textContent

	parent: ->
		Node.wrap @_impl.parentNode

	@wrap: (node) ->
		switch node.nodeType
			when window.Node.DOCUMENT_NODE then new Document node
			when window.Node.DOCUMENT_FRAGMENT_NODE then new DocumentFragment node
			when window.Node.ELEMENT_NODE then new Element node
			when window.Node.TEXT_NODE then new TextNode node
			else new Node node

class TextNode extends Node
	constructor: (text) ->
		if typeof text == 'string'
			super document.createTextNode text
		else if text? and text.nodeType == window.Node.TEXT_NODE
			super text
		else if text instanceof @constructor
			return text
		else
			console.log text
			throw new Error('Bad text for new TextNode(text): ' + text)

class ParentNode extends Node
	append: (node) ->
		try
			@_impl.appendChild node._impl
		catch e
			console.log e, e.stack, node
		@

	children: -> [].slice.call(@_impl.childNodes).map Node.wrap

class Element extends ParentNode
	constructor: (tag) ->
		if typeof tag == 'string'
			@tagName = tag
			super document.createElement tag
		else
			super tag

class DocumentFragment extends ParentNode
	constructor: (doc = document.createDocumentFragment()) ->
		super doc

class Document extends DocumentFragment
	constructor: (doc = document.implementation.createHTMLDocument()) ->
		super doc
		@body = new Element @_impl.body

main = new Document document

module.exports = {
	main,
	Node,
	TextNode,
	ParentNode,
	Element,
	DocumentFragment,
	Document
}