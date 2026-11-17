import { Alert } from 'react-native'

/**
 * In a release build an uncaught JavaScript error closes the app without saying why. This handler is installed
 * before anything else loads (index.ts imports it first) and shows the error on screen instead, so a crash on a
 * phone without a debugger can still be diagnosed.
 */
const defaultHandler = ErrorUtils.getGlobalHandler()

ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
  if (!isFatal) {
    defaultHandler(error, isFatal)
    return
  }
  const err = error instanceof Error ? error : new Error(String(error))
  const stack = (err.stack ?? '').split('\n').slice(0, 8).join('\n')
  Alert.alert('RentEquip: error al iniciar', `${err.name}: ${err.message}\n\n${stack}`)
})
