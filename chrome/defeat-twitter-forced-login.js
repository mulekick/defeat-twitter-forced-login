'use strict';

const
    // declare that stuff
    EXTENSION_NAME = `defeat-twitter-forced-login`,
    ELEMENT_NODE = 1,
    CONTENT_FOCUS_DIV_STYLE = `css-1dbjc4n r-aqfbo4 r-1d2f490 r-12vffkv r-1xcajam r-zchlnj`,
    ANNOYING_DIV_STYLE = `css-1dbjc4n r-aqfbo4 r-1d2f490 r-12vffkv r-1xcajam r-zchlnj r-ipm5af`,

    // some "soft forced login" div has been added to the UI when content focus mode is active
    // since at this stage the html element is monitored for style change to auto reenable scrolling,
    // we have to remove that div as well because it makes the experience inconsistent (login invite
    // in the foreground while the background is still scrollable ...) 
    ANNOYING_FOCUS_DIV_STYLE = `css-1dbjc4n r-aqfbo4 r-1p0dtai r-1d2f490 r-12vffkv r-1xcajam r-zchlnj`,

    ROOT_WINDOW_SCROLLING_ENABLED = `overflow-y: scroll; overscroll-behavior-y: none; font-size: 15px;`,
    ROOT_WINDOW_SCROLLING_DISABLED = `overflow: hidden; overscroll-behavior-y: none; font-size: 15px; margin-right: 17px;`,
    DOM_NODE_HIDDEN = `display: none`,
    // debug flag
    PRINT_DEBUG_MSG = false,
    // create style attribute
    createStyleAttr = value => {
        const
            // create new attribute node
            styleNode = document.createAttribute(`style`);
        // set value
        styleNode.value = value;
        // return
        return styleNode;
    },
    // create node subtree observer
    createNodeSubtreeObserver = (classMatch, idMatch, executeOnAppend, executeOnRemove, disconnect, resolve, reject) => {
        try {
            const
                // setup observer
                observer = new MutationObserver((ml, obs) => {
                    // loop on observed mutations
                    for (let i = 0; i < ml.length; i++)
                        if (ml[i][`type`] === `childList`) {
                            const
                                // extract properties
                                {addedNodes, removedNodes} = ml[i];
                            addedNodes.forEach(addedNode => {
                                // if it is a match
                                if (addedNode.nodeType === ELEMENT_NODE && (addedNode.id === idMatch || String(addedNode.classList) === classMatch)) {
                                    // log
                                    if (PRINT_DEBUG_MSG === true)
                                        console.log(`${ EXTENSION_NAME }: ${ addedNode.nodeName } element with id ${ addedNode.id } and classes ${ addedNode.classList } added to DOM.`);
                                    // execute
                                    if (executeOnAppend && typeof executeOnAppend === `function`)
                                        executeOnAppend(addedNode);
                                    // disconnect observer if needed
                                    if (disconnect === true)
                                        obs.disconnect();
                                    // resolve if needed
                                    if (resolve && typeof resolve === `function`)
                                        return resolve(addedNode);
                                }
                                // eslint compliant
                                return null;
                            });
                            removedNodes.forEach(removedNode => {
                                // if it is a match
                                if (removedNode.nodeType === ELEMENT_NODE && (removedNode.id === idMatch || String(removedNode.classList) === classMatch)) {
                                    // log
                                    if (PRINT_DEBUG_MSG === true)
                                        console.log(`${ EXTENSION_NAME }: ${ removedNode.nodeName } element with id ${ removedNode.id } and classes ${ removedNode.classList } removed from DOM.`);
                                    // execute
                                    if (executeOnRemove && typeof executeOnRemove === `function`)
                                        executeOnRemove(removedNode);
                                    // disconnect observer if needed
                                    if (disconnect === true)
                                        obs.disconnect();
                                    // resolve if needed
                                    if (resolve && typeof resolve === `function`)
                                        return resolve(removedNode);
                                }
                                // eslint compliant
                                return null;
                            });
                        }
                });
            // return
            return observer;
        } catch (err) {
            // reject if needed
            if (reject && typeof reject === `function`)
                return reject(err);
            // else, output message to stderr
            return console.error(err.message);
        }
    },
    // create node attributes observer
    createNodeAttrObserver = (tagMatch, attrMatch, executeOnUpdate, disconnect, resolve, reject) => {
        try {
            const
                // setup observer
                observer = new MutationObserver((ml, obs) => {
                    // loop on observed mutations
                    for (let i = 0; i < ml.length; i++)
                        if (ml[i][`type`] === `attributes`) {
                            const
                                // extract properties
                                {target, attributeName} = ml[i];
                            // if it is a match
                            if (target.tagName === tagMatch && attributeName === attrMatch) {
                                // log
                                if (PRINT_DEBUG_MSG === true)
                                    console.log(`${ EXTENSION_NAME }: ${ attributeName } attribute was modified on ${ target.tagName } element to ${ target.attributes.getNamedItem(attributeName).value }.`);
                                // execute
                                if (executeOnUpdate && typeof executeOnUpdate === `function`)
                                    executeOnUpdate(target);
                                // disconnect observer if needed
                                if (disconnect === true)
                                    obs.disconnect();
                                // resolve if needed
                                if (resolve && typeof resolve === `function`)
                                    return resolve(target);
                            }
                        }
                    // eslint compliant
                    return null;
                });
            // return
            return observer;
        } catch (err) {
            // reject if needed
            if (reject && typeof reject === `function`)
                return reject(err);
            // else, output message to stderr
            return console.error(`${ EXTENSION_NAME }: ${ err.message }`);
        }
    },
    // defeat the login wall
    retrieveChildNode = (selector, classMatch, idMatch) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new Promise((resolve, reject) => {
            try {
                const
                    // isolate node to observe
                    observed = document.querySelector(selector),
                    // setup observer
                    observer = createNodeSubtreeObserver(classMatch, idMatch, null, null, true, resolve, reject);
                // start observing
                observer.observe(observed, {
                    // observe entire node subtree
                    subtree: true,
                    // for addition/removal of child nodes
                    childList: true
                });
            } catch (err) {
                // reject
                reject(err);
            }
        });

// store as global
let CONTENT_FOCUS_DIV_ON = false;

// discard the window.onload event handler and use an IIFE instead to solve the problem
// of the script not loading after right click on username > open in new tab / new window
(async() => {

    try {

        let
            [ observer, observed ] = [ null, null ];

        // let'ssss go ...
        console.log(`${ EXTENSION_NAME }: page is fully loaded, start observing DOM mutations.`);

        if (document.querySelector(`#layers`) === null)
            // wait for the layers div to load
            await retrieveChildNode(`#react-root > div > div`, null, `layers`);

        // remove login and cookie invite immediately - eventually no, so the experience remains 100% consistent with pre-login wall twitter
        // document.querySelector(`#layers > div.css-1dbjc4n.r-aqfbo4.r-1p0dtai.r-1d2f490.r-12vffkv.r-1xcajam.r-zchlnj`).attributes.setNamedItem(createStyleAttr(DOM_NODE_HIDDEN));

        // monitor layer div
        observed = document.querySelector(`#layers`);

        /* ====================================================
         * content focus : when viewing a tweet / video / photo
         * ====================================================
         */

        // setup content focus observer
        observer = createNodeSubtreeObserver(
            CONTENT_FOCUS_DIV_STYLE,
            null,
            // fix html scrolling
            () => {
                CONTENT_FOCUS_DIV_ON = true;
                document.querySelector(`html`).attributes.setNamedItem(createStyleAttr(ROOT_WINDOW_SCROLLING_DISABLED));
                // information
                console.log(`${ EXTENSION_NAME }: entering content focus mode.`);
            },
            () => {
                CONTENT_FOCUS_DIV_ON = false;
                document.querySelector(`html`).attributes.setNamedItem(createStyleAttr(ROOT_WINDOW_SCROLLING_ENABLED));
                // information
                console.log(`${ EXTENSION_NAME }: exiting content focus mode.`);
            },
            false,
            null,
            null);

        // start observing
        observer.observe(observed, {
            // observe entire node subtree
            subtree: true,
            // for addition/removal of child nodes
            childList: true
        });

        // setup annoying focus mode div observer
        observer = createNodeSubtreeObserver(
            ANNOYING_FOCUS_DIV_STYLE,
            null,
            // remove annoyance
            addedNode => {
                addedNode.attributes.setNamedItem(createStyleAttr(DOM_NODE_HIDDEN));
                // goodbye annoyance.
                console.log(`${ EXTENSION_NAME }: focus mode annoyance removed.`);
            },
            null,
            false,
            null,
            null);

        // start observing
        observer.observe(observed, {
            // observe entire node subtree
            subtree: true,
            // for addition/removal of child nodes
            childList: true
        });

        /* ====================================================
         * default mode : when viewing a thread / tl
         * ====================================================
         */

        // setup annoying default mode div observer
        observer = createNodeSubtreeObserver(
            ANNOYING_DIV_STYLE,
            null,
            // remove annoyance
            addedNode => {
                addedNode.attributes.setNamedItem(createStyleAttr(DOM_NODE_HIDDEN));
                // goodbye annoyance.
                console.log(`${ EXTENSION_NAME }: default mode annoyance removed.`);
            },
            null,
            false,
            null,
            null);

        // start observing
        observer.observe(observed, {
            // observe entire node subtree
            subtree: true,
            // for addition/removal of child nodes
            childList: true
        });

        /* ====================================================
         * monitor the html element whatever the mode is
         * ====================================================
         */
        
        // monitor html element
        observed = document.querySelector(`html`);

        // setup html style observer
        observer = createNodeAttrObserver(
            `HTML`,
            `style`,
            // fix html scrolling
            target => {
                if (CONTENT_FOCUS_DIV_ON === false && target.attributes.getNamedItem(`style`).value === ROOT_WINDOW_SCROLLING_DISABLED)
                // reset
                    document.querySelector(`html`).attributes.setNamedItem(createStyleAttr(ROOT_WINDOW_SCROLLING_ENABLED));
            },
            false,
            null,
            null);

        // start observing
        observer.observe(observed, {
            // observe only root node
            subtree: false,
            // modifications of attributes
            attributes: true,
            // filter
            attributeFilter: [ `style` ],
            // memorize
            attributeOldValue: true
        });


    } catch (err) {
        // output message to stderr
        console.error(`${ EXTENSION_NAME }: ${ err.message }`);
    }

})();