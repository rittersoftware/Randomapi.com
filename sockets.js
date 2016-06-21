const _          = require('lodash');
const cookie     = require('cookie');
const sessionDB  = require('./utils').redis;
const settings   = require('./settings.json');
const io         = require('socket.io')(settings.general.socket);
const app        = require('./app').app;
const Generators = app.get('Generators');

io.use((socket, next) => {
  let data = socket.handshake || socket.request;
  let sessionID = cookie.parse(data.headers.cookie)[settings.session.key].slice(2, 34);
  sessionDB.get('sess:' + sessionID, (err, session) => {
    socket.session = session;
    next();
  });
});

io.on('connection', socket => {
  socket.on('lintCode', msg => {
    let shortest = Math.floor(Math.random() * Generators.realtime.length);
    for (let i = 0; i < Generators.realtime.length; i++) {
      if (Generators.realtime[i].queueLength() < Generators.realtime[shortest].queueLength()) {
        shortest = i;
      }
    }

    if (!Generators.realtime[shortest].generator.connected) {
      socket.emit('codeLinted', {error: {formatted: "Something bad has happened...please try again later."}, results: [], fmt: null});
    } else {
      Generators.realtime[shortest].queue.push({socket, data: {src: msg.code, ref: msg.ref, owner: JSON.parse(socket.session).user}});
    }
  });
});

module.exports = io;
