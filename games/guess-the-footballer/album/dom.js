const SVG_NS = 'http://www.w3.org/2000/svg';

function build(node, attributes, children) {
    for (const [name, value] of Object.entries(attributes)) {
        if (value == null || value === false) continue;
        if (name === 'style') {
            for (const [property, v] of Object.entries(value)) node.style.setProperty(property, v);
        } else if (name.startsWith('on')) {
            node.addEventListener(name.slice(2), value);
        } else {
            node.setAttribute(name, value === true ? '' : value);
        }
    }
    node.append(...children.flat(Infinity).filter(child => child != null && child !== false));
    return node;
}

export function el(tag, attributes = {}, ...children) {
    return build(document.createElement(tag), attributes, children);
}

export function svg(tag, attributes = {}, ...children) {
    return build(document.createElementNS(SVG_NS, tag), attributes, children);
}
