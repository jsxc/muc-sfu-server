# MUC SFU server
This is an implementation of a WebRTC SFU server for [Kurento]. It can be used
standalone as demo, or in conjunction with the prototype implementation of
[JSXC].

:warning: Prototype implementation. This server is not ready for production.

## Start demo
First we have to start the Kurento server. The easiest way is to use docker.

```
docker run --network host kurento/kurento-media-server:latest
```

Now install all dependencies with `yarn install` and start the server with:

```
yarn start
```

If you open `static/index.html` with multiple browser, you should be able to
have a small video conference. Please beware that this is not ready for
production. Name conflicts and authentication is not implemented yet.

[Kurento]: https://www.kurento.org
[JSXC]: https://www.jsxc.org