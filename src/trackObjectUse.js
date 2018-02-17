import { isObjectOrArray, isUndefined } from "./utility"

export const createMakeProxyFunction = ({
  keepOriginalValues = false,
  shouldSkipProxy,
  accessedProperties,
  getBreakpoint = () => {},
  onChange = () => {}
}) => {
  return function makeProxy(obj, stateLocation = "") {
    const handler = {
      get(target, propKey) {
        const value = target[propKey]
        if (!isUndefined(shouldSkipProxy) && shouldSkipProxy(target, propKey)) return value

        const accessedPropertiesPointer = !stateLocation
          ? accessedProperties
          : stateLocation.split(".").reduce((acc, key) => {
              return acc[key]
            }, accessedProperties)

        const newStateLocation = stateLocation ? stateLocation + "." + propKey : propKey
        onChange(newStateLocation)

        // allow people to examine the stack at certain access points
        if (getBreakpoint() === newStateLocation) {
          // explore the callstack to see when your app accesses a value
          debugger
        }
        if (isObjectOrArray(value)) {
          if (!accessedPropertiesPointer[propKey]) {
            accessedPropertiesPointer[propKey] = Array.isArray(value) ? [] : {}
          }
          return makeProxy(value, newStateLocation)
        } else {
          if (isUndefined(accessedPropertiesPointer[propKey]) || !keepOriginalValues) {
            accessedPropertiesPointer[propKey] = value
          }
          return value
        }
      }
    }
    return new Proxy(obj, handler)
  }
}

export default function trackObjectUse(obj, { keepOriginalValues = true } = {}) {
  const accessedProperties = {}
  const makeProxy = createMakeProxyFunction({ accessedProperties, keepOriginalValues })
  const trackedObject = makeProxy(obj)
  return { trackedObject, accessedProperties }
}
