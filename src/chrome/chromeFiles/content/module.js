// A simple implementation of nsIModule and nsIFactory for javascript objects.
//
// Right now, these only allow you register JavaScript object *instances*, which
// should be used as XPCOM *services*. There is a TODO below to add support for
// constructors/components, but I don't need this for Greasemonkey yet.

/**
 * Implements nsIModule for multiple javascript instances and constructors
 *
 * @constructor
 */
function GM_Module() {
  this.factoryLookup_ = {};
}

/**
 * Register a javascript object to be an XPCOM component
 *
 * @param   classID   String. A GUID (which could be parsed by Components.ID())
 *                    which uniquely identifies this component.
 *
 * @param   contractID   String. A mozilla-style contractID. For instance:
 *                       @google.com/myproject/mycomponent;1
 *
 * @param   className   String. A class name to identify this object by. This is
 *                      not typically used, but is required by component 
 *                      manager.
 *
 * @param   instance  Object. The JavaScript object to register.
 */
GM_Module.prototype.registerObject = 
function(classID, contractID, className, instance) {
  this.factoryLookup_[classID] = 
    new G_JSFactory(Components.ID(classID), contractID, className, instance);
}

// TODO(aa): Support registerConstructor, but there's some complexity here since
// XPCOM objects do not have constructors.


// nsIModule

/**
 * The component manager calls this method when a new component is installed so
 * that the component may register itself.
 *
 * See nsIModule.registerSelf.
 */
GM_Module.prototype.registerSelf = 
function(compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);

  GM_dump("Registering XPCOM Components...");

  for each (var factory in this.factoryLookup_) {
    GM_dump("  %s".subs(factory.contractID));
    compMgr.registerFactoryLocation(factory.classID, 
                                    factory.className,
                                    factory.contractID,
                                    fileSpec,
                                    location,
                                    type);

    if (factory.instance.onRegister) {
      factory.instance.onRegister(factory.classID, factory.className, 
                                  factory.contractID, fileSpec, location, type);
    }
  }

  GM_dump("Done.\n");
}

/**
 * The component manager calls this methods to respond to 
 * Components.classes[<your contract id>]
 *
 * See nsIModule.getClassObject
 */
GM_Module.prototype.getClassObject = function(compMgr, classID, interfaceID) {
  var factory = this.factoryLookup_[classID.toString()];

  if (!factory) {
    throw new Error("Invalid classID {%s}".subs(classID));
  }

  return factory;
}

/**
 * The component manager calls this method when the application is shutting
 * down.
 *
 * See nsIModule.canUnload
 */
GM_Module.prototype.canUnload = function() {
  return true;
}



/**
 * Internal implementation of nsIFactory for use with GM_Module
 */
function G_JSFactory(classID, contractID, className, instance) {
  this.classID = classID;
  this.contractID = contractID;
  this.className = className;
  this.instance = instance;
}

/**
 * Called by the component manager to respond to getService() and 
 * createInstance() calls.
 *
 * See nsIFactory.createInstance.
 */
G_JSFactory.prototype.createInstance = function(outer, iid) {
  GM_dump("creating instance for interface: {%s}\n".subs(iid));
  return this.instance;
}
