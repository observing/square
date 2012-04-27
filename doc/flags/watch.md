## Watch

The watch flag allows you to watch your bundled files for changes and
continuously rebuild your code. If you have plugin's defined in the command line
flags then these will also be ran every time a file change occurs.

But it's not only able to watch your files for changes it also comes with live
reload functionality. When you supply the `--watch` command with a port number we
start real-time reload service that will refresh your browser every time the files
in your have changed. So no more need to press that pesky `F5` button any more.

When the service is started you will be promoted with a small async JavaScript
snippet that needs to be included above the closing `</body>` tag on your page.

```html
<script>
  !function(d,n,e,s){
    e=d.createElement(n);s=d.getElementsByTagName(n)[0];e.async=true;
    s.parentNode.insertBefore(e,s);
    e.src="http://10.0.1.8:3000/live/reload.js";
  }(document,"script");
</script>
```

Make sure that the `e.src="http://.."` points to the correct location, it should be
the IP of your machine that runs the square command.

### Command line usage

```bash
square --bundle dir --watch
square --bundle dir --plugin crush --watch
square --bundle dir --watch 8080
```
