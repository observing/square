## wrap

The wrap plugin is designed to sandbox your application and preventing it from
exposing any unwanted globals in the browser. For most of your application code
you have control over the globals that you want to expose but this is not the
case for third party libraries.

This plugin does add a bit of overhead to your application in terms of file size
but it might be worth it for your application.

### options

- `timeout`, time to wait for the application to be initialized as async
  functions can still introduce globals. Defaults to 1000 ms.
- `header`, function header for the wrapper.
- `body`, initial body of the function, this locks in some variables that might
  be used to leaking code.
- `footer`, closing function for the wrapper.

### commandline usage

```
square --bundle dir --plugin wrap
```
