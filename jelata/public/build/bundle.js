
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (58:3) {#each users as user}
    function create_each_block(ctx) {
    	let li;
    	let span0;
    	let t0_value = /*user*/ ctx[13].id + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*user*/ ctx[13].firstname + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*user*/ ctx[13].lastname + "";
    	let t4;
    	let t5;
    	let span3;
    	let t6_value = /*user*/ ctx[13].email + "";
    	let t6;
    	let t7;
    	let span4;
    	let t8_value = /*user*/ ctx[13].pwd + "";
    	let t8;
    	let t9;

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			span3 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			span4 = element("span");
    			t8 = text(t8_value);
    			t9 = space();
    			add_location(span0, file, 59, 4, 1501);
    			add_location(span1, file, 60, 4, 1530);
    			add_location(span2, file, 61, 4, 1566);
    			attr_dev(span3, "id", "em");
    			attr_dev(span3, "class", "svelte-15pggjr");
    			add_location(span3, file, 62, 4, 1601);
    			add_location(span4, file, 63, 4, 1640);
    			attr_dev(li, "class", "svelte-15pggjr");
    			add_location(li, file, 58, 3, 1492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, t0);
    			append_dev(li, t1);
    			append_dev(li, span1);
    			append_dev(span1, t2);
    			append_dev(li, t3);
    			append_dev(li, span2);
    			append_dev(span2, t4);
    			append_dev(li, t5);
    			append_dev(li, span3);
    			append_dev(span3, t6);
    			append_dev(li, t7);
    			append_dev(li, span4);
    			append_dev(span4, t8);
    			append_dev(li, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*users*/ 32 && t0_value !== (t0_value = /*user*/ ctx[13].id + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*users*/ 32 && t2_value !== (t2_value = /*user*/ ctx[13].firstname + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*users*/ 32 && t4_value !== (t4_value = /*user*/ ctx[13].lastname + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*users*/ 32 && t6_value !== (t6_value = /*user*/ ctx[13].email + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*users*/ 32 && t8_value !== (t8_value = /*user*/ ctx[13].pwd + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(58:3) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let form;
    	let input0;
    	let t4;
    	let input1_1;
    	let t5;
    	let input2_1;
    	let t6;
    	let input3_1;
    	let t7;
    	let input4_1;
    	let t8;
    	let br;
    	let button;
    	let t10;
    	let div;
    	let ul;
    	let mounted;
    	let dispose;
    	let each_value = /*users*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Проект 1: запись и выдача списка пользователей!";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Форма создания пользователя";
    			t3 = space();
    			form = element("form");
    			input0 = element("input");
    			t4 = space();
    			input1_1 = element("input");
    			t5 = space();
    			input2_1 = element("input");
    			t6 = space();
    			input3_1 = element("input");
    			t7 = space();
    			input4_1 = element("input");
    			t8 = space();
    			br = element("br");
    			button = element("button");
    			button.textContent = "Подтвердить";
    			t10 = space();
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-15pggjr");
    			add_location(h1, file, 45, 1, 881);
    			add_location(p, file, 46, 1, 939);
    			attr_dev(input0, "type", "id");
    			attr_dev(input0, "placeholder", "Ваш ID");
    			add_location(input0, file, 48, 3, 1035);
    			attr_dev(input1_1, "type", "firstname");
    			attr_dev(input1_1, "placeholder", "Введите имя");
    			add_location(input1_1, file, 49, 3, 1097);
    			attr_dev(input2_1, "type", "lastname");
    			attr_dev(input2_1, "placeholder", "Введите фамилию");
    			add_location(input2_1, file, 50, 3, 1171);
    			attr_dev(input3_1, "type", "email");
    			attr_dev(input3_1, "placeholder", "Введите емейл");
    			add_location(input3_1, file, 51, 3, 1248);
    			attr_dev(input4_1, "type", "pwd");
    			attr_dev(input4_1, "placeholder", "Введите пароль");
    			add_location(input4_1, file, 52, 3, 1320);
    			add_location(br, file, 53, 3, 1391);
    			add_location(button, file, 53, 7, 1395);
    			attr_dev(form, "method", "POST");
    			add_location(form, file, 47, 2, 976);
    			attr_dev(ul, "class", "users");
    			add_location(ul, file, 56, 2, 1445);
    			add_location(div, file, 55, 1, 1437);
    			attr_dev(main, "class", "svelte-15pggjr");
    			add_location(main, file, 44, 0, 873);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, p);
    			append_dev(main, t3);
    			append_dev(main, form);
    			append_dev(form, input0);
    			set_input_value(input0, /*input1*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, input1_1);
    			set_input_value(input1_1, /*input2*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, input2_1);
    			set_input_value(input2_1, /*input3*/ ctx[2]);
    			append_dev(form, t6);
    			append_dev(form, input3_1);
    			set_input_value(input3_1, /*input4*/ ctx[3]);
    			append_dev(form, t7);
    			append_dev(form, input4_1);
    			set_input_value(input4_1, /*input5*/ ctx[4]);
    			append_dev(form, t8);
    			append_dev(form, br);
    			append_dev(form, button);
    			append_dev(main, t10);
    			append_dev(main, div);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen_dev(input1_1, "input", /*input1_1_input_handler*/ ctx[8]),
    					listen_dev(input2_1, "input", /*input2_1_input_handler*/ ctx[9]),
    					listen_dev(input3_1, "input", /*input3_1_input_handler*/ ctx[10]),
    					listen_dev(input4_1, "input", /*input4_1_input_handler*/ ctx[11]),
    					listen_dev(form, "submit", prevent_default(/*adduser*/ ctx[6]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*input1*/ 1) {
    				set_input_value(input0, /*input1*/ ctx[0]);
    			}

    			if (dirty & /*input2*/ 2) {
    				set_input_value(input1_1, /*input2*/ ctx[1]);
    			}

    			if (dirty & /*input3*/ 4) {
    				set_input_value(input2_1, /*input3*/ ctx[2]);
    			}

    			if (dirty & /*input4*/ 8 && input3_1.value !== /*input4*/ ctx[3]) {
    				set_input_value(input3_1, /*input4*/ ctx[3]);
    			}

    			if (dirty & /*input5*/ 16) {
    				set_input_value(input4_1, /*input5*/ ctx[4]);
    			}

    			if (dirty & /*users*/ 32) {
    				each_value = /*users*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let input1 = "";
    	let input2 = "";
    	let input3 = "";
    	let input4 = "";
    	let input5 = "";
    	let users = [];

    	async function adduser() {
    		let user = {
    			id: Number(input1),
    			firstname: input2,
    			lastname: input3,
    			email: input4,
    			pwd: input5
    		};

    		console.log({ user });

    		await fetch("http://localhost:7000/api/users", {
    			method: "POST",
    			cache: "no-cache",
    			credentials: "same-origin",
    			headers: {
    				"Content-Type": "application/x-www-form-urlencoded",
    				"Content-Type": "application/json"
    			},
    			body: JSON.stringify({ user })
    		});
    	}

    	async function getResponse() {
    		let response = await fetch("http://localhost:7000/api/users");
    		let content = await response.json();
    		console.log(content);
    		$$invalidate(5, users = content.data);
    		console.log(users);
    		$$invalidate(5, users = Object.values(users));
    		console.log(users);
    	}

    	getResponse();
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		input1 = this.value;
    		$$invalidate(0, input1);
    	}

    	function input1_1_input_handler() {
    		input2 = this.value;
    		$$invalidate(1, input2);
    	}

    	function input2_1_input_handler() {
    		input3 = this.value;
    		$$invalidate(2, input3);
    	}

    	function input3_1_input_handler() {
    		input4 = this.value;
    		$$invalidate(3, input4);
    	}

    	function input4_1_input_handler() {
    		input5 = this.value;
    		$$invalidate(4, input5);
    	}

    	$$self.$capture_state = () => ({
    		input1,
    		input2,
    		input3,
    		input4,
    		input5,
    		users,
    		adduser,
    		getResponse
    	});

    	$$self.$inject_state = $$props => {
    		if ("input1" in $$props) $$invalidate(0, input1 = $$props.input1);
    		if ("input2" in $$props) $$invalidate(1, input2 = $$props.input2);
    		if ("input3" in $$props) $$invalidate(2, input3 = $$props.input3);
    		if ("input4" in $$props) $$invalidate(3, input4 = $$props.input4);
    		if ("input5" in $$props) $$invalidate(4, input5 = $$props.input5);
    		if ("users" in $$props) $$invalidate(5, users = $$props.users);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		input1,
    		input2,
    		input3,
    		input4,
    		input5,
    		users,
    		adduser,
    		input0_input_handler,
    		input1_1_input_handler,
    		input2_1_input_handler,
    		input3_1_input_handler,
    		input4_1_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	// props: {
    	// 	name: 'world'
    	// }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
