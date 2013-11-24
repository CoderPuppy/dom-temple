impl = require './client-dom'

exports = module.exports = Object.create impl
exports.text = (text) -> new impl.TextNode text
exports.el   = (tagName) -> new impl.Element tagName