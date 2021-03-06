import { createSelector } from 'reselect';
import { prefixEnum } from '../Enum';

/**
 * @function
 * @param {Object} state
 * @return {Object}
 * @description Default reducer if module does not has its own reducer.
 */
function defaultReducer() {
  return null;
}

/**
 * @function
 * @return any
 * @description Default getState function
 */
function defaultGetState() {
  return this.store.getState();
}

/**
 * @class
 * @default
 * @description Base module class.
 */
export default class RcModule {
  /**
   * @constructor
   * @param {Function} options.getState
   * @param {String} options.prefix
   * @param {Enum} options.actionTypes,
   */
  constructor({
    getState = defaultGetState,
    prefix,
    actionTypes,
  } = {}) {
    if (typeof getState !== 'function') {
      throw new Error(
        'The `getState` options property must be of type function'
      );
    }
    this._getState = getState;
    if (prefix && typeof prefix !== 'string') {
      throw new Error('The `prefix` options property must be null, undefined, or a string');
    }
    this._prefix = prefix;
    this._actionTypes = actionTypes && prefixEnum({ enumMap: actionTypes, prefix });
    this._reducer = defaultReducer;
    this._modulePath = 'root';
    this._selectors = {};
    // add state selector

    this.addSelector('state', () => this::this._getState());
  }

  /**
   * @property
   * @type any
   * @description The state of the module
   */
  get state() {
    return this.getSelector('state')();
  }

  /**
   * @property
   * @type Function
   * @description The reducer function of the module
   */
  get reducer() {
    return this._reducer;
  }

  /**
   * @property
   * @type Object
   * @description The store object of the module
   */
  get store() {
    if (!this._store) {
      throw new Error('module has not been initialized...');
    }
    return this._store;
  }
  /**
   * @property
   * @type String
   * @description The prefix string of this module
   */
  get prefix() {
    return this._prefix;
  }
  /**
   * @property
   * @type Enum
   * @description The actionTypes used by the module
   */
  get actionTypes() {
    return this._actionTypes;
  }
  /**
   * @property
   * @type String
   * @description The canonical path of the module from the root module
   */
  get modulePath() {
    return this._modulePath;
  }

  /**
   * @function addModule
   * @param {String} name - Name of the module. Also used for the property name.
   * @param {any} module - The module to be attached, can be any type.
   * @description Add the desired module to the
   */
  addModule(name, module) {
    if (this::Object.prototype.hasOwnProperty(name)) {
      throw new Error(`Property '${name}' already exists...`);
    }
    Object.defineProperty(this, name, {
      get() {
        return module;
      },
      enumerable: true,
    });
    // tag submodule with a modulePath for proxying function calls
    // do nothing if module is already tagged
    if (this[name]._modulePath === 'root') {
      this[name]._modulePath = `${this.modulePath}.${name}`;
    }
  }

  /**
   * @function
   * @param {String} name
   * @description Add the selector to the internal selector object.
   *  This is intended to be called with this.addSelector(name, selectorFn) or
   *  this.addSelector(name, [...dependenciesFns], selectorFn);
   */
  addSelector(name, ...args) {
    if (this._selectors::Object.prototype.hasOwnProperty(name)) {
      throw new Error(`Selector '${name}' already exists...`);
    }
    const selector = args.pop();
    if (args.length > 0) {
      this._selectors[name] = createSelector(...args, selector);
    } else {
      this._selectors[name] = selector;
    }
  }

  /**
   * @function
   * @param {String} name
   * @return {Function}
   * @description Returns the named selector function
   */
  getSelector(name) {
    return this._selectors[name];
  }

  /**
   * @function
   * @param {Object} store
   * @description Set the store to the modules and initialize the modules.
   *   This should only be called once.
   */
  setStore(store) {
    if (this._modulePath !== 'root') {
      throw new Error('setStore should only be called on root module');
    }
    if (!store) {
      throw new Error('setStore must accept a store object');
    }
    if (this._store) {
      throw new Error('setStore should only be called once');
    }
    this._setStore(store);
    this._initModule();
  }
  _setStore(store) {
    this._store = store;
    for (const subModule in this) {
      if (
        this::Object.prototype.hasOwnProperty(subModule) &&
        this[subModule] instanceof RcModule
      ) {
        this[subModule]._setStore(store);
      }
    }
  }
  _initModule() {
    if (
      !this._suppressInit &&
      !this._initialized &&
      typeof this.initialize === 'function'
    ) {
      this._initialized = true;
      this.initialize();
    }
    for (const subModule in this) {
      if (
        this::Object.prototype.hasOwnProperty(subModule) &&
        this[subModule] instanceof RcModule
      ) {
        this[subModule]._initModule();
      }
    }
  }
}
