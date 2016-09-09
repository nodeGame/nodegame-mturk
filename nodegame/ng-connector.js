var conf;

conf = {
    nodename: "AMT_Logic",
    verbosity: 0,
    env: {
        review_select: true,
        com: true,
    },
    socket: {
        type: 'SocketIo', // for remote connections
        reconnection: false
    },
    events: {
        dumpEvents: true
    }
};


var ngc = require('nodegame-client');
var J = require('JSUS').JSUS;

var node = ngc.getClient()

node.events.ng.off('get.PING');
node.setup('nodegame', conf);
node.connect('http://localhost:8080/artex', {
    query: {
        startingRoom: 'waiting',
        clientType: 'autoplay'
    }
});

node.on('NODEGAME_READY', function() {
    // node.remoteAlert('aa', '204830624163150');
});

node.on.pconnect(function(p) {
    console.log('P connected ', p);
});
